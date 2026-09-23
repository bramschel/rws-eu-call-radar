# RWS EU Call Radar

De RWS EU Call Radar is een webapplicatie voor het verkennen, filteren en rangschikken van Europese subsidieoproepen die mogelijk relevant zijn voor de werkterreinen van Rijkswaterstaat.

De applicatie combineert:

- openbare call-data uit het EU Funding & Tenders Portal;
- een lokale, tekstgebaseerde relevantiescore;
- vijf inhoudelijke thema's;
- een optionele AI-beoordeling;
- compacte contextinformatie over Rijkswaterstaat;
- positieve historische patroonvoorbeelden.

> De Radar ondersteunt signalering en prioritering, maar vormt geen formeel subsidieadvies. Controleer deadlines, toelatingsvoorwaarden, consortiumvereisten, budgetten en inhoudelijke vereisten altijd bij de officiële EU-callpagina.

## Live applicatie

https://rws-eu-call-radar.vercel.app/

## Functionaliteiten

Met de Radar kunnen Europese subsidieoproepen worden:

- doorzocht;
- gefilterd op periode, status, programma en thema;
- gerangschikt op mogelijke relevantie;
- geopend bij de officiële EU-bron;
- bewaard voor latere beoordeling;
- aanvullend met AI beoordeeld.

## Relevantiebeoordeling

### Lokale relevantiescore

De lokale relevantiescore wordt in de browser berekend en gebruikt onder meer:

- zoektermen en projectideeën;
- inhoudelijke thematermen;
- belangrijke vakinhoudelijke zinsneden;
- Engelse synoniemen voor Nederlandstalige zoektermen;
- termen die passen bij de taken en assets van Rijkswaterstaat;
- correcties voor brede of minder passende onderwerpen.

De lokale score is bedoeld als snelle eerste rangschikking en vormt geen definitief inhoudelijk oordeel.

### AI-beoordeling

Een selectie van hoog gerangschikte calls kan aanvullend met AI worden beoordeeld.

De AI-beoordeling levert per call onder meer:

- een brede inschatting van de relevantie voor Rijkswaterstaat;
- een afzonderlijke beoordeling van de aansluiting op een projectidee;
- een mogelijke rol voor Rijkswaterstaat;
- een inhoudelijke onderbouwing;
- belangrijke onzekerheden;
- relevante callvoorwaarden.

De AI gebruikt de actuele calltekst, compacte RWS-context en eventueel passende historische patroonvoorbeelden.

AI-resultaten kunnen feitelijke of interpretatieve fouten bevatten en moeten daarom altijd worden gecontroleerd.

## Inhoudelijke thema's

De Radar gebruikt vijf thematische categorieën:

1. Corridor Management
2. Climate Adaptation
3. Sustainability
4. Digitalisation
5. Network Governance

Deze thema's ondersteunen de lokale rangschikking en de context voor de AI-beoordeling.

## Technische architectuur

```text
EU Funding & Tenders Portal
            |
            v
scripts/update-data.mjs
            |
            v
data/grants.json
            |
            v
Frontend
index.html + styles.css + app.js
            |
            +--> filtering en lokale score
            |
            v
Vercel serverless function
api/score.js
            |
            +--> RWS-context
            +--> historische voorbeelden
            +--> Supabase AI-cache (lib/ai-cache.js)
            |
            v
LLM-keten (lib/llm.js)
Mistral → Gemini → OpenRouter
            |
            v
Gestructureerde AI-beoordeling
```

De LLM-keten probeert providers en modellen in volgorde, met exponential backoff bij tijdelijke fouten (429/503/504/timeouts) en een harde deadline van 150 seconden. Een provider die in een aanroep volledig faalt (geen enkele succesvolle stap) gaat 10 minuten op cooldown voor die warm instance, zodat een volgende batch dezelfde dode provider niet opnieuw probeert; een succesvolle aanroep heft die cooldown weer op. Elke poging wordt gelogd en als `attempts` in de respons geretourneerd, zodat zichtbaar is welke provider of welk model faalde.

Supabase ondersteunt authenticatie en gebruikersgebonden functionaliteit en bewaart AI-analyseresultaten als cache (tabel `public.ai_reviews`).

## Repositorystructuur

```text
.
├── .github/
│   └── workflows/
│       └── daily-refresh.yml
├── api/
│   └── score.js
├── data/
│   ├── grants.json
│   ├── rws_rag_context.json
│   └── relevance_examples.json
├── lib/
│   ├── llm.js
│   └── ai-cache.js
├── scripts/
│   ├── update-data.mjs
│   └── probe-models.mjs
├── supabase/
│   └── migrations/
├── app.js
├── index.html
├── package.json
├── styles.css
├── .gitignore
└── README.md
```

## Belangrijkste bestanden

### `app.js`

Bevat de frontendlogica voor:

- het laden en normaliseren van call-data;
- zoeken, filteren en sorteren;
- de lokale relevantiescore;
- het tonen van call cards;
- het uitvoeren van AI-analyses;
- het verwerken van AI-resultaten.

Een deel van de inhoudelijke scoringsconfiguratie staat momenteel eveneens in dit bestand.

### `api/score.js`

Vercel serverless function voor de AI-beoordeling.

De functie laadt relevante context, stelt de AI-prompt samen, leest en schrijft de Supabase-cache, roept de LLM-keten aan en verwerkt het gestructureerde antwoord.

### `lib/llm.js`

Provider-adapters (Mistral, Gemini via twee transporten, OpenRouter), foutclassificatie (transient versus configuratie), retry met backoff en de volledige fallback-keten met `attempts`-registratie.

### `lib/ai-cache.js`

Berekent de cachesleutel (hash van projectidee, keywords, thema, call-teksten en promptversie) en leest/schrijft resultaten in `public.ai_reviews`. Cache-fouten zijn altijd best-effort.

### `scripts/probe-models.mjs`

Diagnosetool: `npm run probe:ai`. Toont welke sleutels actief zijn, haalt de models-lijsten op en stuurt per geconfigureerd model een minieme completion. Resultaat: PASS/FAIL per combinatie plus een voorgestelde `GEMINI_MODEL_1..n`-reeks.

### `data/grants.json`

Bevat de lokale snapshot van beschikbare Europese subsidieoproepen.

Het bestand wordt automatisch bijgewerkt. Handmatige wijzigingen kunnen bij een volgende update worden overschreven.

### `data/rws_rag_context.json`

Bevat compacte contextinformatie over de taken, werkterreinen, assets en mogelijke rollen van Rijkswaterstaat.

Deze context ondersteunt de AI-beoordeling. De actuele calltekst blijft leidend.

### `data/relevance_examples.json`

Bevat positieve historische patroonvoorbeelden.

Een historisch voorbeeld is alleen bruikbaar wanneer een actuele call directe overlap heeft met het doel, de scope, de kernactiviteiten of een vergelijkbare rol. Een gedeeld thema of subsidieprogramma is daarvoor niet voldoende.

### `scripts/update-data.mjs`

Haalt openbare call-data op en schrijft de genormaliseerde snapshot naar `data/grants.json`.

### `.github/workflows/daily-refresh.yml`

Voert de automatische actualisatie van de call-data uit.

## Databron

De call-data wordt verkregen via openbare zoek- en facet-API's van het EU Funding & Tenders Portal.

De data wordt lokaal opgeslagen, zodat de frontend de calls snel kan tonen, filteren en rangschikken.

De officiële Funding & Tenders-pagina blijft de gezaghebbende bron voor iedere call.

## Lokaal uitvoeren

### Vereisten

- Node.js
- npm
- Git

### Installatie

```powershell
git clone https://github.com/bramschel/rws-eu-call-radar.git
cd rws-eu-call-radar
npm install
```

### Call-data actualiseren

```powershell
npm run update:data
```

### Ontwikkelserver starten

```powershell
npm run dev
```

Open daarna:

```text
http://localhost:4173
```

Controleer de actuele scripts in `package.json` wanneer een commando niet beschikbaar is.

## Configuratie

Functionaliteiten die afhankelijk zijn van externe diensten vereisen aanvullende configuratie via environment variables.

### AI-providers (Vercel, runtime)

| Variabele | Verplicht | Omschrijving |
| --- | --- | --- |
| `VIBE_CLI_KEY_BCG` | nee* | Mistral API-sleutel (primair). |
| `MISTRAL_ENABLED` | nee | `false` schakelt de hele Mistral-stap in de keten uit (standaard aan; Gemini wordt dan de eerste provider). |
| `AI_MODEL` / `MISTRAL_MODEL` | nee | Primair Mistral-model, standaard `mistral-small-latest`. |
| `AI_FALLBACK_MODEL` | nee | Tweede Mistral-model, standaard `ministral-3b-latest` (1 poging van 20s). |
| `PROVIDER_COOLDOWN_MS` | nee | Cooldown voor een volledig falende provider, standaard `600000` (10 minuten). |
| `GEMINI_API_KEY` | nee* | Google AI Studio-sleutel (fallback). |
| `GEMINI_MODEL_1..6` | nee | Gemini-modelketen, standaard `gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.6-flash`. |
| `GEMINI_API_REVISION` | nee | Waarde van de `Api-Revision`-header op de Interactions API, standaard `2026-05-20`; leeg laten om de header te laten vallen. |
| `OPENROUTER_API_KEY` | nee | Derde, gratis fallback. |
| `OPENROUTER_MODEL` | nee | OpenRouter-model, standaard `meta-llama/llama-3.3-70b-instruct:free`. |
| `OPENROUTER_SITE_URL` | nee | `HTTP-Referer`-header voor OpenRouter. |

\* Minstens één provider-sleutel is verplicht, anders geeft `/api/score` een 500 met een duidelijke melding.

### Supabase (build + runtime)

| Variabele | Wanneer | Omschrijving |
| --- | --- | --- |
| `SUPABASE_URL` | build én runtime | Project-URL; bouwt `supabase-config.js` en wordt gebruikt door de AI-cache. |
| `SUPABASE_PUBLISHABLE_KEY` | build én runtime | Publishable/anon sleutel voor frontend en AI-cache. |

Pas na het draaien van `supabase/migrations/20240101000003_ai_cache.sql` (tabel `ai_reviews`) werkt de server-side AI-cache. Zonder die tabel of zonder runtime-variabelen draait de analyse gewoon door; alleen cache-slagen uit.

### AI-cache gedrag

- De cachesleutel is een hash van **projectidee + keywords + thema + call-teksten + promptversie**. Dezelfde invoer levert dus exact dezelfde score zonder nieuwe AI-aanroep; een aangepast projectidee of keyword levert automatisch een verse analyse.
- Resultaten blijven 30 dagen bewaard (`public.ai_reviews`).
- Het selectievakje **"Forceer nieuwe analyse"** omzeilt zowel de lokale als de Supabase-cache.
- Wijzigt `data/rws_rag_context.json`, `data/relevance_examples.json` of `PROMPT_REVISION` in `api/score.js`, dan veranderen alle sleutels automatisch en worden oude resultaten genegeerd.

### AI-providers controleren (diagnose)

```powershell
npm run probe:ai
```

De tool leest `.env`/`.env.local` (of je shell-omgeving), controleert de models-lijsten en test elk geconfigureerd model met een korte completion. Gebruik `npm run probe:ai -- --verbose` om ruwe responsen te tonen. Dit is de eerste stap wanneer je 503- of model-not-found-fouten ziet.

Plaats nooit geheime waarden in:

- broncode;
- GitHub-commits;
- issues;
- screenshots;
- logbestanden;
- openbare documentatie.

## Automatische data-update

De call-data wordt periodiek bijgewerkt via:

```text
.github/workflows/daily-refresh.yml
```

De workflow gebruikt:

```text
scripts/update-data.mjs
```

en actualiseert:

```text
data/grants.json
```

De meest recente uitvoering is zichtbaar via het tabblad **Actions** in GitHub.

## Validatie

Controleer vóór een commit minimaal de JavaScript-syntax:

```powershell
node --check .\app.js
node --check .\api\score.js
```

Controleer de JSON-bestanden:

```powershell
node -e "const fs=require('fs'); for(const p of ['data/grants.json','data/rws_rag_context.json','data/relevance_examples.json']){JSON.parse(fs.readFileSync(p,'utf8')); console.log('OK:',p)}"
```

Controleer vervolgens:

```powershell
git diff --check
git diff
git status
```

Geldige syntax bewijst niet dat de applicatie zonder runtimefouten werkt. Controleer daarom ook handmatig of de calls, filters, authenticatie en AI-analyse correct functioneren.

## Beperkingen

- De lokale score is tekstgebaseerd en kan relevante calls missen of brede calls te hoog rangschikken.
- AI-output kan variëren en feitelijke of interpretatieve fouten bevatten.
- Historische voorbeelden zijn ondersteunende analogieën en geen zelfstandig bewijs van relevantie.
- Delen van de applicatie zijn afhankelijk van externe diensten voor hosting, AI, authenticatie en call-data.
- Een deel van de inhoudelijke configuratie staat momenteel nog in `app.js`.

## Bron van waarheid

GitHub is de technische bron van waarheid voor de applicatie.

Kopieën van de code buiten GitHub zijn alleen bedoeld voor documentatie of herstel en vormen geen actieve productiebron.

## Licentie

Er is momenteel geen afzonderlijke open-sourcelicentie in deze repository vastgelegd.

De openbare zichtbaarheid van de repository betekent niet automatisch dat onbeperkt hergebruik, wijziging of distributie is toegestaan.
