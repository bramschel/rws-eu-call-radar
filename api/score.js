// api/score.js — Vercel serverless function
// Gebruikt Mistral AI via VIBE_CLI_KEY_BCG environment variable.
// Ontvangt: POST { projectIdea, keywords, selectedTheme, calls: [...] }
// Geeft terug: { reviews: [...] }

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ALLOWED_ORIGINS = [
  'https://bramschel.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

// Model selection with fallback support
const MISTRAL_MODEL = process.env.AI_MODEL || process.env.MISTRAL_MODEL || 'mistral-small-latest';
const AI_FALLBACK_MODEL = process.env.AI_FALLBACK_MODEL || '';

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Helper: Safe input length limits
function limitText(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

const __dirname = dirname(fileURLToPath(import.meta.url));

// RAG-context: laad eenmalig bij cold start
let RAG_CONTEXT = [];
try {
  const raw = readFileSync(join(__dirname, '../data/rws_rag_context.json'), 'utf8');
  RAG_CONTEXT = JSON.parse(raw);
} catch (err) {
  console.warn('rws_rag_context.json niet gevonden, RAG uitgeschakeld:', err.message);
}

// Relevance examples: laad eenmalig bij cold start
let RELEVANCE_EXAMPLES = [];
try {
  const raw = readFileSync(join(__dirname, '../data/relevance_examples.json'), 'utf8');
  RELEVANCE_EXAMPLES = JSON.parse(raw);
} catch (err) {
  console.warn('relevance_examples.json niet gevonden:', err.message);
}

const RWS_CONTEXT_FALLBACK = `
Rijkswaterstaat is de Nederlandse uitvoeringsorganisatie voor rijkswegen, vaarwegen, waterbeheer, verkeersmanagement en infrastructuur. Beoordeel EU-calls niet op algemene EU-relevantie, maar op concrete relevantie voor RWS als uitvoeringsorganisatie. Een call scoort alleen hoog als er een duidelijke uitvoerings-, beheer-, innovatie-, pilot-, implementatie- of demonstratierol voor RWS mogelijk is.
`.trim();

// Stopwords voor filtering van generieke termen
const STOPWORDS = new Set([
  // Engels
  'the', 'and', 'or', 'for', 'with', 'from', 'into', 'onto', 'of', 'in', 'on', 'at', 'by', 'as', 'to',
  'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'it', 'its', 'if', 'then', 'else', 'but',
  // Nederlands
  'de', 'het', 'een', 'en', 'of', 'van', 'voor', 'met', 'in', 'op', 'aan', 'door', 'om', 'te',
  'is', 'zijn', 'wordt', 'worden', 'heeft', 'hebben', 'had', 'hadden', 'kan', 'kunnen',
  'moet', 'moeten', 'zou', 'zouden', 'als', 'dan', 'maar', 'dat', 'wat', 'welke',
  // Generieke project/ call termen
  'relevant', 'relevance', 'project', 'projects', 'call', 'calls', 'european', 'europe',
  'support', 'programme', 'program', 'topic', 'objective', 'expected', 'outcome',
  'outcomes', 'scope', 'aim', 'goal', 'purpose', 'activity', 'activities', 'action',
  'actions', 'measure', 'measures', 'solution', 'solutions', 'approach', 'result',
  'results', 'target', 'targets', 'focus', 'area', 'areas', 'field', 'fields',
  'sector', 'sectors', 'context', 'framework', 'objectives', 'goals',
  // Voeg betekenisvolle acroniemen toe die WEL moeten worden meegenomen
]);

// Betekenisvolle acroniemen die niet gefilterd mogen worden
const MEANINGFUL_ACRONYMS = new Set([
  'its', 'cis', 'ris', 'cef', 'ten', 'tent', 'nwe', 'nsr', 'eu', 'rws', 'brussel',
  'interreg', 'horizon', 'digitas', 'beproact', 'comex', 'epics', 'intercor',
  'twentekanalen', 'zuidasdok', 'krammersluizen', 'maasroute', 'venr',
  'stars4water', 'water4all', 'manabas', 'resiriver', 'immerse', 'bonsai',
  'flashfloodbreaker', 'collibri', 'r4im', 'remac', 'merlin', 'napsea',
  'citytex', 'circular', 'digitrans', 'sustainability', 'climate'
]);

function selectRagEntries(selectedTheme) {
  const theme = selectedTheme || 'all';
  const entries = RAG_CONTEXT.filter((entry) => {
    const themes = entry.themes || [];
    if (themes.includes('all')) return true;
    if (theme !== 'all' && themes.includes(theme)) return true;
    if (theme === 'all' && String(entry.id || '').startsWith('rws-')) return true;
    return false;
  });
  return entries.slice(0, 8);
}

function buildRwsContext(selectedTheme) {
  const entries = selectRagEntries(selectedTheme);
  return entries
    .map((entry) => `## ${entry.title}\nBron: ${entry.source}\n${entry.text}`)
    .join('\n\n');
}

function getRagContextMetadata(selectedTheme) {
  return selectRagEntries(selectedTheme).map((entry) => ({
    id: entry.id,
    title: entry.title,
    source: entry.source,
    themes: entry.themes || []
  }));
}

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function isMeaningfulTerm(term) {
  // Acroniemen van 3-4 letters die in MEANINGFUL_ACRONYMS zitten mogen door
  if (MEANINGFUL_ACRONYMS.has(term)) {
    return true;
  }
  // Alfanumerieke termen van 4+ karakters mogen door
  if (term.length >= 4) {
    return true;
  }
  // Acroniemen van 3 letters die beginnend met hoofdletter (bv. ITS, CEF) mogen door
  if (term.length === 3 && /^[A-Z]{3}$/.test(term)) {
    return true;
  }
  return false;
}

function splitTerms(value) {
  return normalizeText(value)
    .split(/[\s,;]+/)
    .map((term) => term.trim())
    .filter((term) => {
      if (!term) return false;
      // Betekenisvolle acroniemen, zoals ITS, mogen niet als stopword verdwijnen.
      if (MEANINGFUL_ACRONYMS.has(term)) return true;
      // Filter stopwords
      if (STOPWORDS.has(term)) return false;
      // Filter op betekenisvolle lengte/acroniemen
      return isMeaningfulTerm(term);
    });
}

function scoreRelevanceExample(example, projectIdea, keywords, selectedTheme, calls) {
  let score = 0;
  const matchedKeywords = [];

  // Bonus voor hetzelfde themeId als selectedTheme
  if (example.themeId === selectedTheme) {
    score += 30;
  }

  // Keyword overlap met example.keywords (hoogste gewicht: 15 per match)
  const userKeywords = new Set([...splitTerms(keywords), ...splitTerms(projectIdea)]);
  const exampleKeywords = new Set(example.keywords?.map(normalizeText) || []);
  
  let keywordMatches = 0;
  for (const kw of userKeywords) {
    if (exampleKeywords.has(kw)) {
      score += 15;
      keywordMatches++;
      if (!matchedKeywords.includes(kw)) {
        matchedKeywords.push(kw);
      }
    }
  }

  // Overlap met projectName en call (middelgewicht: 10 per match)
  const exampleNameAndCall = normalizeText([example.projectName, example.call].join(' '));
  for (const term of userKeywords) {
    if (exampleNameAndCall.includes(` ${term} `) || exampleNameAndCall.startsWith(`${term} `) || exampleNameAndCall.endsWith(` ${term}`)) {
      score += 10;
      if (!matchedKeywords.includes(term)) {
        matchedKeywords.push(term);
      }
    }
  }

  // Overlap met pattern en lesson (laag gewicht: 5 per match)
  const examplePatternAndLesson = normalizeText([example.pattern, example.lesson].join(' '));
  for (const term of userKeywords) {
    if (examplePatternAndLesson.includes(` ${term} `) || examplePatternAndLesson.startsWith(`${term} `) || examplePatternAndLesson.endsWith(` ${term}`)) {
      score += 5;
      if (!matchedKeywords.includes(term)) {
        matchedKeywords.push(term);
      }
    }
  }

  // Overlap met call titels/summaries/abstracts (bonus: 8 per match)
  for (const call of calls) {
    const callText = normalizeText([call.title, call.summary, call.destination, call.abstract].join(' '));
    const exampleText = normalizeText([example.projectName, example.call, example.pattern].join(' '));
    
    const callTerms = splitTerms(callText);
    const exampleTerms = splitTerms(exampleText);
    
    for (const ct of callTerms) {
      for (const et of exampleTerms) {
        if (ct === et) {
          score += 8;
          if (!matchedKeywords.includes(ct)) {
            matchedKeywords.push(ct);
          }
        }
      }
    }
  }

  // Bonus als useAs is positive_example
  if (example.useAs === 'positive_example') {
    score += 10;
  }

  return { score, matchedKeywords, keywordMatches };
}

function selectRelevanceExamples(projectIdea, keywords, selectedTheme, calls) {
  if (RELEVANCE_EXAMPLES.length === 0) {
    return { examples: [], metadata: [] };
  }

  const scoredExamples = RELEVANCE_EXAMPLES.map((example) => {
    return {
      ...example,
      ...scoreRelevanceExample(example, projectIdea, keywords, selectedTheme, calls)
    };
  });

  // Sorteer op score (hoog naar laag)
  scoredExamples.sort((a, b) => b.score - a.score);

  // Selecteer examples: prioriteer hetzelfde thema, cross-theme alleen bij sterke match
  const sameThemeExamples = scoredExamples.filter((ex) => ex.themeId === selectedTheme);
  const otherThemeExamples = scoredExamples.filter((ex) => ex.themeId !== selectedTheme);

  const selected = [];
  const seenIds = new Set();

  // Eerst: selecteer uit hetzelfde thema (max 5)
  for (const ex of sameThemeExamples) {
    if (seenIds.size >= 5) break;
    if (!seenIds.has(ex.id)) {
      seenIds.add(ex.id);
      selected.push(ex);
    }
  }

  // Als we nog ruimte hebben: vul aan met cross-theme examples die minimaal 2 keyword matches hebben
  if (seenIds.size < 5) {
    const strongCrossTheme = otherThemeExamples.filter((ex) => ex.keywordMatches >= 2);
    // Sorteer op score
    strongCrossTheme.sort((a, b) => b.score - a.score);
    
    for (const ex of strongCrossTheme) {
      if (seenIds.size >= 5) break;
      if (!seenIds.has(ex.id)) {
        seenIds.add(ex.id);
        selected.push(ex);
      }
    }
  }

  return {
    examples: selected,
    metadata: selected.map((ex) => ({
      id: ex.id,
      projectName: ex.projectName,
      call: ex.call,
      theme: ex.theme,
      themeId: ex.themeId,
      outcome: ex.outcome,
      matchedKeywords: ex.matchedKeywords
    }))
  };
}

function buildPrompt({ projectIdea, keywords, selectedTheme, calls }) {
  const rwsContext = buildRwsContext(selectedTheme) || RWS_CONTEXT_FALLBACK;
  const { examples, metadata: examplesMetadata } = selectRelevanceExamples(projectIdea, keywords, selectedTheme, calls);
  
  const relevanceExamplesText = examples.length > 0
    ? `\nRELEVANTE HISTORISCHE VOORBEELDEN:\n` + examples.map((ex) => `
## Voorbeeld: ${ex.projectName}${ex.projectAbbreviation ? ` (${ex.projectAbbreviation})` : ''}
Type: ${ex.useAs === 'positive_example' ? 'POSITIEF VOORBEELD — als een call hier sterk op lijkt, verhoog aiRelevanceScore met 5–10 punten' : 'Referentie'}
Thema: ${ex.theme} (${ex.themeId})
Call: ${ex.call}
Keywords: ${ex.keywords?.join(', ') || 'Niet beschikbaar'}
Patroon: ${ex.pattern || 'Niet beschikbaar'}
RWS-rol: ${ex.rwsRole || 'Niet beschikbaar'}
`).join('\n')
    : '';

  const prompt = `
Je bent een EU-fondsenexpert voor Rijkswaterstaat Bureau Brussel.

RELEVANTE RWS- EN BUREAU BRUSSEL-RAG-CONTEXT:
${rwsContext}${relevanceExamplesText}

Gebruik deze context als beoordelingskader. Beoordeel calls niet op algemene EU-relevantie, maar op concrete RWS-relevantie, uitvoerbaarheid en toepasbaarheid voor Rijkswaterstaat als uitvoeringsorganisatie.

IMPORTANT: Historische voorbeelden zijn patroonvoorbeelden, geen bewijs. Gebruik ze alleen als ondersteunend signaal bij inhoudelijke overeenkomst met titel, scope, doel, keywords of RWS-rol. Procesuitkomsten zoals rejected_eu of rejected_rws mogen de relevantie niet verlagen. Als een call sterk lijkt op een voorbeeld, benoem dat dan expliciet in projectFit of rationale.

COMPACTE REFERENTIES INSTRUCTIE:
- Wanneer je historische voorbeelden of RAG-context items vermeldt in projectFit, rationale of andere tekstvelden, gebruik dan compacte, mensvriendelijke referenties uit de data in plaats van de volledige lange titels.
- Voor historische voorbeelden: gebruik projectAbbreviation waar beschikbaar (bijv. "MANABAS COAST" in plaats van "MAinstreaming Nature Based Solutions through COASTal Systems").
- Voor RAG-context: gebruik een beknopte mensvriendelijke korte titel of themalabel waar beschikbaar (bijv. "Klimaatadaptatie" in plaats van "Focuspunt Klimaatadaptatie"). Gebruik de technische id alleen als er geen mensvriendelijke korte titel beschikbaar is.
- Verzin geen labels of afkortingen — gebruik alleen bestaande referenties uit de data.
- Houd projectFit en rationale beknopt en laat referenties niet domineren.
- Als geen korte referentie beschikbaar is, gebruik dan de volledige titel maar herhaal deze niet meerdere keren.

RAG INSTRUCTIES:
- RAG context is optional supporting context, not mandatory evidence.
- Do not force a RWS connection because RAG contains a related theme.
- Use RAG only when the call text itself supports a concrete match.
- If RAG context is broad or generic, say so and do not increase the score much.

HISTORISCHE VOORBEELDEN INSTRUCTIES:
- All examples in data/relevance_examples.json are positive relevance examples.
- They are pattern examples only, not proof of relevance.
- Do not assign a high score solely because a call resembles a past positive example.
- Generic similarity, such as both mentioning climate, AI, logistics or digitalisation, is weak evidence.

ZOEKVRAAG VAN DE GEBRUIKER:
Projectidee:
${projectIdea || 'Niet opgegeven'}

Keywords:
${keywords || 'Niet opgegeven'}

Gekozen Bureau Brussel-thema:
${selectedTheme || 'Niet opgegeven'}

OPDRACHT:
Beoordeel de onderstaande EU-calls specifiek ten opzichte van de zoekvraag van de gebruiker.

De zoekvraag van de gebruiker is leidend. Leg per call expliciet uit:
1. of en hoe de call aansluit op het projectidee;
2. welke onderdelen van het projectidee terugkomen in de call;
3. welke onderdelen ontbreken of onzeker zijn;
4. of Rijkswaterstaat een logische rol kan hebben als uitvoeringsorganisatie;
5. hoe de call past binnen het gekozen Bureau Brussel-thema;
6. of de call substantiële overlap heeft met het geselecteerde thema of filtercontext.

Beoordeel user intent fit als een aparte, cruciale dimensie. Een call kan algemene RWS-relevantie hebben, maar als deze niet past bij het geselecteerde thema, keywords of projectidee van de gebruiker, mag deze niet hoog scoren.

Als het projectidee Nederlandstalige RWS-termen bevat, interpreteer deze in EU-call context. Bijvoorbeeld:
- bruggenmonitoring = bridge monitoring, bridge inspection, structural health monitoring, condition monitoring;
- hoofdwegennet = highway network, national road network, motorway network, road infrastructure;
- instandhouding = infrastructure resilience, renovation, replacement, lifecycle management, asset management;
- kunstwerken = bridges, tunnels, locks, sluices, civil structures.

Geef een hoge score alleen als de call zowel inhoudelijk aansluit op het projectidee als een duidelijke RWS-rol heeft. Wees conservatief in scoring en expliciet over onzekerheden.

Rangschik de calls van meest naar minst relevant.

BEOORDELINGSCRITERIA:
Beoordeel per call:
1. Inhoudelijke aansluiting op projectidee en keywords.
2. Aansluiting op het gekozen Bureau Brussel-thema, indien opgegeven.
3. Relevantie voor Rijkswaterstaat als uitvoeringsorganisatie, niet primair als beleidsmaker.
4. Mogelijke rol voor RWS, bijvoorbeeld asset owner, beheerder, pilotlocatie, consortiumdeelnemer, kennispartner of stakeholder. RWS hoeft geen lead partner, uitvoeringspartner of formele begunstigde te zijn voor een hoge projectfit. Een lichte, passieve of kennisgerichte rol kan nog steeds hoog scoren wanneer RWS duidelijke strategische waarde inbrengt door practitioner-expertise, asset-owner perspectief, infrastructuur- of vaarwegbeheer kennis, corridor-/netwerk governance ervaring, implementatie-lessons, standaardisatie- of interoperabiliteitsinput, beleidsinvloed vanuit uitvoeringspraktijk, toegang tot relevante Europese netwerken, of leerwaarde voor RWS-prioriteiten.
5. Mate van onzekerheid, bijvoorbeeld als scope te breed is of eligibility onduidelijk is.


SCORING — twee samenhangende maar onafhankelijk berekende scores per call:

aiRelevanceScore (0–100): de totale beoordeling op basis van ALLE beschikbare informatie:
- Inhoudelijke aansluiting op het projectidee en de opgegeven keywords.
- Relevantie voor Rijkswaterstaat als uitvoeringsorganisatie (asset owner, beheerder, kennispartner, pilotlocatie, consortiumdeelnemer).
- Aansluiting op de RWS RAG-context hierboven (domeinen, lopende projecten, prioriteiten van RWS).
- Gelijkenis met historische positieve voorbeelden uit de RAG.

CONSERVATIEVE SCORECAPS (verplicht):
- Generic sustainability, climate, AI or digitalisation link only: MAX 70
- Do not cap projectfit merely because RWS is stakeholder, associated partner or knowledge partner. Cap only when the RWS role is passive and there is no clear strategic value, no link to RWS assets/networks/water systems, no knowledge contribution, no consortium/network value and no implementation or policy-learning relevance. For strategic knowledge roles (standardisation, governance, corridor management, asset management expertise), MAX 85 is appropriate even without direct execution role.
- No concrete RWS asset, network, water system, road, waterway, bridge, lock, tunnel, corridor or operational management role: MAX 78
- Relevance mainly comes from RAG context rather than the call text: MAX 72
- Relevance mainly comes from historical examples: MAX 75
- Scores above 85 require direct evidence from the call text plus a concrete RWS role
- Scores above 90 require exceptional fit with RWS core tasks and realistic implementation or pilot potential
- For CEF/TEN-T military mobility or civil-defence dual-use infrastructure calls, do not penalize the call merely because RWS may not be lead partner. If RWS can contribute as national infrastructure manager, asset owner, corridor expert, knowledge partner, stakeholder or associated partner, this can still be a strong fit.

USER INTENT / ACTIVE FILTER FIT (verplicht):
- Beoordeel "user intent fit" apart van algemene RWS-fit.
- Als een actief thema/filter aanwezig is, moet de call substantiële overlap hebben met dat thema om hoog te scoren.
- RAG-context mag relevantie ondersteunen, maar mag geen mismatch met het gekozen thema of gebruikersintentie overschrijven.

THEMA-SPECIFIEKE FIT CAPS:
- Als actief thema/filter aanwezig is EN de call heeft geen substantiële overlap met dat thema: MAX 65
- Als actief thema/filter aanwezig is EN overlap zwak of alleen indirect is: MAX 75
- Als relevantie vooral komt uit RAG-context buiten het geselecteerde thema: MAX 70
- Als gebruikerskeywords of projectidee zijn opgegeven EN de call daar niet op aansluit: MAX 70
- Scores boven 80 vereisen zowel RWS-relevantie als duidelijke fit met het actieve thema/gebruikersintentie
- Scores boven 85 vereisen direct call-text bewijs voor zowel RWS-fit als actieve thema/gebruikersintentie fit
- RAG-context mag deze caps niet omzeilen
- Pas caps toe NA eventuele RAG- of historische-voorbeeld bonussen
- Als meerdere caps van toepassing zijn, gebruik dan de laagste cap

THEMA-SPECIFIEKE RICHTLIJNEN:
- Als geselecteerd thema "Corridor Management" is, scoort een call alleen hoog als de call-tekst concrete overlap heeft met corridors, corridorbeheer, netwerkbeheer, transportcorridors, logistieke corridors, multimodale netwerken, TEN-T, verkeersmanagement, vaarwegcorridors, goederen-/passagiersstromen, ITS/C-ITS, RIS, of operationeel corridor-niveau infrastructuurbeheer.
- Een generieke match met klimaatadaptatie, duurzaamheid, digitalisering of RWS RAG-context is onvoldoende voor een hoge score als het geselecteerde thema "Corridor Management" is.

Scorebonussen (cumuleerbaar, max +15 totaal op aiRelevanceScore):
+3 tot +8 als de call inhoudelijk aansluit op een of meer RAG-context items — benoem de titel(s) in ragMatchedItems
+3 tot +7 als de call sterk lijkt op een POSITIEF VOORBEELD uit de historische voorbeelden - benoem de titel(s) in ragMatchedItems

CONSERVATIEVE SCORE RANGES:
0–20 = geen RWS-domein, geen uitvoeringsrol denkbaar
21–40 = zwakke of indirecte RWS-fit
41–60 = mogelijk relevant, RWS-rol onzeker of indirect
61–70 = duidelijke RWS-domeinlink maar generieke aansluiting (sustainability, climate, AI, digitalisation)
71–78 = concrete RWS-domeinlink maar indirecte of onzekere uitvoeringsrol
79–85 = sterke RWS-domeinlink met plausibele uitvoeringsrol, direct call-text evidence
86–90 = uitstekende RWS-fit met concrete RWS rol en direct call-text evidence
91–100 = exceptionele RWS-fit met RWS core tasks en realistisch implementatie/pilot potentieel

projectFitScore (0–100): de specifieke aansluiting op het projectidee van de gebruiker, los berekend van de bredere RWS-fit.
Kijk alleen naar: komen de kernbegrippen, doelen en aanpak van het projectidee terug in de scope van de call?
Een call kan een hoge projectFitScore hebben met een lage aiRelevanceScore (bijv. goed projectidee-match maar RWS speelt geen rol), of omgekeerd.

Scorebeperkingen voor aiRelevanceScore:
- Landbouw-, boeren-, voedsel- of rurale termen zijn niet automatisch lage RWS-fit. Beoordeel alleen lager als er geen concrete koppeling is met RWS-taken zoals waterbeheer, droogte, overstromingsrisico, infrastructuur, assetmanagement, klimaatadaptatie of gebiedsgerichte uitvoering: maximaal 35.
- Primair gemeentelijk/stedelijk zonder nationale infrastructuur, waterbeheer of corridors: maximaal 45.
- Puur academisch of individuele onderzoeker zonder implementatie/pilot/asset owner rol: maximaal 40.


CALLS:
${JSON.stringify(calls, null, 2)}

MANAGEMENT SAMENVATTING OPDRACHT:
Naast de individuele call-beoordelingen, lever ook een beknopte managementsamenvatting voor de top 15 resultaten. 
Deze samenvatting is bedoeld voor RWS-management en moet de volgende elementen bevatten:

Geef uitsluitend geldige JSON terug.
Geen markdown.
Geen code fences.
Geen uitleg buiten JSON.

De JSON moet exact deze structuur hebben:
{
  "summary": {
    "executiveSummary": "Beknopte samenvatting in 2-3 zinnen van de belangrijkste bevindingen voor RWS",
    "overallAdvice": "Algemene advies in 1-2 zinnen over de kansen en uitdagingen",
    "topOpportunities": [
      {"identifier": "...", "title": "...", "score": 0, "rationale": "..."},
      {"identifier": "...", "title": "...", "score": 0, "rationale": "..."},
      {"identifier": "...", "title": "...", "score": 0, "rationale": "..."}
    ],
    "notableExclusions": "Belangrijke calls die NIET in de top 15 zitten maar wel relevant kunnen zijn voor RWS (max 2-3 regels)",
    "recommendedNextSteps": [
      "Concrete aanbeveling 1",
      "Concrete aanbeveling 2",
      "Concrete aanbeveling 3"
    ]
  },
  "reviews": [
    {
      "identifier": "...",
      "aiRelevanceScore": 0,
      "projectFit": "...",
      "projectFitScore": 0,
      "themeFit": ["..."],
      "rationale": "...",
      "possibleRwsRole": "...",
      "possibleRwsProject": "...",
      "callScopeSummary": "...",
      "uncertainties": "...",
      "callRequirements": ["...", "...", "..."],
      "ragMatchedItems": ["titel van RAG-item indien gematcht, anders lege array"],
      "snapshotReden": "...",
      "waaromRelevant": ["...", "..."]
    }
  ]
}

- snapshotReden: exact 1 zin in het NEDERLANDS, max 15 woorden, die uitlegt waarom deze call opvalt voor RWS. Begin met een werkwoord of concreet onderwerp. NIET: "Deze call is relevant voor RWS vanwege..." WEL: "Zoekt uitvoerende partner voor sensorvalidatie op bestaande rijksinfrastructuur." WEL: "Financiert pilots voor klimaatbestendige waterkeringen met asset-owner deelname."
- waaromRelevant: array van exact 2 bullets in het NEDERLANDS, elk max 20 woorden. Bullet 1: concrete link tussen de call en een specifiek RWS-domein of taak. Bullet 2: specifiek element van de call dat aansluit op lopende RWS-programma's of RAG-context. NIET: herhaling van snapshotReden. NIET: generieke zinnen als "is relevant voor RWS vanwege zijn infrastructuurrol."
- possibleRwsProject: geef alleen een concrete projectzin als de calltekst of RAG-context voldoende aanknopingspunten biedt voor rol, actie en RWS-asset/programma. Als één van deze drie ontbreekt, geef null terug. Vermijd generieke invullingen. Als geen concrete invulling mogelijk is op basis van de calldata en RAG-context: geef null terug. NOOIT de tekst "Nog te concretiseren" of een variant daarvan. NOOIT een herhaling van waaromRelevant of possibleRwsRole.
- possibleRwsRole: 1 tot 2 volledige zinnen in het Nederlands. Noem het roltype, maar geef ook context over wat RWS concreet zou kunnen bijdragen. Geef geen losse lijst van labels zoals "asset owner, kennispartner, corridorbeheerder".
- projectFit: 1 tot 3 concrete zinnen in het Nederlands. Leg uit hoe de call past bij het projectidee, welke RWS-taak of asset geraakt wordt, en welke rol RWS realistisch kan hebben. Vermijd één-zinsantwoorden.
- rationale: 1 tot 3 concrete zinnen in het Nederlands. Leg uit waarom de call relevant is voor RWS, met direct bewijs uit de calltekst en, waar relevant, RAG-context of historische voorbeelden. Vermijd generieke formuleringen en herhaal niet alleen projectFit.
- uncertainties: 1 tot 2 concrete zinnen in het Nederlands. Benoem wat werkelijk onzeker is: eligibility, locatie, Nederlandse scope, consortiumrol, cofinanciering, uitvoeringsfase of beschikbaarheid van RWS-assets. Vermijd vage zinnen zoals "scope is breed" zonder uitleg.

- callRequirements: array van exact 3 vereisten die letterlijk voortvloeien uit de calltekst. Haal ze uit de volgende categorieën (gebruik elke categorie maximaal één keer):
  1. Consortiumvereisten: minimale omvang, type organisaties, landen of geografische spreiding (bijv. "Minimaal 3 deelnemers uit 3 verschillende EU-lidstaten vereist")
  2. Inhoudelijke scope: specifieke activiteiten of thema's die verplicht moeten worden geadresseerd (bijv. "Nature-based solutions moeten als eerste optie worden verkend boven technische maatregelen")
  3. Geografische/sectorale focus of procesmatige eisen: waar het project op gericht moet zijn of hoe het uitgevoerd moet worden (bijv. "Verplichte afstemming met het Mission Implementation Platform via een MoU")
  Alleen letterlijke vereisten uit de calltekst. Geen interpretaties of aanbevelingen. Elk vereiste maximaal 20 woorden. Als een categorie niet aanwezig is in de call, kies dan de drie sterkste vereisten ongeacht categorie.

BALANS-INSTRUCTIE:
callRequirements mogen kort en feitelijk zijn, maar projectFit, rationale, possibleRwsRole en uncertainties moeten inhoudelijke toelichting blijven geven. Verkort deze velden niet tot labels of telegramstijl. Gebruik korte maar volledige zinnen.

- ragMatchedItems: lijst van titels van RAG-context items die inhoudelijk aansluiten op deze call. Lege array als er geen match is.

Sorteer reviews van hoogste naar laagste aiRelevanceScore.
Gebruik geen tekst buiten JSON.
`.trim();

  return { prompt, examplesMetadata };
}

function extractJsonFromText(text) {
  const cleaned = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Ga door naar extractie hieronder.
  }

  const firstObject = cleaned.indexOf('{');
  const lastObject = cleaned.lastIndexOf('}');
  const firstArray = cleaned.indexOf('[');
  const lastArray = cleaned.lastIndexOf(']');

  const objectCandidate =
    firstObject !== -1 && lastObject !== -1 && lastObject > firstObject
      ? cleaned.slice(firstObject, lastObject + 1)
      : '';

  const arrayCandidate =
    firstArray !== -1 && lastArray !== -1 && lastArray > firstArray
      ? cleaned.slice(firstArray, lastArray + 1)
      : '';

  const candidates = [objectCandidate, arrayCandidate].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Probeer volgende kandidaat.
    }
  }

  throw new Error('AI gaf geen geldige JSON terug');
}

function extractSummaryFromData(parsed) {
  // Extract summary from various possible locations
  if (parsed?.summary) {
    return parsed.summary;
  }

  // If summary is at root level
  if (parsed.executiveSummary || parsed.overallAdvice) {
    return parsed;
  }

  // If reviews contains summary
  const reviewsArray = Array.isArray(parsed?.reviews) ? parsed.reviews : [];
  const firstReview = reviewsArray[0];
  if (firstReview?.summary) {
    return firstReview.summary;
  }

  return null;
}

function normalizeIdentifier(value) {
  return String(value || '').trim();
}

function normalizeAiReviews(parsed, allowedIdentifiers = null) {
  const reviews = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.reviews)
      ? parsed.reviews
      : [];

  const normalized = reviews.map((review) => ({
    identifier: normalizeIdentifier(review.identifier || review.callId),
    aiRelevanceScore: Number(review.aiRelevanceScore ?? 0),
    projectFit: review.projectFit || review.project_fit || review.projectMatch || '',
    projectFitScore: Number(
      review.projectFitScore ??
      review.project_fit_score ??
      review.projectMatchScore ??
      0
    ),
    themeFit: Array.isArray(review.themeFit)
      ? review.themeFit
      : review.themeFit
        ? [review.themeFit]
        : review.theme
          ? [review.theme]
          : review.thema
            ? [review.thema]
            : [],
    rationale: review.rationale || review.uitleg || review.explanation || '',
    possibleRwsRole:     review.possibleRwsRole || review.rws_role || review.rwsRole || '',
    possibleRwsProject:  review.possibleRwsProject || '',
    callScopeSummary:    review.callScopeSummary || '',
    uncertainties:       review.uncertainties || review.onzekerheden || '',
    callRequirements:    Array.isArray(review.callRequirements)
      ? review.callRequirements.map(String).map(s => s.trim()).filter(Boolean).slice(0, 3)
      : [],
    ragMatchedItems:     Array.isArray(review.ragMatchedItems) ? review.ragMatchedItems : [],
    snapshotReden:       review.snapshotReden || '',
    waaromRelevant:      Array.isArray(review.waaromRelevant) ? review.waaromRelevant : []
  }));

  const filtered = allowedIdentifiers instanceof Set
    ? normalized.filter((review) => allowedIdentifiers.has(review.identifier))
    : normalized.filter((review) => review.identifier);

  const droppedReviewCount = normalized.length - filtered.length;
  if (droppedReviewCount > 0) {
    console.warn('AI-reviews zonder bekende identifier genegeerd:', { droppedReviewCount });
  }

  // Sorteer reviews op aiRelevanceScore (hoog naar laag)
  // Calls zonder score (0) komen onderaan
  filtered.sort((a, b) => {
    const scoreA = a.aiRelevanceScore || 0;
    const scoreB = b.aiRelevanceScore || 0;
    return scoreB - scoreA;
  });

  return { reviews: filtered };
}

// ── Provider-specifieke LLM-aanroepen ────────────────────────

async function callMistral(prompt, modelName = MISTRAL_MODEL) {
  const apiKey = process.env.VIBE_CLI_KEY_BCG;
  if (!apiKey) throw new Error('VIBE_CLI_KEY_BCG environment variable is required');

  const response = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Je bent een EU-fondsenexpert voor Rijkswaterstaat Bureau Brussel. Geef uitsluitend geldige JSON terug.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const apiError = new Error(err.error?.message || `Mistral-fout ${response.status}`);
    apiError.status = response.status;
    apiError.details = err;
    throw apiError;
  }

  const data = await response.json();
  return {
    rawText: data.choices?.[0]?.message?.content || '{"reviews":[],"summary":{}}',
    provider: 'mistral',
    model: modelName
  };
}



// ── Handler ───────────────────────────────────────────────────

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { projectIdea, keywords, selectedTheme, calls } = req.body || {};

    if (!Array.isArray(calls) || calls.length === 0) {
      return res.status(400).json({ error: 'Geen calls meegestuurd' });
    }

    // Apply safe input length limits
    const safeProjectIdea = limitText(projectIdea, 1500);
    const safeKeywords = limitText(keywords, 500);

    const safeSelectedTheme = limitText(selectedTheme, 80);
    const batch = calls.slice(0, 15);
    const allowedIdentifiers = new Set(
      batch.map((call) => normalizeIdentifier(call.identifier)).filter(Boolean)
    );

    const { prompt, examplesMetadata: relevanceExamplesUsed } = buildPrompt({
      projectIdea: safeProjectIdea, keywords: safeKeywords, selectedTheme: safeSelectedTheme, calls: batch
    });

    // Call Mistral with fallback support
    let rawText, provider, model;
    let primaryCallSucceeded = false;
    
    // Safe logging - configuration summary
    console.log('Mistral Configuration:', {
      primaryModel: MISTRAL_MODEL,
      fallbackConfigured: !!AI_FALLBACK_MODEL,
      fallbackModel: AI_FALLBACK_MODEL || 'none'
    });
    
    try {
      // Try primary Mistral model
      ({ rawText, provider, model } = await callMistral(prompt));
      primaryCallSucceeded = true;
      console.log('Primary Mistral model succeeded:', model);
    } catch (primaryError) {
      // Check if this is a high-demand/capacity error
      const errorMessage = primaryError.message || '';
      const isHighDemandError = errorMessage.includes('high demand') || 
                               errorMessage.includes('currently experiencing high demand') ||
                               errorMessage.includes('try again later') ||
                               primaryError.status === 429 ||
                               primaryError.status === 503 ||
                               primaryError.status === 504;
      
      console.log('Primary Mistral model failed:', {
        errorType: isHighDemandError ? 'high_demand' : 'other',
        errorMessage: errorMessage,
        fallbackAvailable: !!AI_FALLBACK_MODEL
      });
      
      // Try fallback model if available and it's a high-demand error
      if (isHighDemandError && AI_FALLBACK_MODEL) {
        console.log('Primary Mistral model experiencing high demand, trying fallback model:', AI_FALLBACK_MODEL);
        
        try {
          // Use fallback model without reassigning const variable
          ({ rawText, provider, model } = await callMistral(prompt, AI_FALLBACK_MODEL));
          primaryCallSucceeded = true;
          console.log('Fallback Mistral model succeeded:', model);
        } catch (fallbackError) {
          console.log('Fallback Mistral model also failed:', {
            errorMessage: fallbackError.message,
            status: 'fallback_failed'
          });
        }
      } else if (isHighDemandError && !AI_FALLBACK_MODEL) {
        console.log('No AI_FALLBACK_MODEL configured.');
      }
      
      if (!primaryCallSucceeded) {
        // Re-throw the original error if fallback didn't work or wasn't available
        console.log('Final error status:', {
          primaryFailed: true,
          fallbackAttempted: isHighDemandError && !!AI_FALLBACK_MODEL,
          fallbackSucceeded: primaryCallSucceeded,
          errorMessage: primaryError.message
        });
        throw primaryError;
      }
    }

    let parsed;
    try {
      parsed = extractJsonFromText(rawText);
    } catch (parseError) {
      const rawTextPreview = String(rawText || '').slice(0, 1000);
      console.error(`Kon ${provider}-output niet parsen:`, {
        error: parseError.message,
        rawTextPreview
      });

      const responseBody = { error: 'AI gaf geen geldige JSON terug' };
      if (process.env.NODE_ENV !== 'production') {
        responseBody.rawTextPreview = rawTextPreview;
      }
      return res.status(502).json(responseBody);
    }

    const normalized     = normalizeAiReviews(parsed, allowedIdentifiers);
    const summary        = extractSummaryFromData(parsed);
    const responseSummary = summary || {
      executiveSummary: '',
      overallAdvice: '',
      topOpportunities: [],
      notableExclusions: '',
      recommendedNextSteps: []
    };

    // ragContextUsed hoort niet in summary-output
    delete responseSummary.ragContextUsed;

    const ragContext = getRagContextMetadata(safeSelectedTheme);

    return res.status(200).json({
      ...normalized,
      summary: responseSummary,
      provider,
      model,
      ragContextUsed: ragContext,
      relevanceExamplesUsed
    });

  } catch (error) {
    console.error('Fout in /api/score:', error);
    
    // Check for high-demand/capacity errors and provide user-friendly message
    const errorMessage = error.message || '';
    const isHighDemandError = errorMessage.includes('high demand') || 
                             errorMessage.includes('currently experiencing high demand') ||
                             errorMessage.includes('try again later') ||
                             error.status === 429 ||
                             error.status === 503 ||
                             error.status === 504;
    
    if (isHighDemandError) {
      // User-friendly Dutch message
      const userMessage = 'Het AI-model is tijdelijk overbelast. Probeer het later opnieuw of kies een ander model.';
      console.warn('AI capacity error - showing user-friendly message');
      return res.status(503).json({ 
        error: userMessage
      });
    }
    
    return res.status(500).json({ error: error.message });
  }
}
