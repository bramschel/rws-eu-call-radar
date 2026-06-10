// ── Config ────────────────────────────────────────────────────
const DATA_URL = './data/grants.json';
const AI_API_URL = window.location.hostname.includes('vercel.app') ? '/api/score' : '';
const PAGE_SIZE = 25;
const SAVED_CALLS_KEY    = 'rws-eu-call-radar-saved-calls';
const PIPELINE_KEY       = 'rws-eu-call-radar-pipeline';

const TRACKING_BASELINE_DATE = '2026-01-01T00:00:00.000Z';

const STATUS_OPTIONS = [
  { id: 'live',     label: 'Live',        matches: new Set(['31094501', '31094502']) },
  { id: '31094502', label: 'Open',        matches: new Set(['31094502']) },
  { id: '31094501', label: 'Forthcoming', matches: new Set(['31094501']) }
];

const PIPELINE_STAGES = [
  { id: 'verkennen',  label: 'Verkennen',   color: '#6366f1' },
  { id: 'beoordelen', label: 'Beoordelen',  color: '#f59e0b' },
  { id: 'ingediend',  label: 'Ingediend',   color: '#10b981' },
  { id: 'afgerond',   label: 'Afgerond',    color: '#64748b' }
];

// ── Thema's & scoringsdata ────────────────────────────────────
const RWS_THEMES = [
  { id: 'corridor-management', label: 'Corridor Management',
    description: 'Transportcorridors, vaarwegen, TEN-T, multimodaliteit, verkeersmanagement en slimme mobiliteit.',
    terms: ['corridor management','TEN-T','trans-European transport network','transport corridor','inland waterways','waterborne transport','navigation','shipping','ports','port areas','multimodal transport','logistics','traffic management','network management','smart mobility','cooperative intelligent transport systems','C-ITS','ITS','River Information Services','RIS','cross-border transport','transport infrastructure','mobility corridor'] },
  { id: 'climate-adaptation', label: 'Climate Adaptation',
    description: 'Klimaatbestendige infrastructuur, waterveiligheid, droogte, hitte, overstroming en resilience.',
    terms: ['climate adaptation','climate resilience','resilient infrastructure','adaptive infrastructure','flood risk','flood safety','flood protection','flood preparedness','water security','water resilience','sea level rise','storm surge','extreme weather','heat stress','drought','freshwater availability','fresh water','water management','river basin','coastal resilience','urban resilience','climate proof','climate-proof'] },
  { id: 'sustainability', label: 'Sustainability / Duurzame Leefomgeving',
    description: 'Duurzame infrastructuur, circulariteit, klimaatneutraliteit, biodiversiteit, natuur en waterkwaliteit.',
    terms: ['sustainability','sustainable infrastructure','sustainable land use','sustainable water management','circular economy','circular infrastructure','material reuse','reuse of materials','secondary raw materials','asphalt recycling','recycling','circular procurement','zero-emission construction','zero emission construction','low carbon construction','climate-neutral infrastructure','carbon neutral','carbon-neutral','energy neutral','biodiversity','nature-inclusive infrastructure','nature inclusive infrastructure','habitat restoration','ecosystem restoration','nature-based solutions','nature based solutions','building with nature','green infrastructure','blue infrastructure','green and blue infrastructure','water quality','water pollution','wastewater','ecology'] },
  { id: 'digitalisation', label: 'Digitalisation',
    description: 'Data, AI, digital twins, smart infrastructure, automatisering, informatievoorziening en besluitvorming.',
    terms: ['digitalisation','digitalization','data','data governance','data-driven','data driven','information systems','information management','artificial intelligence','AI','machine learning','decision support','digital twin','digital twins','smart infrastructure','smart mobility','automation','automated systems','predictive maintenance','sensor data','remote sensing','cybersecurity','interoperability','C-ITS','ITS','River Information Services','RIS','traffic data','mobility data'] },
  { id: 'network-governance', label: 'Network Governance',
    description: 'Internationale samenwerking, harmonisatie, standaardisatie, beleidsinstrumenten en netwerkcoördinatie.',
    terms: ['network governance','governance','cross-border cooperation','cross border cooperation','international cooperation','European cooperation','coordination','co-ordination','harmonisation','harmonization','standardisation','standardization','interoperability','policy instruments','capacity building','institutional cooperation','stakeholder cooperation','partnerships','public authorities','public administration','regulatory framework','knowledge exchange','best practices','European networks','network operators','road authorities','water authorities'] }
];

const IMPORTANT_PHRASES = [
  { phrase: 'material reuse',                   theme: 'sustainability',      weight: 28 },
  { phrase: 'reuse of materials',               theme: 'sustainability',      weight: 28 },
  { phrase: 'circular infrastructure',          theme: 'sustainability',      weight: 32 },
  { phrase: 'asphalt recycling',                theme: 'sustainability',      weight: 30 },
  { phrase: 'circular procurement',             theme: 'sustainability',      weight: 24 },
  { phrase: 'nature-based solutions',           theme: 'sustainability',      weight: 26 },
  { phrase: 'water quality',                    theme: 'sustainability',      weight: 20 },
  { phrase: 'climate resilient infrastructure', theme: 'climate-adaptation',  weight: 34 },
  { phrase: 'climate resilience',               theme: 'climate-adaptation',  weight: 24 },
  { phrase: 'flood risk',                       theme: 'climate-adaptation',  weight: 28 },
  { phrase: 'flood protection',                 theme: 'climate-adaptation',  weight: 28 },
  { phrase: 'sea level rise',                   theme: 'climate-adaptation',  weight: 26 },
  { phrase: 'river basin',                      theme: 'climate-adaptation',  weight: 22 },
  { phrase: 'inland waterways',                 theme: 'corridor-management', weight: 30 },
  { phrase: 'river information services',       theme: 'corridor-management', weight: 30 },
  { phrase: 'TEN-T corridor',                   theme: 'corridor-management', weight: 30 },
  { phrase: 'traffic management',               theme: 'corridor-management', weight: 22 },
  { phrase: 'digital twin',                     theme: 'digitalisation',      weight: 30 },
  { phrase: 'decision support',                 theme: 'digitalisation',      weight: 22 },
  { phrase: 'predictive maintenance',           theme: 'digitalisation',      weight: 26 },
  { phrase: 'sensor data',                      theme: 'digitalisation',      weight: 20 },
  { phrase: 'network governance',               theme: 'network-governance',  weight: 30 },
  { phrase: 'cross-border cooperation',         theme: 'network-governance',  weight: 24 },
  { phrase: 'interoperability',                 theme: 'network-governance',  weight: 18 },
  { phrase: 'harmonisation',                    theme: 'network-governance',  weight: 18 }
];

const RWS_DOMAIN_TERMS = ['infrastructure','transport infrastructure','road infrastructure','roads','highways','bridges','tunnels','asset management','maintenance','renovation','traffic management','mobility','smart mobility','corridor','TEN-T','inland waterways','waterways','navigation','shipping','ports','river','river basin','flood risk','flood protection','water safety','water management','coastal','sea level rise','drought','digital twin','sensor data','decision support','predictive maintenance','water infrastructure','flood management','flood resilience','flood defence','flood defense','stormwater','river management','coastal management','coastal protection','dike','dyke','levee','waterway infrastructure','climate-proof infrastructure','climate proof infrastructure','infrastructure resilience','road resilience','bridge resilience','tunnel resilience'];

const QUERY_SYNONYMS = {
  assetmanagement: ['asset management','infrastructure asset management','ISO 55001','lifecycle management','asset lifecycle','network performance','condition assessment','asset data','areaaldata','infrastructure maintenance'],
  instandhouding: ['maintenance','infrastructure maintenance','asset management','renovation','replacement','renewal','lifecycle management','predictive maintenance','condition monitoring'],
  onderhoud: ['maintenance','infrastructure maintenance','asset management','predictive maintenance','preventive maintenance','condition-based maintenance'],
  renovatie: ['renovation','infrastructure renovation','renewal','replacement','rehabilitation','lifecycle extension'],
  vervanging: ['replacement','renewal','renovation','infrastructure renewal','asset replacement'],
  areaal: ['infrastructure assets','asset base','road assets','waterway assets','civil infrastructure'],
  areaaldata: ['asset data','infrastructure data','BIM data','geospatial data','asset information management'],
  kunstwerken: ['civil structures','bridges','tunnels','locks','sluices','viaducts','hydraulic structures'],
  bruggen: ['bridges','bridge infrastructure','civil structures','structural assets'],
  bruggenmonitoring: ['bridge monitoring','bridge inspection','structural health monitoring','condition monitoring','sensor-based monitoring','predictive maintenance'],
  brugmonitoring: ['bridge monitoring','bridge inspection','structural health monitoring','condition monitoring'],
  tunnels: ['tunnels','tunnel infrastructure','civil structures','infrastructure safety','industrial automation'],
  sluizen: ['locks','sluices','waterway infrastructure','hydraulic structures','navigation locks'],
  viaducten: ['viaducts','bridges','civil structures','infrastructure renovation'],
  hoofdwegennet: ['highway network','road network','national road network','motorway network','road infrastructure','TEN-T road network'],
  rijkswegen: ['highways','national roads','motorways','road infrastructure','road network','TEN-T roads'],
  wegen: ['roads','road infrastructure','road network','highways','motorways'],
  verkeersmanagement: ['traffic management','road traffic management','traffic flow','network management','traffic control','intelligent transport systems','ITS'],
  doorstroming: ['traffic flow','traffic efficiency','congestion management','network performance','traffic management'],
  verkeersveiligheid: ['road safety','traffic safety','transport safety','safe mobility'],
  hinderaanpak: ['traffic disruption management','roadworks planning','maintenance planning','smart planning','mobility management'],
  smartmobility: ['smart mobility','intelligent transport systems','ITS','C-ITS','connected mobility','multimodal mobility','digital mobility services'],
  'slimme mobiliteit': ['smart mobility','intelligent transport systems','ITS','C-ITS','connected mobility','multimodal mobility'],
  corridor: ['transport corridor','TEN-T corridor','mobility corridor','logistics corridor','multimodal corridor'],
  corridorbeheer: ['corridor management','TEN-T corridor management','transport corridor management','multimodal corridor management'],
  vaarwegen: ['waterways','inland waterways','navigation','waterborne transport','waterway infrastructure','River Information Services','RIS'],
  binnenvaart: ['inland navigation','inland waterways','waterborne transport','shipping','River Information Services','RIS'],
  rivieren: ['rivers','river basin','river management','river systems','water management','flood risk'],
  rivierbeheer: ['river management','river basin management','integrated river management','water management','flood risk management'],
  waterbeheer: ['water management','water system management','river basin management','integrated water management','water governance'],
  waterveiligheid: ['flood risk','flood protection','flood safety','water safety','flood resilience','flood risk management'],
  overstroming: ['flood','flooding','flood risk','flood protection','flood resilience'],
  overstromingsrisico: ['flood risk','flood risk management','flood resilience','flood protection'],
  droogte: ['drought','drought resilience','water scarcity','freshwater availability','water security'],
  zoetwater: ['freshwater','freshwater availability','water availability','water security'],
  zoetwatervoorziening: ['freshwater supply','freshwater availability','water security','drought management'],
  kust: ['coastal','coastal resilience','coastal management','coastal protection'],
  kustbeheer: ['coastal management','coastal protection','coastal resilience'],
  zeespiegelstijging: ['sea level rise','coastal resilience','coastal protection','flood risk'],
  dijken: ['dikes','dykes','levees','flood defences','flood protection'],
  waterkeringen: ['flood defences','water barriers','dikes','dykes','levees','flood protection'],
  klimaatadaptatie: ['climate adaptation','climate resilience','climate-proof infrastructure','climate proof infrastructure','resilient infrastructure','adaptive infrastructure'],
  klimaatbestendig: ['climate resilient','climate-proof','climate proof','resilient infrastructure','climate adaptive'],
  stresstest: ['stress test','climate stress test','vulnerability assessment','climate risk assessment'],
  stresstesten: ['stress tests','climate stress tests','vulnerability assessments','climate risk assessments'],
  duurzaamheid: ['sustainability','sustainable infrastructure','sustainable asset management','climate neutral','low carbon infrastructure'],
  circulair: ['circular economy','circular infrastructure','circular construction','material reuse','reuse of materials','secondary raw materials'],
  circulariteit: ['circular economy','circular infrastructure','circular construction','material reuse','reuse of materials'],
  materiaalhergebruik: ['material reuse','reuse of materials','reuse of construction materials','secondary raw materials','circular construction'],
  hergebruik: ['reuse','material reuse','reuse of materials','recycling','secondary raw materials'],
  asfalt: ['asphalt','asphalt recycling','recycled asphalt','low-temperature asphalt','road materials'],
  asfalthergebruik: ['asphalt recycling','recycled asphalt','asphalt reuse','circular road materials'],
  lagetemperatuurasfalt: ['low-temperature asphalt','warm mix asphalt','low carbon asphalt','sustainable asphalt'],
  biobased: ['bio-based materials','biobased materials','sustainable materials','circular materials'],
  natuurinclusief: ['nature-inclusive','nature inclusive infrastructure','biodiversity','ecological infrastructure','green infrastructure'],
  biodiversiteit: ['biodiversity','ecosystem restoration','habitat restoration','nature-inclusive infrastructure'],
  natuur: ['nature','biodiversity','ecosystem','habitat','nature-based solutions'],
  waterkwaliteit: ['water quality','water pollution','ecological water quality','aquatic ecosystems'],
  energietransitie: ['energy transition','renewable energy','solar energy','wind energy','energy infrastructure','zero emission'],
  emissiereductie: ['emission reduction','CO2 reduction','carbon reduction','low carbon','zero emission'],
  klimaatneutraal: ['climate neutral','carbon neutral','net zero','zero emission'],
  digitalisering: ['digitalisation','digitalization','digital transformation','digital infrastructure','data-driven infrastructure'],
  informatievoorziening: ['information management','information systems','data management','digital infrastructure'],
  data: ['data','data governance','data ecosystem','data sharing','data infrastructure'],
  dataecosysteem: ['data ecosystem','data sharing ecosystem','digital ecosystem','interoperable data'],
  'data-ecosysteem': ['data ecosystem','data sharing ecosystem','digital ecosystem','interoperable data'],
  datascience: ['data science','analytics','machine learning','AI','decision support'],
  sensoring: ['sensors','sensoring','sensor data','remote sensing','monitoring'],
  sensoren: ['sensors','sensor data','monitoring','remote sensing'],
  digitaltwin: ['digital twin','digital twins','infrastructure digital twin','asset digital twin'],
  'digitale tweeling': ['digital twin','digital twins','infrastructure digital twin','asset digital twin'],
  'digitale tweelingen': ['digital twins','infrastructure digital twins','asset digital twins'],
  voorspellendonderhoud: ['predictive maintenance','condition-based maintenance','asset monitoring','failure prediction'],
  'voorspellend onderhoud': ['predictive maintenance','condition-based maintenance','asset monitoring','failure prediction'],
  robotisering: ['robotics','robotisation','automation','inspection robots','maintenance robotics'],
  automatisering: ['automation','industrial automation','control systems','operational technology'],
  cyberveiligheid: ['cybersecurity','cyber security','secure infrastructure','operational technology security'],
  bim: ['BIM','Building Information Model','Building Information Modelling','asset information model'],
  dsgo: ['DSGO','digital built environment','data ecosystem','built environment data'],
  dsm: ['DSM','digital mobility system','mobility data ecosystem','transport data'],
  ngii: ['NGII','geospatial data infrastructure','national geo-information infrastructure','geodata'],
  opgavegericht: ['mission-oriented','challenge-driven','programme-based cooperation','integrated approach'],
  opgavegerichtsamenwerken: ['mission-oriented collaboration','integrated cooperation','cross-sector cooperation','public sector cooperation'],
  'opgavegericht samenwerken': ['mission-oriented collaboration','integrated cooperation','cross-sector cooperation','public sector cooperation'],
  ketensamenwerking: ['value chain cooperation','supply chain cooperation','sector collaboration','infrastructure sector cooperation'],
  samenwerking: ['cooperation','collaboration','partnership','knowledge exchange'],
  grensoverschrijdend: ['cross-border','cross-border cooperation','transnational cooperation','international cooperation'],
  harmonisatie: ['harmonisation','harmonization','standardisation','standardization','interoperability'],
  standaardisatie: ['standardisation','standardization','harmonisation','interoperability'],
  interoperabiliteit: ['interoperability','data interoperability','technical interoperability','standards'],
  infrabeheerders: ['infrastructure managers','infrastructure operators','road authorities','water authorities','asset owners'],
  markt: ['market parties','contractors','infrastructure sector','supply chain','public procurement'],
  portfolioaanpak: ['portfolio approach','programme approach','portfolio management','infrastructure portfolio'],
  tweefasenaanpak: ['two-phase approach','two-stage contracting','collaborative contracting','procurement innovation'],
  taskforceinfra: ['Taskforce Infra','infrastructure sector collaboration','market cooperation','innovation platform'],
  'taskforce infra': ['Taskforce Infra','infrastructure sector collaboration','market cooperation','innovation platform'],
  piarc: ['PIARC','World Road Association','road authorities','international road cooperation'],
  pianc: ['PIANC','waterborne transport infrastructure','navigation infrastructure','ports and waterways']
};

const STOP_WORDS = new Set(['de','het','een','en','of','op','in','aan','van','voor','met','zonder','door','over','onder','naar','uit','bij','als','dat','dit','die','deze','wat','waar','welke','hoe','om','te','tot','is','zijn','wordt','worden','kan','kunnen','rond','binnen','tussen','zoals','the','and','or','for','with','without','from','into','onto','over','under','between','within','about','that','this','these','those','what','which','how','can','could','should','would','will','are','was','were','been','being','such','via']);

const NOISE_TERMS = ['clinical trial','medical device','pharmaceutical','oncology','rare diseases','school curriculum','performing arts','film festival','space telescope'];

const WEAK_TERMS = new Set(['data','ai','resilience','sustainability','innovation','transition','governance','management','system','systems','network','capacity','digital','green','smart','risk','assessment','monitoring','analysis']);

// ── State ─────────────────────────────────────────────────────
const state = {
  data: null,
  filtered: [],
  savedIds: new Set(),
  pipeline: {},         // identifier -> stage id
  aiReviews: new Map(),
  aiSummary: null,
  aiRerankActive: false,
  activeView: 'radar',
  pagination: { page: 1, pageSize: PAGE_SIZE },
  filters: {
    query: '', projectIdea: '', status: 'live',
    programme: 'all', theme: 'all', actionType: 'all',
    recentMonths: 'all', sort: 'relevance-desc'
  }
};

// ── DOM refs ──────────────────────────────────────────────────
const elements = {
  projectInput:       document.querySelector('#project-input'),
  searchInput:        document.querySelector('#search-input'),
  statusPills:        document.querySelector('#status-pills'),
  programmeSelect:    document.querySelector('#programme-select'),
  themeSelect:        document.querySelector('#theme-select'),
  actionTypeSelect:   document.querySelector('#action-type-select'),
  recentSelect:       document.querySelector('#recent-select'),
  sortSelect:         document.querySelector('#sort-select'),
  resetButton:        document.querySelector('#reset-button'),
  metricTotal:        document.querySelector('#metric-total'),
  metricLive:         document.querySelector('#metric-live'),
  metricBudget:       document.querySelector('#metric-budget'),
  lastUpdated:        document.querySelector('#last-updated'),
  sourceCount:        document.querySelector('#source-count'),
  resultsCount:       document.querySelector('#results-count'),
  resultsHeadline:    document.querySelector('#results-headline'),
  resultsList:        document.querySelector('#results-list'),
  loadMoreButton:     document.querySelector('#load-more-button'),
  paginationControls: document.querySelector('#pagination-controls'),
  aiBriefingPanel:    document.querySelector('#ai-briefing-panel'),
  savedCallsCount:    document.querySelector('#saved-calls-count'),
  savedCallsList:     document.querySelector('#saved-calls-list'),
  exportSavedButton:  document.querySelector('#export-saved-button'),
  clearSavedButton:   document.querySelector('#clear-saved-button'),
  topProgrammes:      document.querySelector('#top-programmes'),
  grantCardTemplate:  document.querySelector('#grant-card-template'),
  radarView:          document.querySelector('#radar-view'),
  shortlistView:      document.querySelector('#shortlist-view'),
  pipelineView:       document.querySelector('#pipeline-view'),
  tabRadar:           document.querySelector('#tab-radar'),
  tabShortlist:       document.querySelector('#tab-shortlist'),
  tabPipeline:        document.querySelector('#tab-pipeline')
};

// ── Formatters ────────────────────────────────────────────────
const fmtCompact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const fmtMoney   = new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 });
const fmtDate    = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });
const fmtStamp   = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

const formatDate     = v => v ? fmtDate.format(new Date(v)) : 'TBA';
const formatStamp    = v => v ? fmtStamp.format(new Date(v)) : 'TBA';
const formatCurrency = v => v ? fmtMoney.format(v) : 'Unknown';

// ── Utilities ─────────────────────────────────────────────────
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = v => String(v).replace(/[&<>"']/g, c => HTML_ESCAPES[c]);

function normalizeText(v) {
  return String(v || '').toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const textContainsAny = (text, terms) => terms.some(t => text.includes(normalizeText(t)));

function splitTerms(value) {
  return normalizeText(value).split(/[\s,;]+/).map(t => t.trim())
    .filter(t => t.length >= 3 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));
}

function expandQueryTerms(rawInput) {
  const input = Array.isArray(rawInput) ? rawInput.join(' ') : String(rawInput || '');
  const norm  = normalizeText(input);
  const base  = Array.isArray(rawInput) ? rawInput : splitTerms(input);
  const out   = new Set(base);
  for (const [trigger, synonyms] of Object.entries(QUERY_SYNONYMS)) {
    if (norm.includes(normalizeText(trigger)) || base.includes(normalizeText(trigger))) {
      for (const syn of synonyms) {
        const ns = normalizeText(syn);
        if (ns) { out.add(ns); splitTerms(syn).forEach(t => out.add(t)); }
      }
    }
  }
  return Array.from(out);
}

function subtractMonths(date, months) {
  const d = new Date(date), day = d.getDate();
  d.setMonth(d.getMonth() - months);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

function isBaselineTrackingDate(value) {
  if (!value) return false;

  const time = new Date(value).getTime();
  const baselineTime = new Date(TRACKING_BASELINE_DATE).getTime();

  return Number.isFinite(time) && time === baselineTime;
}

function getGrantRecencyTimes(grant) {
  return [
    !isBaselineTrackingDate(grant.firstSeenAt) ? grant.firstSeenAt : null,
    grant.statusChangedAt,
    grant.firstOpenSeenAt
  ]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((time) => Number.isFinite(time));
}

function getGrantRecencyDate(grant) {
  const isForthcoming = grant.status?.id === '31094501';
  const candidates = isForthcoming
    ? [grant.publicationDate, grant.publishedDate, grant.firstPublishedDate,
       grant.createdAt, grant.createdDate, grant.lastModifiedDate, grant.updatedAt]
    : [grant.publicationDate, grant.publishedDate, grant.firstPublishedDate,
       grant.createdAt, grant.createdDate, grant.startDate,
       grant.lastModifiedDate, grant.updatedAt];
  for (const d of candidates) {
    if (d) {
      const t = new Date(d).getTime();
      if (!isNaN(t)) return t;
    }
  }
  return null;
}

const getPrimaryProgramme = g =>
  g.frameworkProgrammes[0]?.label || g.programmeDivisions[0]?.label ||
  g.callIdentifier?.split('-')[0] || 'Programme unavailable';

const getStatusOption = id => STATUS_OPTIONS.find(o => o.id === id) || STATUS_OPTIONS[0];
const escapeCsvValue  = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const createFact      = (label, value) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;

// ── Relevance scoring ─────────────────────────────────────────
function getGrantTextFields(grant) {
  return {
    title:      normalizeText(grant.title),
    summary:    normalizeText(grant.summary),
    destination:normalizeText(grant.destination),
    abstract:   normalizeText(grant.abstract),
    actionType: normalizeText(grant.actionType),
    searchText: normalizeText(grant.searchText)
  };
}

function scoreImportantPhrases(fields, selectedTheme) {
  let phraseScore = 0;
  const matchedPhrases = [];
  for (const item of IMPORTANT_PHRASES) {
    const np = normalizeText(item.phrase);
    const inTitle   = fields.title.includes(np);
    const inSummary = fields.summary.includes(np) || fields.destination.includes(np);
    const inOther   = fields.abstract.includes(np) || fields.searchText.includes(np);
    if (inTitle || inSummary || inOther) {
      let w = item.weight;
      if (inTitle)   w += 12;
      if (inSummary) w += 6;
      if (selectedTheme !== 'all' && item.theme === selectedTheme) w += 10;
      phraseScore += w;
      matchedPhrases.push(item.phrase);
    }
  }
  return { phraseScore, matchedPhrases };
}

function calculateRelevance(grant, query, projectIdea) {
  const fields    = getGrantTextFields(grant);
  const combined  = normalizeText([query, projectIdea].filter(Boolean).join(' '));
  const origTerms = splitTerms(combined);
  const terms     = expandQueryTerms(combined);
  const grantText = [fields.title, fields.summary, fields.destination, fields.abstract, fields.actionType, fields.searchText].join(' ');
  const hasRwsDomain = textContainsAny(grantText, RWS_DOMAIN_TERMS);

  const matchedTerms     = new Set();
  const origMatchedTerms = new Set();
  let expandedPhraseMatched = false;
  let queryRaw = 0;

  for (const term of terms) {
    const isOrig   = origTerms.includes(term);
    const isPhrase = term.includes(' ');
    if (WEAK_TERMS.has(term) && !hasRwsDomain) continue;

    const tw = isOrig ? 10 : isPhrase ? 9 : 3;
    const sw = isOrig ? 6  : isPhrase ? 6 : 2;
    const aw = isOrig ? 4  : isPhrase ? 4 : 1;
    const xw = isOrig ? 2  : isPhrase ? 2 : 0;

    let hit = false;
    if      (fields.title.includes(term))                                          { queryRaw += tw; hit = true; }
    else if (fields.summary.includes(term) || fields.destination.includes(term))   { queryRaw += sw; hit = true; }
    else if (fields.abstract.includes(term))                                        { queryRaw += aw; hit = true; }
    else if (xw > 0 && fields.searchText.includes(term))                           { queryRaw += xw; hit = true; }

    if (hit) {
      matchedTerms.add(term);
      if (isOrig)   origMatchedTerms.add(term);
      if (isPhrase) expandedPhraseMatched = true;
    }
  }

  const queryScore     = Math.min(30, queryRaw);
  const queryMatched   = matchedTerms.size > 0;
  const origQueryMatched = origMatchedTerms.size > 0;

  // Theme score (max 40)
  let themeRaw = 0;
  const matchedThemes = [];
  for (const theme of RWS_THEMES) {
    let ts = 0; const hits = [];
    for (const phrase of theme.terms) {
      const np = normalizeText(phrase);
      if (grantText.includes(np)) { ts += np.includes(' ') ? 6 : 3; hits.push(phrase); }
    }
    if (ts > 0) {
      if (state.filters.theme !== 'all' && theme.id === state.filters.theme) ts += 8;
      themeRaw += ts;
      matchedThemes.push({ id: theme.id, label: theme.label, matches: hits });
    }
  }
  const themeScore = Math.min(40, themeRaw);

  // Phrase score (max 30)
  const phraseResult = scoreImportantPhrases(fields, state.filters.theme);
  const phraseScore  = Math.min(30, phraseResult.phraseScore);

  let score = queryScore + themeScore + phraseScore;

  // Noise penalty
  for (const n of NOISE_TERMS) {
    if (grantText.includes(normalizeText(n))) score -= 10;
  }

  // Reasons
  const reasons = [];
  if (!combined && !matchedThemes.length) reasons.push('Geen zoekterm of themamatch; standaard live call getoond.');
  if (matchedTerms.size > 0) {
    const disp = origMatchedTerms.size > 0 ? Array.from(origMatchedTerms) : Array.from(matchedTerms);
    reasons.push('Zoektermen: ' + disp.slice(0, 6).join(', '));
  }
  if (matchedThemes.length)              reasons.push("Thema's: " + matchedThemes.map(t => t.label).join(', '));
  if (phraseResult.matchedPhrases.length) reasons.push('Sleuteltermen: ' + phraseResult.matchedPhrases.slice(0, 5).join(', '));
  if (fields.title && terms.some(t => fields.title.includes(t))) reasons.push('Match in titel.');

  return {
    score: Math.min(100, Math.max(0, score || 1)),
    queryMatched, origQueryMatched, expandedPhraseMatched,
    matchedTerms: Array.from(matchedTerms),
    origMatchedTerms: Array.from(origMatchedTerms),
    matchedPhrases: phraseResult.matchedPhrases,
    matchedThemes, reasons
  };
}

// ── Saved calls ───────────────────────────────────────────────
function loadSavedCalls() {
  try {
    const ids = JSON.parse(localStorage.getItem(SAVED_CALLS_KEY) || '[]');
    state.savedIds = new Set(Array.isArray(ids) ? ids : []);
  } catch { state.savedIds = new Set(); }
}

function persistSavedCalls() {
  localStorage.setItem(SAVED_CALLS_KEY, JSON.stringify(Array.from(state.savedIds)));
}

const getGrantSaveId = g => String(g.identifier || g.id || '').trim();
const isGrantSaved   = g => { const id = getGrantSaveId(g); return id ? state.savedIds.has(id) : false; };

function toggleSavedGrant(grant) {
  const id = getGrantSaveId(grant);
  if (!id) { console.warn('Ontbrekende identifier', grant); return; }
  state.savedIds.has(id) ? state.savedIds.delete(id) : state.savedIds.add(id);
  persistSavedCalls();
  update();
}

const getSavedGrants = () =>
  state.data?.grants?.filter(g => state.savedIds.has(getGrantSaveId(g))) || [];

function exportSavedCallsCsv() {
  const saved = getSavedGrants();
  if (!saved.length) { alert('Er zijn nog geen bewaarde calls om te exporteren.'); return; }

  const headers = ['identifier','title','programme','status','openingDate','deadlineDate','actionType','budgetEur','expectedGrants','relevanceScore','bureauBrusselThemes','matchedTerms','relevanceReasons','summary','abstract','url'];
  const rows = saved.map(g => [
    g.identifier, g.title, getPrimaryProgramme(g), g.status?.label || '',
    g.startDate || g.plannedOpeningDate || '', g.deadlineDate || '',
    g.actionType || g.kind?.label || '', g.budget?.totalBudgetEur || '',
    g.budget?.expectedGrants || '', g.relevance?.score || '',
    g.relevance?.matchedThemes?.map(t => t.label).join('; ') || '',
    g.relevance?.matchedTerms?.join('; ') || '',
    g.relevance?.reasons?.join('; ') || '',
    g.summary || g.destination || g.callTitle || '', g.abstract || '', g.url
  ].map(escapeCsvValue).join(','));

  const csv = [headers.join(','), ...rows].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a   = Object.assign(document.createElement('a'), {
    href: url,
    download: `rws-eu-call-radar-bewaarde-calls-${new Date().toISOString().slice(0, 10)}.csv`
  });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ── Pipeline ──────────────────────────────────────────────────
function loadPipeline() {
  try { state.pipeline = JSON.parse(localStorage.getItem(PIPELINE_KEY) || '{}'); }
  catch { state.pipeline = {}; }
}

function persistPipeline() {
  localStorage.setItem(PIPELINE_KEY, JSON.stringify(state.pipeline));
}

function setPipelineStage(identifier, stageId) {
  if (stageId === null) { delete state.pipeline[identifier]; }
  else                  { state.pipeline[identifier] = stageId; }
  persistPipeline();
  if (state.activeView === 'pipeline') renderPipeline();
}

function getPipelineGrants() {
  if (!state.data?.grants) return {};
  const out = {};
  for (const stage of PIPELINE_STAGES) out[stage.id] = [];
  for (const [id, stageId] of Object.entries(state.pipeline)) {
    const grant = state.data.grants.find(g => g.identifier === id);
    if (grant && out[stageId]) out[stageId].push(grant);
  }
  return out;
}

function renderPipeline() {
  const view = elements.pipelineView;
  if (!view) return;

  const byStage = getPipelineGrants();
  const total   = Object.values(state.pipeline).length;

  view.innerHTML = `
    <div class="pipeline-header">
      <h2 class="pipeline-title">Call Pipeline</h2>
      <span class="pipeline-meta">${total} call${total !== 1 ? 's' : ''} in de pipeline</span>
      ${total === 0 ? '<p class="pipeline-hint">Voeg calls toe via de Bewaar-knop in de Radar en versleep ze hier door de fases.</p>' : ''}
    </div>
    <div class="pipeline-board">
      ${PIPELINE_STAGES.map(stage => {
        const grants = byStage[stage.id] || [];
        return `
          <div class="pipeline-column" data-stage="${escapeHtml(stage.id)}">
            <div class="pipeline-column__header" style="border-top:3px solid ${stage.color}">
              <span class="pipeline-column__label">${escapeHtml(stage.label)}</span>
              <span class="pipeline-column__count">${grants.length}</span>
            </div>
            <div class="pipeline-column__cards">
              ${grants.length ? grants.map(g => renderPipelineCard(g, stage)).join('') : '<div class="pipeline-empty">Geen calls</div>'}
            </div>
          </div>`;
      }).join('')}
    </div>`;

  // Wire move buttons
  view.querySelectorAll('.pipeline-card__move').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, to } = btn.dataset;
      setPipelineStage(id, to === 'remove' ? null : to);
      renderPipeline();
      renderSavedCallsPanel();
    });
  });
}

function renderPipelineCard(grant, currentStage) {
  const stageIdx = PIPELINE_STAGES.findIndex(s => s.id === currentStage.id);
  const prev     = PIPELINE_STAGES[stageIdx - 1];
  const next     = PIPELINE_STAGES[stageIdx + 1];
  const aiReview = state.aiReviews.get(grant.identifier);
  const score    = aiReview?.aiRelevanceScore ?? grant.relevance?.score ?? 0;
  const sc       = score >= 70 ? 'score-high' : score >= 40 ? 'score-mid' : 'score-low';

  return `
    <div class="pipeline-card">
      <div class="pipeline-card__head">
        <span class="pipeline-card__id">${escapeHtml(grant.identifier)}</span>
        <span class="shortlist-score ${sc}">${score}</span>
      </div>
      <p class="pipeline-card__title">${escapeHtml(grant.title)}</p>
      <p class="pipeline-card__meta">${escapeHtml(getPrimaryProgramme(grant))} &bull; Deadline: ${formatDate(grant.deadlineDate)}</p>
      ${grant.url ? `<a class="pipeline-card__link" href="${grant.url}" target="_blank" rel="noreferrer">Open call</a>` : ''}
      <div class="pipeline-card__actions">
        ${prev ? `<button class="pipeline-card__move ghost-button" data-id="${escapeHtml(grant.identifier)}" data-to="${escapeHtml(prev.id)}" title="Terug naar ${escapeHtml(prev.label)}">&#8592; ${escapeHtml(prev.label)}</button>` : ''}
        ${next ? `<button class="pipeline-card__move ghost-button" data-id="${escapeHtml(grant.identifier)}" data-to="${escapeHtml(next.id)}" title="Door naar ${escapeHtml(next.label)}">${escapeHtml(next.label)} &#8594;</button>` : ''}
        <button class="pipeline-card__move ghost-button pipeline-card__remove" data-id="${escapeHtml(grant.identifier)}" data-to="remove" title="Verwijder uit pipeline">&#10005;</button>
      </div>
    </div>`;
}

// ── Filtering & sorting ───────────────────────────────────────
function filterGrants() {
  const query    = state.filters.query.trim().toLowerCase();
  const idea     = state.filters.projectIdea.trim().toLowerCase();
  const combined = [query, idea].filter(Boolean).join(' ');
  const statusOpt = getStatusOption(state.filters.status);
  const now       = Date.now();
  let cutoff = null;

if (state.filters.recentMonths === '14d') {
  cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
} else {
  const recentMo = state.filters.recentMonths === 'all'
    ? null
    : Number(state.filters.recentMonths);

  cutoff = recentMo && Number.isFinite(recentMo)
    ? subtractMonths(new Date(), recentMo).getTime()
    : null;
}

  state.filtered = state.data.grants
    .filter(grant => {
      if (grant.deadlineDate && new Date(grant.deadlineDate).getTime() < now) return false;
      if (statusOpt.matches && !statusOpt.matches.has(grant.status.id)) return false;
      if (state.filters.programme !== 'all') {
        if (!new Set(grant.frameworkProgrammes.map(p => p.id)).has(state.filters.programme)) return false;
      }
     if (cutoff) {
  const recencyTimes = getGrantRecencyTimes(grant);
  if (recencyTimes.length === 0) return false;
  const hasRecentActivity = recencyTimes.some(time => time >= cutoff && time <= now);
  if (!hasRecentActivity) return false;
}

      // Action type filter
      if (state.filters.actionType !== 'all') {
        const at = normalizeText(grant.actionType || grant.kind?.label || '');
        if (!at.includes(normalizeText(state.filters.actionType))) return false;
      }

      const rel = calculateRelevance(grant, query, idea);
      grant.relevance = rel;

      if (state.filters.theme !== 'all' && !rel.matchedThemes.some(t => t.id === state.filters.theme)) return false;
      if (combined && !rel.origQueryMatched && !rel.expandedPhraseMatched && !rel.matchedPhrases?.length && rel.score < 50) return false;
      return true;
    })
    .sort((a, b) => {
      if (state.aiRerankActive) {
        const as = state.aiReviews.get(a.identifier)?.aiRelevanceScore ?? -1;
        const bs = state.aiReviews.get(b.identifier)?.aiRelevanceScore ?? -1;
        if (as !== -1 && bs !== -1) return bs - as;
        if (as !== -1) return -1;
        if (bs !== -1) return 1;
        return (b.relevance?.score || 0) - (a.relevance?.score || 0);
      }
      switch (state.filters.sort) {
        case 'relevance-desc': return (b.relevance?.score || 0) - (a.relevance?.score || 0);
        case 'deadline-asc':   return new Date(a.deadlineDate || '2999-12-31') - new Date(b.deadlineDate || '2999-12-31');
        case 'budget-desc':    return (b.budget?.totalBudgetEur || 0) - (a.budget?.totalBudgetEur || 0);
        case 'title-asc':      return a.title.localeCompare(b.title);
        default:               return new Date(b.startDate || 0) - new Date(a.startDate || 0);
      }
    });
}

// ── Pagination ────────────────────────────────────────────────
const getTotalPages       = total => Math.ceil(total / state.pagination.pageSize);
const getPaginatedResults = results => results.slice((state.pagination.page - 1) * state.pagination.pageSize, state.pagination.page * state.pagination.pageSize);
const getDisplayResults   = () => getPaginatedResults(state.filtered);
const resetPagination     = () => { state.pagination.page = 1; };

function setPage(page) {
  state.pagination.page = Math.max(1, Math.min(page, getTotalPages(state.filtered.length)));
}

function renderPagination() {
  if (!elements.paginationControls) return;
  const total = state.filtered.length;
  const pages = getTotalPages(total);
  const cur   = state.pagination.page;
  if (pages <= 1) { elements.paginationControls.innerHTML = ''; return; }

  elements.paginationControls.innerHTML = `
    <button type="button" class="pagination__button pagination__button--prev" ${cur === 1 ? 'disabled' : ''} aria-label="Vorige pagina">Vorige</button>
    <span class="pagination__page-info">Pagina ${cur} van ${pages} (${total} resultaten)</span>
    <button type="button" class="pagination__button pagination__button--next" ${cur === pages ? 'disabled' : ''} aria-label="Volgende pagina">Volgende</button>
  `;

  elements.paginationControls.querySelector('.pagination__button--prev')?.addEventListener('click', () => { setPage(cur - 1); renderResults(); renderPagination(); });
  elements.paginationControls.querySelector('.pagination__button--next')?.addEventListener('click', () => { setPage(cur + 1); renderResults(); renderPagination(); });
}

// ── Hash routing ──────────────────────────────────────────────
function parseHash() {
  const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  state.filters.query        = p.get('q')       || '';
  state.filters.projectIdea  = p.get('idea')    || '';
  state.filters.status       = p.get('s')       || 'live';
  state.filters.programme    = p.get('p')       || 'all';
  state.filters.theme        = p.get('theme')   || 'all';
  state.filters.actionType   = p.get('at')      || 'all';
  state.filters.recentMonths = p.get('recent')  || 'all';
  state.filters.sort         = p.get('sort')    || 'relevance-desc';
}

function writeHash() {
  const p = new URLSearchParams();
  if (state.filters.query)                      p.set('q',      state.filters.query);
  if (state.filters.projectIdea)                p.set('idea',   state.filters.projectIdea);
  if (state.filters.status       !== 'live')    p.set('s',      state.filters.status);
  if (state.filters.programme    !== 'all')     p.set('p',      state.filters.programme);
  if (state.filters.theme        !== 'all')     p.set('theme',  state.filters.theme);
  if (state.filters.actionType   !== 'all')     p.set('at',     state.filters.actionType);
  if (state.filters.recentMonths !== 'all')     p.set('recent', state.filters.recentMonths);
  if (state.filters.sort !== 'relevance-desc')  p.set('sort',   state.filters.sort);
  const hash = p.toString();
  history.replaceState(null, '', `${location.pathname}${location.search}${hash ? '#' + hash : ''}`);
}

// ── Render: metrics, sidebar, status pills ────────────────────
function renderMetrics() {
  const open   = state.data.summary.byStatus['31094502'] || 0;
  const wf     = state.data.source?.workflow || null;
  const upd    = wf?.refreshedAt || state.data.generatedAt;
  const srcRaw = state.data.source?.storedResults ?? state.data.source?.totalResults ?? state.data.source?.reportedTotalResults ?? state.data.grants?.length ?? 0;
  const src    = Number.isFinite(Number(srcRaw)) ? Number(srcRaw) : (state.data.grants?.length || 0);

  elements.metricTotal.textContent   = fmtCompact.format(state.data.summary.total);
  elements.metricLive.textContent    = fmtCompact.format(open);
  elements.metricBudget.textContent  = formatCurrency(state.data.summary.knownBudgetEur);
  elements.lastUpdated.textContent   = formatStamp(upd);
  elements.lastUpdated.title         = wf?.workflowName ? `Open ${wf.workflowName} run` : 'Last refresh timestamp';
  if (wf?.runUrl) elements.lastUpdated.href = wf.runUrl;
  else elements.lastUpdated.removeAttribute('href');
  elements.sourceCount.textContent   = `${fmtCompact.format(src)} current calls from the official EU index`;
}

function renderSidebar() {
  elements.topProgrammes.innerHTML = '';
  const programmes = state.data.facets.frameworkProgramme.slice(0, 6);
  if (!programmes.length) {
    const el = document.createElement('div');
    el.className = 'mini-list__item'; el.textContent = 'No programme filters available.';
    elements.topProgrammes.appendChild(el); return;
  }
  for (const prog of programmes) {
    const btn = document.createElement('button');
    btn.className = `mini-filter${state.filters.programme === prog.rawValue ? ' is-active' : ''}`;
    btn.type = 'button';
    btn.innerHTML = `<span class="mini-filter__title">${escapeHtml(prog.value)}</span><span class="mini-filter__meta">${fmtCompact.format(prog.count)} calls</span>`;
    btn.addEventListener('click', () => toggleProgrammeFilter(prog.rawValue));
    elements.topProgrammes.appendChild(btn);
  }
}

function renderStatusPills() {
  elements.statusPills.innerHTML = '';
  const counts = state.data.summary.byStatus;
  for (const opt of STATUS_OPTIONS) {
    const count = opt.id === 'live' ? state.data.summary.total : (counts[opt.id] || 0);
    const btn = document.createElement('button');
    btn.className = `status-pill${state.filters.status === opt.id ? ' is-active' : ''}`;
    btn.type = 'button';
    btn.textContent = `${opt.label} (${fmtCompact.format(count)})`;
    btn.addEventListener('click', () => { state.filters.status = opt.id; resetPagination(); syncControls(); update(); });
    elements.statusPills.appendChild(btn);
  }
}

function renderProgrammeOptions() {
  const opt = document.createElement('option');
  opt.value = 'all'; opt.textContent = 'All programmes';
  elements.programmeSelect.appendChild(opt);
  for (const prog of state.data.facets.frameworkProgramme) {
    const o = document.createElement('option');
    o.value = prog.rawValue;
    o.textContent = `${prog.value} (${fmtCompact.format(prog.count)})`;
    elements.programmeSelect.appendChild(o);
  }
}

function renderActionTypeOptions() {
  if (!elements.actionTypeSelect) return;
  const types = [...new Set(
    state.data.grants.map(g => g.actionType || g.kind?.label || '').filter(Boolean)
  )].sort();
  const frag = document.createDocumentFragment();
  const allOpt = document.createElement('option');
  allOpt.value = 'all'; allOpt.textContent = 'All action types';
  frag.appendChild(allOpt);
  for (const t of types) {
    const o = document.createElement('option');
    o.value = t; o.textContent = t;
    frag.appendChild(o);
  }
  elements.actionTypeSelect.appendChild(frag);
}

function toggleProgrammeFilter(id) {
  state.filters.programme = state.filters.programme === id ? 'all' : id;
  resetPagination(); syncControls(); update();
}

// ── Render: results ───────────────────────────────────────────
function renderResults() {
  const visible = getDisplayResults();
  elements.resultsList.innerHTML = '';
  elements.resultsCount.textContent    = `${fmtCompact.format(state.filtered.length)} matches`;
  elements.resultsHeadline.textContent = state.filtered.length
    ? `${fmtCompact.format(state.filtered.length)} grants in view`
    : 'No grants match the current filters';
  if (elements.loadMoreButton) elements.loadMoreButton.hidden = true;

  if (!visible.length) {
    const el = document.createElement('div');
    el.className = 'empty-state'; el.textContent = 'Try a broader search or a different programme.';
    elements.resultsList.appendChild(el); return;
  }

  const frag = document.createDocumentFragment();
  for (const grant of visible) {
    const card      = elements.grantCardTemplate.content.firstElementChild.cloneNode(true);
    const statusChip= card.querySelector('.status-chip');
    const idEl      = card.querySelector('.grant-card__id');
    const topLine   = card.querySelector('.grant-card__topline');
    const titleBtn  = card.querySelector('.grant-card__title-button');
    const legacyLink= card.querySelector('.grant-card__title a');
    const openLink  = card.querySelector('.grant-card__open-link');
    const summary   = card.querySelector('.grant-card__summary');
    const drawer    = card.querySelector('.grant-card__drawer');
    const dSummary  = card.querySelector('.grant-card__drawer-summary');
    const dAbstract = card.querySelector('.grant-card__drawer-abstract');
    const dAbsBlock = card.querySelector('.grant-card__drawer-block--abstract');
    const facts     = card.querySelector('.grant-card__facts');

    statusChip.dataset.status = grant.status.id;
    statusChip.textContent    = grant.status.label;
    idEl.textContent          = grant.identifier;
    if (titleBtn)   { titleBtn.textContent = grant.title; titleBtn.setAttribute('aria-expanded', 'false'); }
    if (legacyLink) { legacyLink.textContent = grant.title; legacyLink.href = grant.url; }
    if (openLink)   openLink.href = grant.url;

    const sumText = grant.destination || grant.callTitle || grant.summary || '';
    summary.textContent = sumText || 'No destination summary available.';
    if (dSummary) dSummary.textContent = sumText || 'No short summary was exposed for this call.';
    if (dAbstract && dAbsBlock) { dAbstract.textContent = grant.abstract || ''; dAbsBlock.hidden = !grant.abstract; }

    if (titleBtn && drawer) {
      titleBtn.addEventListener('click', () => {
        const open = !drawer.hidden;
        drawer.hidden = open;
        card.classList.toggle('is-expanded', !open);
        titleBtn.setAttribute('aria-expanded', String(!open));
      });
    }

    facts.innerHTML = [
      createFact('Relevance',           grant.relevance?.score ? String(grant.relevance.score) : 'Not scored'),
      createFact('Bureau Brussel-thema', grant.relevance?.matchedThemes?.map(t => t.label).join(', ') || 'Geen directe themamatch'),
      createFact('Programme',           getPrimaryProgramme(grant)),
      createFact('Opening',             formatDate(grant.startDate || grant.plannedOpeningDate)),
      createFact('Deadline',            formatDate(grant.deadlineDate)),
      createFact('Action',              grant.actionType || grant.kind.label),
      createFact('Budget',              formatCurrency(grant.budget?.totalBudgetEur)),
      createFact('Expected grants',     grant.budget?.expectedGrants ? fmtCompact.format(grant.budget.expectedGrants) : 'Unknown')
    ].join('');

    // Waarom gevonden
    card.querySelector('.grant-card__relevance')?.remove();
    const relBlock = document.createElement('div');
    relBlock.className = 'grant-card__relevance';
    const reasons  = grant.relevance?.reasons || [];
    const mTerms   = grant.relevance?.matchedTerms || [];
    relBlock.innerHTML =
      '<p class="grant-card__relevance-title">Waarom gevonden</p>' +
      (reasons.length ? '<ul>' + reasons.map(r => '<li>' + escapeHtml(r) + '</li>').join('') + '</ul>' : '<p>Geen specifieke matchuitleg beschikbaar.</p>') +
      (mTerms.length  ? '<p class="grant-card__matched-terms">Zoektermen: ' + escapeHtml(mTerms.slice(0, 12).join(', ')) + '</p>' : '');
    facts.insertAdjacentElement('afterend', relBlock);

    // AI batch review block
    const aiReview = state.aiReviews.get(grant.identifier);
    if (aiReview) {
      const aiScore    = aiReview.aiRelevanceScore ?? 0;
      const pfScore    = aiReview.projectFitScore ?? 0;
      const scoreCls   = aiScore >= 61 ? 'ai-score--high' : aiScore >= 41 ? 'ai-score--mid' : 'ai-score--low';
      const pfCls      = pfScore >= 61 ? 'ai-score--high' : pfScore >= 41 ? 'ai-score--mid' : 'ai-score--low';
      const aiBlock    = document.createElement('div');
      aiBlock.className = 'grant-card__ai-review';
      aiBlock.innerHTML =
        '<div class="grant-card__ai-scores">' +
          '<div class="grant-card__ai-score-item">' +
            '<span class="grant-card__ai-score-label">AI-analyse RWS</span>' +
            '<span class="ai-score ' + scoreCls + '">' + escapeHtml(String(aiScore)) + '/100</span>' +
          '</div>' +
          '<div class="grant-card__ai-score-item">' +
            '<span class="grant-card__ai-score-label">Projectfit</span>' +
            '<span class="ai-score ' + pfCls + '">' + escapeHtml(String(pfScore)) + '/100</span>' +
          '</div>' +
        '</div>' +
        (aiReview.projectFit ? '<p><strong>Projectfit:</strong> ' + escapeHtml(aiReview.projectFit) + '</p>' : '') +
        '<p>' + escapeHtml(aiReview.rationale || 'Geen toelichting beschikbaar.') + '</p>' +
        '<dl class="grant-card__facts" style="margin-top:.5rem">' +
          (aiReview.theme            ? '<div><dt>Thema\'s</dt><dd>'      + escapeHtml(aiReview.theme)            + '</dd></div>' : '') +
          (aiReview.possibleRwsRole  ? '<div><dt>RWS-rol</dt><dd>'       + escapeHtml(aiReview.possibleRwsRole)  + '</dd></div>' : '') +
          (aiReview.uncertainties    ? '<div><dt>Onzekerheden</dt><dd>'  + escapeHtml(aiReview.uncertainties)    + '</dd></div>' : '') +
          (aiReview.recommendedNextStep ? '<div><dt>Volgende stap</dt><dd>' + escapeHtml(aiReview.recommendedNextStep) + '</dd></div>' : '') +
          (aiReview.ragMatchedItems?.length ? '<div><dt>RAG-context</dt><dd>' + escapeHtml(aiReview.ragMatchedItems.join(', ')) + '</dd></div>' : '') +
        '</dl>';
      relBlock.insertAdjacentElement('afterend', aiBlock);
    }

    // Per-card AI knop
    const aiBtn = document.createElement('button');
    aiBtn.className = 'ghost-button grant-card__ai-button';
    aiBtn.type = 'button';
    aiBtn.textContent = AI_CACHE.has(grant.identifier) ? 'AI-score bekijken' : 'Analyseer met AI';
    aiBtn.onclick = async () => {
      aiBtn.textContent = 'Analyseren…'; aiBtn.disabled = true;
      const result = await scoreGrantWithAI(grant);
      if (result) {
        let aiBlock = card.querySelector('.grant-card__ai-result');
        if (!aiBlock) {
          aiBlock = document.createElement('div');
          aiBlock.className = 'grant-card__ai-result';
          facts.insertAdjacentElement('afterend', aiBlock);
        }
        aiBlock.innerHTML = '<p class="grant-card__relevance-title">AI-analyse voor RWS</p>' +
          '<p><strong>Score: ' + result.score + '/100</strong> &mdash; Thema: ' + escapeHtml(result.thema) + '</p>' +
          '<p>' + escapeHtml(result.uitleg) + '</p>';
        aiBtn.textContent = 'AI: ' + result.score + '/100';
      } else { aiBtn.textContent = 'Analyseer met AI'; aiBtn.disabled = false; }
    };
    if (topLine) topLine.appendChild(aiBtn);

    // Bewaar knop
    const saveBtn = document.createElement('button');
    saveBtn.className = 'ghost-button grant-card__save-button';
    saveBtn.type = 'button';
    saveBtn.textContent = isGrantSaved(grant) ? 'Bewaard' : 'Bewaar';
    saveBtn.setAttribute('aria-label', isGrantSaved(grant) ? 'Verwijder call uit bewaarde calls' : 'Bewaar call');
    saveBtn.onclick = e => { e.preventDefault(); e.stopPropagation(); toggleSavedGrant(grant); };
    if (topLine) topLine.appendChild(saveBtn);

    // Pipeline knop (in huidige stage of toevoegen)
    const pipelineStageId = state.pipeline[grant.identifier];
    const pipelineStage   = PIPELINE_STAGES.find(s => s.id === pipelineStageId);
    const pipelineBtn     = document.createElement('button');
    pipelineBtn.className = 'ghost-button grant-card__pipeline-button';
    pipelineBtn.type = 'button';
    pipelineBtn.textContent = pipelineStage ? `Pipeline: ${pipelineStage.label}` : '+ Pipeline';
    pipelineBtn.title = pipelineStage ? 'In pipeline: ' + pipelineStage.label : 'Voeg toe aan pipeline';
    pipelineBtn.onclick = () => {
      if (pipelineStage) {
        const next = PIPELINE_STAGES[PIPELINE_STAGES.findIndex(s => s.id === pipelineStageId) + 1];
        if (next) { setPipelineStage(grant.identifier, next.id); pipelineBtn.textContent = 'Pipeline: ' + next.label; }
        else      { setPipelineStage(grant.identifier, null);    pipelineBtn.textContent = '+ Pipeline'; }
      } else {
        setPipelineStage(grant.identifier, PIPELINE_STAGES[0].id);
        pipelineBtn.textContent = 'Pipeline: ' + PIPELINE_STAGES[0].label;
      }
    };
    if (topLine) topLine.appendChild(pipelineBtn);

    frag.appendChild(card);
  }
  elements.resultsList.appendChild(frag);
}

// ── Render: saved calls panel ─────────────────────────────────
function renderSavedCallsPanel() {
  const saved = getSavedGrants();
  const count = saved.length;

  if (elements.savedCallsCount) {
    elements.savedCallsCount.textContent = count === 1 ? '1 bewaarde call' : `${count} bewaarde calls`;
  }

  if (elements.savedCallsList) {
    elements.savedCallsList.innerHTML = '';
    if (!saved.length) {
      const p = document.createElement('p');
      p.className = 'sidebar__copy'; p.textContent = 'Nog geen calls bewaard.';
      elements.savedCallsList.appendChild(p);
    } else {
      const visible = saved.slice(0, 12);
      for (const g of visible) {
        const item  = document.createElement('div');
        item.className = 'saved-call-item';
        const wrap  = document.createElement('div');
        wrap.className = 'saved-call-text';
        const link  = Object.assign(document.createElement('a'), {
          className: 'saved-call-link', href: g.url, target: '_blank', rel: 'noreferrer',
          textContent: g.title || g.identifier, title: g.title || g.identifier
        });
        const meta  = Object.assign(document.createElement('span'), {
          className: 'saved-call-link__meta', textContent: g.identifier, title: g.identifier
        });
        wrap.append(link, meta);
        const rmBtn = document.createElement('button');
        rmBtn.className = 'saved-call-remove-button'; rmBtn.type = 'button';
        rmBtn.title = 'Verwijder uit bewaarde calls'; rmBtn.textContent = '\xD7';
        rmBtn.setAttribute('aria-label', `Verwijder ${g.identifier} uit bewaarde calls`);
        rmBtn.addEventListener('click', () => { state.savedIds.delete(getGrantSaveId(g)); persistSavedCalls(); update(); });
        item.append(wrap, rmBtn);
        elements.savedCallsList.appendChild(item);
      }
      if (saved.length > visible.length) {
        const p = document.createElement('p');
        p.className = 'sidebar__copy'; p.textContent = `+ ${saved.length - visible.length} meer in export.`;
        elements.savedCallsList.appendChild(p);
      }
    }
  }

  if (elements.exportSavedButton) elements.exportSavedButton.disabled = count === 0;
  if (elements.clearSavedButton)  elements.clearSavedButton.disabled  = count === 0;

  const aiRevBtn = document.querySelector('#ai-review-button');
  if (aiRevBtn) { aiRevBtn.hidden = !AI_API_URL || count === 0; aiRevBtn.disabled = count === 0; }
}

// ── Render: views ─────────────────────────────────────────────
function switchView(name) {
  state.activeView = name;
  ['radar','shortlist','pipeline'].forEach(v => {
    const tabKey  = 'tab' + v.charAt(0).toUpperCase() + v.slice(1);
    const viewKey = v + 'View';
    elements[tabKey]?.classList.toggle('is-active', v === name);
    if (elements[viewKey]) elements[viewKey].hidden = v !== name;
  });
  if (name === 'shortlist') renderAiShortlist();
  if (name === 'pipeline')  renderPipeline();
}

function renderViewTabs() {
  elements.tabRadar?.addEventListener('click',     () => switchView('radar'));
  elements.tabShortlist?.addEventListener('click', () => switchView('shortlist'));
  elements.tabPipeline?.addEventListener('click',  () => switchView('pipeline'));
}

const getCallByIdentifier = id => state.data?.grants?.find(g => g.identifier === id) || null;

// ── Render: AI shortlist view ─────────────────────────────────
function renderAiShortlist() {
  const container = document.querySelector('#shortlist-content');
  if (!container) return;

  // FIX: sort on aiRelevanceScore, not .score
  const sorted = Array.from(state.aiReviews.values()).sort((a, b) => (b.aiRelevanceScore ?? 0) - (a.aiRelevanceScore ?? 0));
  if (!sorted.length) { container.innerHTML = '<p>Draai eerst een AI-analyse in de Radar-tab.</p>'; return; }

  const top3   = sorted.slice(0, 3);
  const others = sorted.slice(3);
  let html = '';

  if (state.aiSummary) {
    const s = state.aiSummary;
    html +=
      '<div class="shortlist-summary">' +
        '<div class="shortlist-summary__section"><h4>Kernbeeld</h4><p>' + escapeHtml(s.executiveSummary || 'Geen kernbeeld beschikbaar.') + '</p></div>' +
        '<div class="shortlist-summary__section"><h4>Advies</h4><p class="shortlist-summary__advice">' + escapeHtml(s.overallAdvice || 'Geen advies beschikbaar.') + '</p></div>' +
        '<div class="shortlist-summary__section"><h4>Kansrijke lijnen</h4><div class="shortlist-opportunities">' +
          (s.topOpportunities?.length
            ? s.topOpportunities.slice(0, 5).map((o, i) =>
                '<div class="shortlist-opportunity">' +
                  '<span class="shortlist-opportunity__rank">#' + (i + 1) + '</span>' +
                  '<span class="shortlist-opportunity__title">' + escapeHtml(o.title || o.identifier || 'Onbekend') + '</span>' +
                  (o.score ? '<span class="shortlist-opportunity__score">' + escapeHtml(String(o.score)) + '/100</span>' : '') +
                '</div>').join('')
            : '<p>Geen kansrijke lijnen.</p>') +
        '</div></div>' +
        '<div class="shortlist-summary__section"><h4>Aandachtspunten</h4><p>' + escapeHtml(s.notableExclusions || 'Geen aandachtspunten.') + '</p></div>' +
        '<div class="shortlist-summary__section"><h4>Vervolgstappen</h4><ul class="shortlist-steps">' +
          (s.recommendedNextSteps?.length
            ? s.recommendedNextSteps.map(st => '<li>' + escapeHtml(st) + '</li>').join('')
            : '<li>Geen vervolgstappen.</li>') +
        '</ul></div>' +
      '</div>';
  }

  html += '<h3 class="shortlist-section-title">Top 3 kansrijke calls</h3><div class="shortlist-top3">';
  for (const r of top3) {
    const call  = getCallByIdentifier(r.identifier);
    const sc    = r.aiRelevanceScore >= 70 ? 'score-high' : r.aiRelevanceScore >= 40 ? 'score-mid' : 'score-low';
    const rwsTxt = r.projectFit
      ? r.projectFit + (r.possibleRwsRole ? ' \u2014 ' + r.possibleRwsRole : '') + (r.rationale ? '. ' + r.rationale : '')
      : 'Nog te concretiseren op basis van de offici\xEBle calltekst.';
    html +=
      '<article class="shortlist-top3__call">' +
        '<div class="shortlist-top3__header">' +
          '<h4 class="shortlist-top3__title">' + escapeHtml(call?.title || r.identifier) + '</h4>' +
          '<span class="shortlist-top3__id">' + escapeHtml(r.identifier) + '</span>' +
          '<span class="shortlist-score ' + sc + '">' + (r.aiRelevanceScore ?? 0) + '/100</span>' +
        '</div>' +
        '<div class="shortlist-top3__body">' +
          '<div class="shortlist-top3__block"><dt>Projectfit</dt><dd>' + escapeHtml(r.projectFit || 'Niet gespecificeerd') + (r.projectFitScore ? ' <span class="shortlist-score score-mid">' + r.projectFitScore + '/100</span>' : '') + '</dd></div>' +
          '<div class="shortlist-top3__block"><dt>Motivatie</dt><dd>' + escapeHtml(r.rationale || 'Geen motivatie beschikbaar.') + '</dd></div>' +
          '<div class="shortlist-top3__block"><dt>RWS-rol</dt><dd>' + escapeHtml(r.possibleRwsRole || 'Niet gespecificeerd') + '</dd></div>' +
          '<div class="shortlist-top3__block"><dt>Onzekerheden</dt><dd>' + escapeHtml(r.uncertainties || 'Geen onzekerheden gemeld.') + '</dd></div>' +
          '<div class="shortlist-top3__block"><dt>Volgende stap</dt><dd>' + escapeHtml(r.recommendedNextStep || 'Niet gespecificeerd') + '</dd></div>' +
          '<div class="shortlist-top3__block shortlist-top3__block--rws"><dt>Mogelijk RWS-project</dt><dd>' + escapeHtml(rwsTxt) + '</dd></div>' +
        '</div>' +
        (call?.url ? '<a class="shortlist-top3__open" href="' + call.url + '" target="_blank" rel="noreferrer">Open call</a>' : '') +
      '</article>';
  }
  html += '</div>';

  if (others.length) {
    html += '<h3 class="shortlist-section-title">Overige geanalyseerde calls</h3><div class="shortlist-others">';
    for (const r of others) {
      const call = getCallByIdentifier(r.identifier);
      const sc   = r.aiRelevanceScore >= 70 ? 'score-high' : r.aiRelevanceScore >= 40 ? 'score-mid' : 'score-low';
      const unc  = r.uncertainties ? escapeHtml(r.uncertainties.slice(0, 60) + (r.uncertainties.length > 60 ? '\u2026' : '')) : 'Geen';
      html +=
        '<article class="shortlist-others__call">' +
          '<div class="shortlist-others__header"><h5 class="shortlist-others__title">' + escapeHtml(call?.title || r.identifier) + '</h5>' +
          '<span class="shortlist-score ' + sc + '">' + (r.aiRelevanceScore ?? 0) + '/100</span></div>' +
          '<p class="shortlist-others__fit">' + escapeHtml(r.projectFit || 'Geen projectfit beschikbaar') + '</p>' +
          '<p class="shortlist-others__uncertainty">\u26A0 ' + unc + '</p>' +
          (call?.url ? '<a class="shortlist-others__open" href="' + call.url + '" target="_blank" rel="noreferrer">Open call</a>' : '') +
        '</article>';
    }
    html += '</div>';
  }

  container.innerHTML = html;
}

// ── Render: AI briefing panel (geen ragContextUsed) ───────────
function renderAiBriefing() {
  const panel = elements.aiBriefingPanel;
  if (!panel) return;
  if (!state.aiSummary) { panel.hidden = true; return; }
  panel.hidden = false;
  const s = state.aiSummary;

  panel.innerHTML =
    '<div class="ai-briefing__header">' +
      '<h3 class="ai-briefing__title">AI Shortlist Briefing</h3>' +
      '<span class="ai-briefing__badge">Management Samenvatting</span>' +
    '</div>' +
    '<div class="ai-briefing__content">' +
      '<section class="ai-briefing__section"><h4>Executive Summary</h4><p class="ai-briefing__text">' + escapeHtml(s.executiveSummary || 'Geen samenvatting beschikbaar.') + '</p></section>' +
      '<section class="ai-briefing__section"><h4>Overall Advice</h4><p class="ai-briefing__text ai-briefing__text--advice">' + escapeHtml(s.overallAdvice || 'Geen advies beschikbaar.') + '</p></section>' +
      '<section class="ai-briefing__section"><h4>Top 3 Opportunities</h4><div class="ai-briefing__opportunities">' +
        (s.topOpportunities?.length
          ? s.topOpportunities.slice(0, 3).map((o, i) =>
              '<div class="ai-briefing__opportunity">' +
                '<span class="ai-briefing__opportunity-rank">#' + (i + 1) + '</span>' +
                '<div class="ai-briefing__opportunity-content">' +
                  '<strong class="ai-briefing__opportunity-title">' + escapeHtml(o.title || o.identifier || 'Onbekend') + '</strong>' +
                  '<p class="ai-briefing__opportunity-rationale">' + escapeHtml(o.rationale || '') + '</p>' +
                  '<span class="ai-briefing__opportunity-score">Score: ' + (o.score || 'N/A') + '/100</span>' +
                '</div>' +
              '</div>').join('')
          : '<p class="ai-briefing__text">Geen top opportuniteiten.</p>') +
      '</div></section>' +
      '<section class="ai-briefing__section"><h4>Notable Exclusions</h4><p class="ai-briefing__text">' + escapeHtml(s.notableExclusions || 'Geen exclusies.') + '</p></section>' +
      '<section class="ai-briefing__section"><h4>Recommended Next Steps</h4><ul class="ai-briefing__steps">' +
        (s.recommendedNextSteps?.length
          ? s.recommendedNextSteps.map(st => '<li class="ai-briefing__step">' + escapeHtml(st) + '</li>').join('')
          : '<li class="ai-briefing__step">Geen stappen beschikbaar.</li>') +
      '</ul></section>' +
    '</div>';
}

// ── Render: AI results list ───────────────────────────────────
function renderAiResults() {
  const panel = document.querySelector('#ai-results-panel');
  if (!panel) return;
  if (!state.aiReviews.size) { panel.hidden = true; return; }
  panel.hidden = false;
  const list = panel.querySelector('#ai-results-list');
  if (!list) return;
  list.innerHTML = '';

  const sorted = Array.from(state.aiReviews.values()).sort((a, b) => (b.aiRelevanceScore ?? 0) - (a.aiRelevanceScore ?? 0));
  for (const r of sorted) {
    const aiScore = r.aiRelevanceScore ?? 0;
    const sc = aiScore >= 70 ? 'ai-score--high' : aiScore >= 40 ? 'ai-score--mid' : 'ai-score--low';
    const item = document.createElement('div');
    item.className = 'ai-review-item';
    item.innerHTML =
      '<div class="ai-review-item__header">' +
        '<span class="ai-score ' + sc + '">' + escapeHtml(String(aiScore)) + '/100</span>' +
        '<strong class="ai-review-item__id">' + escapeHtml(r.identifier || 'Onbekende call') + '</strong>' +
      '</div>' +
      '<p class="ai-review-item__project-fit"><strong>Projectfit:</strong> ' + escapeHtml(r.projectFit || 'Geen projectfit.') +
        (r.projectFitScore ? ' <span class="ai-score ai-score--mid">' + escapeHtml(String(r.projectFitScore)) + '/100</span>' : '') + '</p>' +
      '<p class="ai-review-item__rationale">' + escapeHtml(r.rationale || 'Geen toelichting.') + '</p>' +
      '<dl class="ai-review-item__facts">' +
        '<div><dt>RWS-rol</dt><dd>'       + escapeHtml(r.possibleRwsRole  || 'Niet gespecificeerd') + '</dd></div>' +
        '<div><dt>Onzekerheden</dt><dd>'  + escapeHtml(r.uncertainties    || 'Niet gespecificeerd') + '</dd></div>' +
        '<div><dt>Volgende stap</dt><dd>' + escapeHtml(r.recommendedNextStep || 'Niet gespecificeerd') + '</dd></div>' +
        '<div><dt>Thema</dt><dd>'         + escapeHtml(r.theme             || 'Niet gespecificeerd') + '</dd></div>' +
      '</dl>';
    list.appendChild(item);
  }
}

// ── AI normalisation ──────────────────────────────────────────
function normalizeAiReviewForDisplay(review) {
  // Only use aiRelevanceScore — no fallbacks to score / relevanceScore / local scores
  const score    = review.aiRelevanceScore != null ? Number(review.aiRelevanceScore) : 0;
  const themeRaw = review.themeFit ?? review.theme ?? review.thema ?? review.bureauBrusselTheme ?? review.selectedTheme ?? '';
  return {
    identifier:          review.identifier || review.callId || '',
    score,
    aiRelevanceScore:    score,
    projectFit:          review.projectFit || review.project_fit || review.projectMatch || '',
    projectFitScore:     Number(review.projectFitScore ?? review.project_fit_score ?? review.projectMatchScore ?? 0),
    theme:               Array.isArray(themeRaw) ? themeRaw.join(', ') : String(themeRaw || ''),
    rationale:           review.rationale || review.uitleg || review.explanation || '',
    possibleRwsRole:     review.possibleRwsRole || review.possibleRWSRole || review.rwsRole || review.rws_role || '',
    uncertainties:       review.uncertainties || review.onzekerheden || '',
    recommendedNextStep: review.recommendedNextStep || review.nextStep || review.next_step || '',
    ragMatchedItems:     Array.isArray(review.ragMatchedItems) ? review.ragMatchedItems : []
  };
}

// ── AI: per-card scoring ──────────────────────────────────────
const AI_CACHE = new Map();

async function scoreGrantWithAI(grant) {
  if (!AI_API_URL) { alert('AI-backend nog niet geconfigureerd. Test AI via de Vercel-site.'); return null; }
  if (AI_CACHE.has(grant.identifier)) return AI_CACHE.get(grant.identifier);

  const payload = {
    projectIdea:   state.filters.projectIdea,
    keywords:      state.filters.query,
    selectedTheme: state.filters.theme === 'all' ? '' : state.filters.theme,
    calls: [{
      identifier:          grant.identifier,
      title:               grant.title,
      programme:           getPrimaryProgramme(grant),
      destination:         grant.destination || '',
      summary:             grant.summary || '',
      abstract:            grant.abstract || '',
      actionType:          grant.actionType || grant.kind?.label || '',
      frameworkProgrammes: grant.frameworkProgrammes?.map(p => p.label) || [],
      programmeDivisions:  grant.programmeDivisions?.map(d => d.label) || [],
      matchedThemes:       grant.relevance?.matchedThemes?.map(t => t.label) || [],
      matchedTerms:        grant.relevance?.matchedTerms || []
    }]
  };

  try {
    const res = await fetch(AI_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(await res.text() || `AI-backend fout: ${res.status}`);
    const data   = await res.json();
    const review = data.reviews?.[0] || (Array.isArray(data) ? data[0] : null) || data;

    // FIX: only use aiRelevanceScore — no fallback to review.score or review.relevanceScore
    const themeV = review.themeFit || review.thema || review.theme || review.bureauBrusselTheme || review.selectedTheme || '';
    const result = {
      score:               review.aiRelevanceScore != null ? Number(review.aiRelevanceScore) : 0,
      uitleg:              review.rationale ?? review.uitleg ?? review.explanation ?? '',
      thema:               Array.isArray(themeV) ? themeV.join(', ') : themeV,
      possibleRwsRole:     review.possibleRwsRole ?? review.rwsRole ?? '',
      uncertainties:       review.uncertainties ?? review.onzekerheden ?? '',
      recommendedNextStep: review.recommendedNextStep ?? review.nextStep ?? ''
    };
    AI_CACHE.set(grant.identifier, result);
    return result;
  } catch (err) {
    console.error('AI-analyse mislukt:', err);
    alert(`AI-analyse mislukt: ${err.message}`);
    return null;
  }
}

// ── AI: batch top-10 reranking ────────────────────────────────
// Note: uses state.filtered.slice(0,10) — intentionally takes the top 10
// of ALL filtered results (not just the current page) for best analysis coverage.
function toAiCallPayload(grant) {
  return {
    identifier:          grant.identifier,
    title:               grant.title,
    programme:           getPrimaryProgramme(grant),
    destination:         grant.destination || '',
    summary:             grant.summary || '',
    abstract:            String(grant.abstract || '').slice(0, 2500),
    actionType:          grant.actionType || grant.kind?.label || '',
    frameworkProgrammes: grant.frameworkProgrammes?.map(p => p.label) || [],
    programmeDivisions:  grant.programmeDivisions?.map(d => d.label) || [],
    matchedThemes: grant.relevance?.matchedThemes?.map(t => t.label) || [],
    matchedTerms:  grant.relevance?.matchedTerms || []
  };
}

async function scoreTopResultsWithAI() {
  if (!AI_API_URL) { alert('AI_API_URL is niet ingesteld. Zorg dat de Vercel-backend actief is.'); return; }
  const candidates = state.filtered.slice(0, 10);
  if (!candidates.length) { alert('Geen resultaten om te analyseren. Pas je filters aan.'); return; }

  const btn      = document.querySelector('#ai-rerank-button');
  const statusEl = document.querySelector('#ai-rerank-status');
  if (btn)      { btn.disabled = true; btn.textContent = 'Analyseren\u2026'; }
  if (statusEl) { statusEl.textContent = `Top ${candidates.length} calls worden beoordeeld\u2026`; statusEl.hidden = false; }

  const payload = {
    projectIdea:   state.filters.projectIdea,
    keywords:      state.filters.query,
    selectedTheme: state.filters.theme !== 'all' ? state.filters.theme : '',
    calls:         candidates.map(toAiCallPayload)
  };

  try {
    const res = await fetch(AI_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Backend-fout ${res.status}`); }
    const data    = await res.json();
    const reviews = data.reviews || [];
    if (!reviews.length) throw new Error('Geen beoordelingen ontvangen.');

    for (const r of reviews) {
      const norm = normalizeAiReviewForDisplay(r);
      state.aiReviews.set(norm.identifier, norm);
    }
    state.aiSummary      = data.summary || null;
    state.aiRerankActive = true;

    // Sort: AI-scored calls first (desc aiRelevanceScore), rest below
    state.filtered.sort((a, b) => {
      const as = state.aiReviews.get(a.identifier)?.aiRelevanceScore ?? -1;
      const bs = state.aiReviews.get(b.identifier)?.aiRelevanceScore ?? -1;
      if (as !== -1 && bs !== -1) return bs - as;
      if (as !== -1) return -1;
      if (bs !== -1) return 1;
      return (b.relevance?.score || 0) - (a.relevance?.score || 0);
    });

    if (statusEl) statusEl.textContent = `${reviews.length} calls beoordeeld door AI \u2014 gesorteerd op AI-relevantie.`;
    if (btn)      { btn.textContent = 'Heranalyseer'; btn.disabled = false; }

    renderAiBriefing();
    renderResults();
  } catch (err) {
    console.error('AI-reranking mislukt:', err);
    if (statusEl) statusEl.textContent = `Analyse mislukt: ${err.message}`;
    if (btn)      { btn.textContent = 'AI analyseer top 10'; btn.disabled = false; }
  }
}

// ── AI: saved-calls review ────────────────────────────────────
async function runAiReview() {
  const saved = getSavedGrants();
  if (!saved.length) return;
  if (!AI_API_URL) { alert('AI-backend nog niet geconfigureerd. Test AI via de Vercel-site.'); return; }

  const aiRevBtn = document.querySelector('#ai-review-button');
  if (aiRevBtn) { aiRevBtn.disabled = true; aiRevBtn.textContent = 'Analyseren...'; }

  const payload = {
    projectIdea:   state.filters.projectIdea,
    keywords:      state.filters.query,
    selectedTheme: state.filters.theme !== 'all' ? state.filters.theme : '',
    calls: saved.slice(0, 10).map(g => ({
      identifier:          g.identifier,
      title:               g.title,
      programme:           getPrimaryProgramme(g),
      destination:         g.destination || '',
      summary:             g.summary || '',
      abstract:            String(g.abstract || '').slice(0, 2500),
      actionType:          g.actionType || g.kind?.label || '',
      budget:              g.budget?.totalBudgetEur || null,
      deadline:            g.deadlineDate || null,
      matchedThemes:       g.relevance?.matchedThemes?.map(t => t.label) || [],
      matchedTerms:        g.relevance?.matchedTerms || []
    }))
  };

  try {
    const res = await fetch(AI_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Backend-fout ${res.status}`); }
    const data = await res.json();
    for (const r of data.reviews || []) {
      const norm = normalizeAiReviewForDisplay(r);
      state.aiReviews.set(norm.identifier, norm);
    }
    renderAiResults();
    renderResults();
  } catch (err) {
    console.error('AI-review mislukt:', err);
    alert(`AI-review mislukt: ${err.message}`);
  } finally {
    if (aiRevBtn) { aiRevBtn.disabled = false; aiRevBtn.textContent = 'Beoordeel met AI'; }
  }
}

// ── Controls sync & update cycle ─────────────────────────────
function syncControls() {
  elements.projectInput.value    = state.filters.projectIdea;
  elements.searchInput.value     = state.filters.query;
  elements.programmeSelect.value = state.filters.programme;
  elements.themeSelect.value     = state.filters.theme;
  elements.recentSelect.value    = state.filters.recentMonths;
  elements.sortSelect.value      = state.filters.sort;
  if (elements.actionTypeSelect) elements.actionTypeSelect.value = state.filters.actionType;
}

function update() {
  resetPagination();
  filterGrants();
  writeHash();
  renderStatusPills();
  renderMetrics();
  renderSidebar();
  renderSavedCallsPanel();
  renderAiBriefing();
  renderResults();
  renderPagination();
  if (state.activeView === 'pipeline') renderPipeline();
}

// ── Wire events ───────────────────────────────────────────────
function wireEvents() {
  const onInput  = (key, el) => el?.addEventListener('input',  e => { state.filters[key] = e.target.value; resetPagination(); update(); });
  const onChange = (key, el) => el?.addEventListener('change', e => { state.filters[key] = e.target.value; resetPagination(); update(); });

  onInput('query',       elements.searchInput);
  onInput('projectIdea', elements.projectInput);
  onChange('theme',       elements.themeSelect);
  onChange('actionType',  elements.actionTypeSelect);
  onChange('recentMonths',elements.recentSelect);
  onChange('programme',   elements.programmeSelect);
  elements.sortSelect?.addEventListener('change', e => { state.filters.sort = e.target.value; update(); });

  elements.exportSavedButton?.addEventListener('click', exportSavedCallsCsv);
  elements.clearSavedButton?.addEventListener('click', () => {
    if (!state.savedIds.size || !confirm('Weet je zeker dat je alle bewaarde calls wilt wissen?')) return;
    state.savedIds.clear(); persistSavedCalls(); update();
  });

  elements.resetButton?.addEventListener('click', () => {
    state.filters = { query: '', projectIdea: '', status: 'live', programme: 'all', theme: 'all', actionType: 'all', recentMonths: 'all', sort: 'relevance-desc' };
    state.aiReviews.clear(); state.aiSummary = null; state.aiRerankActive = false;
    const statusEl = document.querySelector('#ai-rerank-status');
    const aiBtn    = document.querySelector('#ai-rerank-button');
    if (statusEl) { statusEl.hidden = true; statusEl.textContent = ''; }
    if (aiBtn)    { aiBtn.textContent = 'AI analyseer top 10'; aiBtn.disabled = false; }
    resetPagination(); syncControls(); update();
  });

  document.querySelector('#ai-rerank-button')?.addEventListener('click', scoreTopResultsWithAI);
  document.querySelector('#ai-review-button')?.addEventListener('click', runAiReview);
  window.addEventListener('hashchange', () => { parseHash(); syncControls(); update(); });
}

// ── Bootstrap ─────────────────────────────────────────────────
async function init() {
  loadSavedCalls();
  loadPipeline();
  parseHash();
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Could not load data: ${res.status}`);
  state.data = await res.json();
  renderProgrammeOptions();
  renderActionTypeOptions();
  renderMetrics();
  syncControls();
  wireEvents();
  renderViewTabs();
  switchView(state.activeView);
  update();
}

init().catch(err => {
  elements.resultsList.innerHTML = `<div class="empty-state">${err.message}</div>`;
  console.error(err);
});
