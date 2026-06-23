// ── Config ────────────────────────────────────────────────────
const DATA_URL = './data/grants.json';
const AI_API_URL = window.location.hostname.includes('vercel.app') ? '/api/score' : '';
const PAGE_SIZE = 25;
const SAVED_CALLS_KEY    = 'rws-eu-call-radar-saved-calls';
const PIPELINE_KEY       = 'rws-eu-call-radar-pipeline';
const SAVED_SEARCHES_KEY = 'rws-eu-call-radar-saved-searches';

const TRACKING_BASELINE_DATE = '2026-01-01T00:00:00.000Z';

// ── Supabase Client ──────────────────────────────────────────
let supabase;
try {
  // Use browser globals from CDN script tags
  const config = window.SUPABASE_CONFIG;
  const supabaseLibrary = window.supabase;

  if (config?.url && config?.anonKey && supabaseLibrary?.createClient) {
    supabase = supabaseLibrary.createClient(config.url, config.anonKey);
    
    // Set up auth listener for password recovery and other auth events
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event);
      
      if (event === 'PASSWORD_RECOVERY') {
        // Show password reset form when user clicks reset link
        showPasswordResetForm();
      } else if (event === 'SIGNED_IN') {
        state.auth.session = session;
        state.auth.user = session?.user || null;
        state.auth.error = null;
        updateAuthUI();
      } else if (event === 'SIGNED_OUT') {
        state.auth.session = null;
        state.auth.user = null;
        updateAuthUI();
      }
    });
  } else {
    console.warn('Supabase config or library not available');
  }
} catch (error) {
  console.warn('Supabase client initialization failed:', error.message);
  // App will continue to work without Supabase for anonymous users
}

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
  auth: {
    user: null,
    session: null,
    loading: false,
    error: null
  },
  savedSearches: [],
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
  
  // Auth elements
  signInButton:       document.querySelector('#sign-in-button'),
  signUpButton:       document.querySelector('#sign-up-button'),
  signOutButton:      document.querySelector('#sign-out-button'),
  userGreeting:       document.querySelector('#user-greeting'),
  authStatus:         document.querySelector('#auth-status'),
  
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
  savedSearchesContainer: document.querySelector('#saved-searches-container'),
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

function getGrantDateFilterTime(grant) {
  // New status-based date filtering logic
  const statusId = grant.status?.id;
  
  if (statusId === '31094502') { // Open for submission
    // Use startDate for Open calls
    if (grant.startDate) {
      const time = new Date(grant.startDate).getTime();
      if (Number.isFinite(time)) return time;
    }
  } else if (statusId === '31094501') { // Forthcoming
    // Use firstSeenAt for Forthcoming calls, excluding baseline
    if (grant.firstSeenAt && grant.firstSeenAt !== TRACKING_BASELINE_DATE) {
      const time = new Date(grant.firstSeenAt).getTime();
      if (Number.isFinite(time)) return time;
    }
  }
  // For other statuses, fall back to current radar activity behavior
  // This preserves existing behavior for any unexpected status values
  const recencyTimes = getGrantRecencyTimes(grant);
  return recencyTimes.length > 0 ? recencyTimes[0] : null;
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
      matchedThemes.push({ id: theme.id, label: theme.label, score: ts, matches: hits });
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

  matchedThemes.sort((a, b) => b.score - a.score);

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
  const filterTime = getGrantDateFilterTime(grant);
  if (!filterTime) return false;
  if (filterTime < cutoff || filterTime > now) return false;
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
  // Render top programmes
  elements.topProgrammes.innerHTML = '';
  const programmes = state.data.facets.frameworkProgramme.slice(0, 6);
  if (!programmes.length) {
    const el = document.createElement('div');
    el.className = 'mini-list__item'; el.textContent = 'No programme filters available.';
    elements.topProgrammes.appendChild(el);
  } else {
    for (const prog of programmes) {
      const btn = document.createElement('button');
      btn.className = `mini-filter${state.filters.programme === prog.rawValue ? ' is-active' : ''}`;
      btn.type = 'button';
      btn.innerHTML = `<span class="mini-filter__title">${escapeHtml(prog.value)}</span><span class="mini-filter__meta">${fmtCompact.format(prog.count)} calls</span>`;
      btn.addEventListener('click', () => toggleProgrammeFilter(prog.rawValue));
      elements.topProgrammes.appendChild(btn);
    }
  }
  
  // Render saved searches panel
  if (elements.savedSearchesContainer) {
    elements.savedSearchesContainer.innerHTML = renderSavedSearchesPanel();
    wireSavedSearchEvents();
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
    const content     = card.querySelector('.grant-card__content');
    const dFeedSummary = card.querySelector('.grant-card__drawer-feed-summary');
    const dAbstract = card.querySelector('.grant-card__drawer-abstract');
    const dAbsBlock = card.querySelector('.grant-card__drawer-block--abstract');
    const dFeedSummaryBlock = card.querySelector('.grant-card__drawer-block--feed-summary');
    const facts     = card.querySelector('.grant-card__facts');
    const detailsBtn = card.querySelector('.grant-card__details-toggle');

    statusChip.dataset.status = grant.status.id;
    statusChip.textContent    = grant.status.label;
    idEl.textContent          = grant.identifier;
    if (titleBtn)   { titleBtn.textContent = grant.title; titleBtn.removeAttribute('aria-expanded'); }
    if (legacyLink) { legacyLink.textContent = grant.title; legacyLink.href = grant.url; }
    if (openLink)   openLink.href = grant.url;

    // Feed summary logic - only show if we have a usable, non-truncated summary
    const feedSummaryText = grant.destination || grant.callTitle || grant.summary || '';
    const feedSummaryIsTruncated = feedSummaryText && /…$|\.\.\.$/.test(feedSummaryText.trim());
    const feedSummaryDuplicatesAbstract = grant.abstract && feedSummaryText.trim() === grant.abstract.trim();

    if (dFeedSummary && dFeedSummaryBlock && feedSummaryText && !feedSummaryIsTruncated && !feedSummaryDuplicatesAbstract) {
      dFeedSummary.textContent = feedSummaryText;
      dFeedSummaryBlock.hidden = false;
    } else if (dFeedSummaryBlock) {
      dFeedSummaryBlock.hidden = true;
    }

    // Abstract / scope logic - unchanged
    if (dAbstract && dAbsBlock) { dAbstract.textContent = grant.abstract || ''; dAbsBlock.hidden = !grant.abstract; }

    if (detailsBtn && content) {
      detailsBtn.addEventListener('click', () => {
        const isExpanded = detailsBtn.getAttribute('aria-expanded') === 'true';
        detailsBtn.setAttribute('aria-expanded', String(!isExpanded));
        content.setAttribute('aria-hidden', String(isExpanded));
        content.hidden = isExpanded;
        
        const icon = detailsBtn.querySelector('.grant-card__toggle-icon');
        const text = detailsBtn.querySelector('.grant-card__toggle-text');
        if (icon) icon.innerHTML = isExpanded ? '&#9660;' : '&#9650;';
        if (text) text.textContent = isExpanded ? 'Bekijk details' : 'Minder';
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

    // Bewaar knop
    const saveBtn = document.createElement('button');
    saveBtn.className = 'ghost-button grant-card__save-button';
    saveBtn.type = 'button';
    saveBtn.textContent = isGrantSaved(grant) ? 'Bewaard' : 'Bewaar';
    saveBtn.setAttribute('aria-label', isGrantSaved(grant) ? 'Verwijder call uit bewaarde calls' : 'Bewaar call');
    saveBtn.onclick = e => { e.preventDefault(); e.stopPropagation(); toggleSavedGrant(grant); };

    // Voeg actieknoppen toe aan de footer, links van de toggle
const footer = card.querySelector('.grant-card__footer');
const toggle = card.querySelector('.grant-card__details-toggle');
if (footer && toggle) {
  footer.insertBefore(aiBtn, toggle);
  footer.insertBefore(saveBtn, toggle);
}

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

// ── Helper functions for meeting-ready briefing ─────────────────

function getActivePeriodLabel() {
  const period = state.filters.recentMonths;
  const periodMap = {
    '14d': 'Laatste 2 weken',
    '1': 'Laatste 1 maand',
    '2': 'Laatste 2 maanden',
    '3': 'Laatste 3 maanden',
    '6': 'Laatste 6 maanden',
    'all': 'Alle perioden'
  };
  return periodMap[period] || 'Alle perioden';
}

function getPrimaryThemeForGrant(grant) {
  const themes = grant.relevance?.matchedThemes?.map(t => t.label) || [];
  if (themes.length) return themes[0];
  
  const frameworkThemes = grant.frameworkProgrammes?.flatMap(p => 
    p.themes?.map(t => t.label) || []
  ) || [];
  
  if (frameworkThemes.length) return frameworkThemes[0];
  
  return 'Niet gespecificeerd';
}

function getThemeOverview(reviews) {
  const themeCounts = {
    'Corridor Management': 0,
    'Climate Adaptation': 0,
    'Sustainability / Duurzame Leefomgeving': 0,
    'Digitalisation': 0,
    'Network Governance': 0
  };
  
  const themeScores = {
    'Corridor Management': [],
    'Climate Adaptation': [],
    'Sustainability / Duurzame Leefomgeving': [],
    'Digitalisation': [],
    'Network Governance': []
  };
  
  const themeActions = {
    'Corridor Management': {'Actief verkennen': 0, 'Nader toetsen': 0, 'Monitoren': 0, 'Niet prioriteren': 0},
    'Climate Adaptation': {'Actief verkennen': 0, 'Nader toetsen': 0, 'Monitoren': 0, 'Niet prioriteren': 0},
    'Sustainability / Duurzame Leefomgeving': {'Actief verkennen': 0, 'Nader toetsen': 0, 'Monitoren': 0, 'Niet prioriteren': 0},
    'Digitalisation': {'Actief verkennen': 0, 'Nader toetsen': 0, 'Monitoren': 0, 'Niet prioriteren': 0},
    'Network Governance': {'Actief verkennen': 0, 'Nader toetsen': 0, 'Monitoren': 0, 'Niet prioriteren': 0}
  };
  
  reviews.forEach(review => {
    const call = getCallByIdentifier(review.identifier);
    if (!call) return;
    
    const primaryTheme = getPrimaryThemeForGrant(call);
    if (themeCounts.hasOwnProperty(primaryTheme)) {
      themeCounts[primaryTheme]++;
      themeScores[primaryTheme].push(review.aiRelevanceScore);
      
      const actionLabel = clampActionLabel(review, call);
      if (themeActions[primaryTheme][actionLabel] !== undefined) {
        themeActions[primaryTheme][actionLabel]++;
      }
    }
  });
  
  return { themeCounts, themeScores, themeActions };
}

function getTopCallsForBriefing(reviews) {
  return reviews
    .filter(r => r.aiRelevanceScore != null)
    .sort((a, b) => {
      // Primary sort: aiRelevanceScore desc
      if (b.aiRelevanceScore !== a.aiRelevanceScore) {
        return b.aiRelevanceScore - a.aiRelevanceScore;
      }
      // Secondary sort: projectFitScore desc
      if (b.projectFitScore !== a.projectFitScore) {
        return b.projectFitScore - a.projectFitScore;
      }
      // Tertiary sort: deadlineDate asc (earliest first)
      const callA = getCallByIdentifier(a.identifier);
      const callB = getCallByIdentifier(b.identifier);
      const deadlineA = callA?.deadlineDate ? new Date(callA.deadlineDate).getTime() : Infinity;
      const deadlineB = callB?.deadlineDate ? new Date(callB.deadlineDate).getTime() : Infinity;
      return deadlineA - deadlineB;
    })
    .slice(0, 5);
}

function getCallVanDeWeek(topCalls) {
  if (!topCalls.length) return null;
  
  const scoredCalls = topCalls.map(call => {
    const combinedScore = 0.7 * call.aiRelevanceScore + 0.3 * call.projectFitScore;
    const callData = getCallByIdentifier(call.identifier);
    const deadline = callData?.deadlineDate ? new Date(callData.deadlineDate).getTime() : Infinity;
    return { call, combinedScore, deadline };
  });
  
  // Sort by combined score desc, then by deadline asc
  scoredCalls.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) {
      return b.combinedScore - a.combinedScore;
    }
    return a.deadline - b.deadline;
  });
  
  return scoredCalls[0].call;
}

function getWatchlistCalls(reviews) {
  const topCalls = getTopCallsForBriefing(reviews);
  const topCallIds = new Set(topCalls.map(c => c.identifier));
  
  return reviews
    .filter(r => !topCallIds.has(r.identifier))
    .filter(r => {
      // Heuristic 1: aiRelevanceScore between 45 and 70
      const scoreInRange = r.aiRelevanceScore >= 45 && r.aiRelevanceScore <= 70;
      // Heuristic 2: projectFitScore meaningfully higher than aiRelevanceScore
      const fitHigher = r.projectFitScore >= r.aiRelevanceScore + 15;
      // Heuristic 3: Check if it would be Monitoren or Nader toetsen
      const call = getCallByIdentifier(r.identifier);
      const actionLabel = clampActionLabel(r, call);
      const isMonitorType = actionLabel === 'Monitoren' || actionLabel === 'Nader toetsen';
      
      return scoreInRange || fitHigher || isMonitorType;
    })
    .sort((a, b) => {
      // Sort by action priority: Actief verkennen > Nader toetsen > Monitoren > Niet prioriteren
      const callA = getCallByIdentifier(a.identifier);
      const callB = getCallByIdentifier(b.identifier);
      const actionA = clampActionLabel(a, callA);
      const actionB = clampActionLabel(b, callB);
      
      const priorityOrder = {
        'Actief verkennen': 1,
        'Nader toetsen': 2,
        'Monitoren': 3,
        'Niet prioriteren': 4
      };
      
      const priorityA = priorityOrder[actionA] || 4;
      const priorityB = priorityOrder[actionB] || 4;
      
      if (priorityA !== priorityB) return priorityA - priorityB;
      if (b.projectFitScore !== a.projectFitScore) return b.projectFitScore - a.projectFitScore;
      return b.aiRelevanceScore - a.aiRelevanceScore;
    })
    .slice(0, 5);
}

function getDeduplicatedNextActions(reviews) {
  const actions = new Map();
  const topCalls = getTopCallsForBriefing(reviews);
  
  topCalls.forEach(review => {
    const call = getCallByIdentifier(review.identifier);
    if (call && review.recommendedNextStep) {
      const actionText = `${call.identifier}: ${review.recommendedNextStep}`;
      if (!actions.has(actionText)) {
        actions.set(actionText, { callId: call.identifier, action: review.recommendedNextStep });
      }
    }
  });
  
  return Array.from(actions.values());
}

function clampActionLabel(review, call) {
  if (!review || !call) return 'Niet prioriteren';
  
  // If AI provided an action label, use it but clamp to our allowed labels
  const aiAction = review.actielabelVoorstel || review.actionLabel;
  
  // Determine based on scores if no AI action or if we need to clamp
  if (review.aiRelevanceScore >= 80 && review.projectFitScore >= 60) {
    return aiAction === 'Actief verkennen' ? 'Actief verkennen' : 'Actief verkennen';
  } else if (review.aiRelevanceScore >= 65 && review.projectFitScore >= 45) {
    return aiAction === 'Nader toetsen' ? 'Nader toetsen' : 'Nader toetsen';
  } else if (review.aiRelevanceScore >= 45) {
    return aiAction === 'Monitoren' ? 'Monitoren' : 'Monitoren';
  } else {
    return 'Niet prioriteren';
  }
}

function getDeterministicSummary(reviews, filteredCount) {
  if (reviews.length === 0) {
    return [
      `Geen AI-analyses beschikbaar voor ${filteredCount} calls in scope.`,
      'Voer eerst een AI-analyse uit op het Radar-tabblad.',
      'Kies maximaal 10 calls voor beoordeling.'
    ];
  }
 
  const themeOverview = getThemeOverview(reviews);
  const dominantTheme = Object.entries(themeOverview.themeCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'onbekend';
 
  const topCall = getTopCallsForBriefing(reviews)[0];
  const topCallData = topCall ? getCallByIdentifier(topCall.identifier) : null;
 
  // Actieverdeling over alle reviews
  const actionCounts = { 'Actief verkennen': 0, 'Nader toetsen': 0, 'Monitoren': 0, 'Niet prioriteren': 0 };
  reviews.forEach(r => {
    const call = getCallByIdentifier(r.identifier);
    const label = clampActionLabel(r, call);
    if (actionCounts[label] !== undefined) actionCounts[label]++;
  });
 
  const actieParts = [];
  if (actionCounts['Actief verkennen'] > 0)  actieParts.push(`${actionCounts['Actief verkennen']}x actief verkennen`);
  if (actionCounts['Nader toetsen'] > 0)     actieParts.push(`${actionCounts['Nader toetsen']}x nader toetsen`);
  if (actionCounts['Monitoren'] > 0)          actieParts.push(`${actionCounts['Monitoren']}x monitoren`);
  if (actionCounts['Niet prioriteren'] > 0)   actieParts.push(`${actionCounts['Niet prioriteren']}x niet prioriteren`);
 
  return [
    `${reviews.length} van ${filteredCount} calls geanalyseerd — dominant thema: ${dominantTheme} (${themeOverview.themeCounts[dominantTheme] || 0} calls).`,
    topCallData
      ? `Topcall: ${topCallData.title} (AI: ${topCall.aiRelevanceScore}/100, ${getPrimaryThemeForGrant(topCallData)}).`
      : 'Geen topcall bepaald.',
    actieParts.length ? `Actieverdeling: ${actieParts.join(', ')}.` : 'Geen actielabels bepaald.'
  ];
}

// ── Helpers: Field mappings for compact shortlist ───────────
function getCallScope(grant) {
  // Priority order: summary -> abstract -> conservative fallback
  // Use summary if it's informative and not just identical to title
  if (grant.summary) {
    const summaryFirstSentence = grant.summary.split('.')[0].trim();
    const summaryWithPeriod = summaryFirstSentence + (summaryFirstSentence.endsWith('.') ? '' : '.');
    
    // Avoid using summary if it's just the title or too short
    const isMeaningful = summaryWithPeriod !== grant.title && 
                         summaryWithPeriod.replace(/\s+/g, ' ').length > 40 &&
                         !summaryWithPeriod.toLowerCase().startsWith(grant.title?.toLowerCase() || '');
    
    if (isMeaningful) {
      return summaryWithPeriod;
    }
  }
  
  // Extract useful content from abstract
  if (grant.abstract) {
    // Look for meaningful prefixes and extract content after them
    const prefixes = ['Expected Outcome:', 'Scope:', 'Expected Impact:', 'Objective:', 'Purpose:', 'Aim:', 'Goal:'];
    let abstractContent = grant.abstract;
    
    // Find the first meaningful prefix and extract content after it
    for (const prefix of prefixes) {
      const prefixIndex = abstractContent.indexOf(prefix);
      if (prefixIndex !== -1) {
        abstractContent = abstractContent.substring(prefixIndex + prefix.length).trim();
        break;
      }
    }
    
    // Get first sentence of the cleaned content
    let firstSentence = abstractContent.split('.')[0].trim();
    
    // Remove any remaining technical prefixes or bullet points
    firstSentence = firstSentence
      .replace(/^[\.•\-*–—\s]+/, '')
      .replace(/^Expected Outcome:/i, '')
      .replace(/^Scope:/i, '')
      .replace(/^Objective:/i, '')
      .replace(/^Purpose:/i, '')
      .replace(/^Aim:/i, '')
      .replace(/^Goal:/i, '')
      .trim();
    
    // Clean up multiple spaces and ensure proper punctuation
    firstSentence = firstSentence.replace(/\s+/g, ' ');
    
    // Return if we have meaningful content (not just title repetition)
    const isTitleRepetition = grant.title && firstSentence.toLowerCase().startsWith(grant.title.toLowerCase());
    const isMeaningfulLength = firstSentence.length > 30;
    
    if (!isTitleRepetition && isMeaningfulLength) {
      // Limit to reasonable length
      const maxLength = 200;
      if (firstSentence.length > maxLength) {
        firstSentence = firstSentence.substring(0, maxLength) + '...';
      }
      return firstSentence + (firstSentence.endsWith('.') ? '' : '.');
    }
  }
  
  // Conservative fallback - avoid repeating title if it's not informative
  if (grant.title && grant.title.length > 50) {
    // Long titles might actually be descriptive
    return grant.title + '.';
  }
  
  return 'Scope nog niet concreet beschikbaar in de callgegevens.';
}

function cleanBulletText(text) {
  return String(text || '').replace(/^[\s•\-*–—·▪●]+/, '').trim();
}

function sortReviewsByAiRelevance(reviews) {
  // Shortlist order is always aiRelevanceScore descending. Do not replace with local relevance or project fit sorting.
  return [...reviews].sort((a, b) => {
    // Primary: aiRelevanceScore descending
    const scoreA = a.aiRelevanceScore ?? 0;
    const scoreB = b.aiRelevanceScore ?? 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    
    // Secondary: projectFitScore descending
    const fitA = a.projectFitScore ?? 0;
    const fitB = b.projectFitScore ?? 0;
    if (fitA !== fitB) return fitB - fitA;
    
    // Tertiary: deadlineDate ascending (earliest first)
    const callA = getCallByIdentifier(a.identifier);
    const callB = getCallByIdentifier(b.identifier);
    const deadlineA = callA?.deadlineDate ? new Date(callA.deadlineDate).getTime() : Infinity;
    const deadlineB = callB?.deadlineDate ? new Date(callB.deadlineDate).getTime() : Infinity;
    if (deadlineA !== deadlineB) return deadlineA - deadlineB;
    
    // Final: identifier ascending for stable tie-breaker
    return a.identifier.localeCompare(b.identifier);
  });
}

function getDisplayCallScope(review, grant) {
  // Prefer AI-generated Dutch scope if available and valid
  if (review.callScopeSummary) {
    const scope = review.callScopeSummary.trim();
    
    // Validation: reject if too short, English title repetition, or invalid fallback
    const isTooShort = scope.length < 30;
    const isEnglishTitleRepetition = grant.title && 
                                     scope.toLowerCase().startsWith(grant.title.toLowerCase()) &&
                                     scope.length < grant.title.length + 20;
    const isInvalidFallback = scope === 'Scope nog niet concreet beschikbaar in de callgegevens.' && 
                             grant.summary && grant.summary.length > 50;
    
    if (!isTooShort && !isEnglishTitleRepetition && !isInvalidFallback) {
      return scope;
    }
  }
  
  // Fallback to deterministic scope extraction
  return getCallScope(grant);
}

function getStatusBadgeClass(status) {
  if (!status) return 'compact-call__status--neutral';
  
  // Normalize status to handle both label and code formats
  const statusText = status.label ? status.label.toLowerCase() : String(status).toLowerCase();
  const statusCode = status.id ? String(status.id) : '';
  
  // Open for submission (green)
  if (statusText.includes('open') || statusCode === '31094502') {
    return 'compact-call__status--open';
  }
  
  // Forthcoming (orange)
  if (statusText.includes('forthcoming') || statusCode === '31094501') {
    return 'compact-call__status--forthcoming';
  }
  
  // Default/neutral
  return 'compact-call__status--neutral';
}

function getSelectedThemeSummary(reviews, selectedTheme) {
  if (selectedTheme === 'all') return null;
  
  const themeReviews = reviews.filter(review => {
    const call = getCallByIdentifier(review.identifier);
    return call && getPrimaryThemeForGrant(call) === selectedTheme;
  });
  
  if (themeReviews.length === 0) return null;
  
  const scores = themeReviews.map(r => r.aiRelevanceScore);
  const scoreRange = scores.length ? `${Math.min(...scores)}-${Math.max(...scores)}` : '—';
  
  // Count action labels
  const actionCounts = {
    'Actief verkennen': 0,
    'Nader toetsen': 0,
    'Monitoren': 0,
    'Niet prioriteren': 0
  };
  
  themeReviews.forEach(review => {
    const actionLabel = clampActionLabel(review, getCallByIdentifier(review.identifier));
    if (actionCounts[actionLabel] !== undefined) {
      actionCounts[actionLabel]++;
    }
  });
  
  const actionLabels = [];
  if (actionCounts['Actief verkennen'] > 0) actionLabels.push(`A:${actionCounts['Actief verkennen']}`);
  if (actionCounts['Nader toetsen'] > 0) actionLabels.push(`N:${actionCounts['Nader toetsen']}`);
  if (actionCounts['Monitoren'] > 0) actionLabels.push(`M:${actionCounts['Monitoren']}`);
  if (actionCounts['Niet prioriteren'] > 0) actionLabels.push(`P:${actionCounts['Niet prioriteren']}`);
  
  return {
    theme: selectedTheme,
    count: themeReviews.length,
    scoreRange: scoreRange,
    actionLabels: actionLabels.join(' '),
    note: 'Deze shortlist toont calls binnen het actieve themafilter.'
  };
}

function getPossibleRwsProject(review) {
  const project = review.possibleRwsProject;
 
  if (!project || project.length < 20) return null;
 
  const roleTerms = ['kennispartner', 'asset owner', 'pilotlocatie', 'data provider', 'coördinator', 'evaluator'];
  const hasCommas = project.split(',').length > 2;
  const hasRoleTerms = roleTerms.some(term => project.toLowerCase().includes(term));
  if (hasCommas && hasRoleTerms) return null;
 
  const isSimilarToRole      = review.possibleRwsRole  && project === review.possibleRwsRole;
  const isSimilarToFit       = review.projectFit       && project === review.projectFit;
  const isSimilarToRationale = review.rationale        && project === review.rationale;
  const isSimilarToScope     = review.callScopeSummary && project === review.callScopeSummary;
  const isSimilarToNextStep  = review.recommendedNextStep && project === review.recommendedNextStep;
  if (isSimilarToRole || isSimilarToFit || isSimilarToRationale || isSimilarToScope || isSimilarToNextStep) return null;
 
  const genericPhrases = [
    'nog te concretiseren',
    'RWS kan bijdragen aan',
    'deze call is relevant voor',
    'zeer relevant voor RWS',
    'goede kans voor RWS',
    'interessant voor RWS'
  ];
  if (genericPhrases.some(p => project.toLowerCase().includes(p.toLowerCase()))) return null;
 
  return project;
}

// ── Render: AI shortlist view ─────────────────────────────────
function renderAiShortlist() {
  const container = document.querySelector('#shortlist-content');
  if (!container) return;
 
  const reviews = Array.from(state.aiReviews.values());
  if (!reviews.length) {
    container.innerHTML = '<p class="shortlist-empty">Voer eerst een AI-analyse uit op het Radar-tabblad om de shortlist te vullen.</p>';
    return;
  }
 
  const filteredCount  = state.filtered.length;
  const activePeriod   = getActivePeriodLabel();
  const activeStatus   = state.filters.status === 'live'
    ? 'Live (Open + Forthcoming)'
    : state.filters.status === '31094502' ? 'Open for submission' : 'Forthcoming';
  const activeTheme    = state.filters.theme === 'all' ? 'Alle thema\'s' : state.filters.theme;
 
  // 1. Header
  let html = `
    <div class="briefing-header">
      <h2 class="briefing-title">Shortlist</h2>
      <div class="briefing-meta">
        <span class="briefing-meta__item">Periode: ${escapeHtml(activePeriod)}</span>
        <span class="briefing-meta__item">Status: ${escapeHtml(activeStatus)}</span>
        <span class="briefing-meta__item">Thema: ${escapeHtml(activeTheme)}</span>
        <span class="briefing-meta__item">${filteredCount} calls in scope</span>
      </div>
    </div>`;
 
  // 2. Samenvatting
  const summary = getDeterministicSummary(reviews, filteredCount);
  html += `
    <div class="briefing-section">
      <h3 class="briefing-section__title">Samenvatting</h3>
      <ul class="briefing-summary">
        ${summary.map(item => `<li class="briefing-summary__item">${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>`;
 
  // 3. Thema-overzicht
  const selectedThemeSummary = getSelectedThemeSummary(reviews, state.filters.theme);
 
  if (state.filters.theme === 'all') {
    const themeOverview = getThemeOverview(reviews);
    html += `
    <div class="briefing-section">
      <h3 class="briefing-section__title">Thema-overzicht</h3>
      <div class="theme-overview">`;
 
    const themes = [
      'Corridor Management',
      'Climate Adaptation',
      'Sustainability / Duurzame Leefomgeving',
      'Digitalisation',
      'Network Governance'
    ];
 
    themes.forEach(theme => {
      const count   = themeOverview.themeCounts[theme] || 0;
      const scores  = themeOverview.themeScores[theme] || [];
      const scoreRange = scores.length ? `${Math.min(...scores)}\u2013${Math.max(...scores)}` : '\u2014';
      const actions = themeOverview.themeActions[theme] || {};
 
      if (count > 0) {
        const actionLabels = [];
        if (actions['Actief verkennen'] > 0)  actionLabels.push(`A:${actions['Actief verkennen']}`);
        if (actions['Nader toetsen'] > 0)     actionLabels.push(`N:${actions['Nader toetsen']}`);
        if (actions['Monitoren'] > 0)          actionLabels.push(`M:${actions['Monitoren']}`);
        if (actions['Niet prioriteren'] > 0)   actionLabels.push(`P:${actions['Niet prioriteren']}`);
 
        html += `
        <div class="theme-overview__item">
          <div class="theme-overview__header">
            <span class="theme-overview__name">${escapeHtml(theme)}</span>
            <span class="theme-overview__count">${count}</span>
          </div>
          <div class="theme-overview__details">
            <span class="theme-overview__scores">${scoreRange}</span>
            <span class="theme-overview__actions">${actionLabels.join(' ')}</span>
          </div>
        </div>`;
      }
    });
 
    html += `</div></div>`;
 
  } else if (selectedThemeSummary) {
    html += `
    <div class="briefing-section">
      <h3 class="briefing-section__title">Thema-overzicht</h3>
      <div class="theme-overview theme-overview--compact">
        <div class="theme-overview__item">
          <div class="theme-overview__header">
            <span class="theme-overview__name">${escapeHtml(selectedThemeSummary.theme)}</span>
            <span class="theme-overview__count">${selectedThemeSummary.count}</span>
          </div>
          <div class="theme-overview__details">
            <span class="theme-overview__scores">${selectedThemeSummary.scoreRange}</span>
            <span class="theme-overview__actions">${selectedThemeSummary.actionLabels}</span>
          </div>
          <div class="theme-overview__note">${escapeHtml(selectedThemeSummary.note || '')}</div>
        </div>
      </div>
    </div>`;
  }
 
  // 4. Calls
  const sortedReviews = sortReviewsByAiRelevance(reviews);
 
  if (sortedReviews.length > 0) {
    html += `
    <div class="briefing-section">
      <h3 class="briefing-section__title">Alle calls</h3>
      <div class="compact-calls-grid">`;
 
    sortedReviews.forEach((review, index) => {
      const call = getCallByIdentifier(review.identifier);
      if (!call) return;
 
      const rank         = index + 1;
      const isExpandable = index < 6;
      const actionLabel  = clampActionLabel(review, call);
      const primaryTheme = getPrimaryThemeForGrant(call);
      const deadline     = call.deadlineDate
        ? new Date(call.deadlineDate).toLocaleDateString('nl-NL')
        : 'Onbekend';
      const callId = `call-${index}`;
 
      // Score display: "AI 88 · Fit 90" in één span
      const aiScore  = review.aiRelevanceScore ?? 0;
      const fitScore = review.projectFitScore  ?? 0;
      const scoreCls = aiScore >= 70 ? 'score--high' : aiScore >= 50 ? 'score--mid' : 'score--low';
 
      // Snapshot: AI-gegenereerde reden (1 zin) of deterministisch fallback
      const snapshotReden = (review.snapshotReden && review.snapshotReden.length > 20)
        ? review.snapshotReden
        : getCallScope(call);
 
      // Waarom relevant: gebruik nieuw array-veld, anders rationale splitsen
      let whyBullets = [];
      if (Array.isArray(review.waaromRelevant) && review.waaromRelevant.length > 0) {
        whyBullets = review.waaromRelevant.slice(0, 2);
      } else if (review.rationale) {
        whyBullets = review.rationale
          .split(/(?<=[.!?])\s+/)
          .slice(0, 2)
          .map(s => cleanBulletText(s.trim()))
          .filter(s => s.length > 10);
      }
 
      // Concreet RWS-project: verberg als placeholder
      const possibleProject = getPossibleRwsProject(review);
 
      // Context: resterende zin(nen) uit rationale + RAG-items
      const rationaleResterende = review.rationale
        ? review.rationale.split(/(?<=[.!?])\s+/).slice(2, 5).map(s => s.trim()).filter(s => s.length > 10).join(' ')
        : '';
      const ragTag = review.ragMatchedItems?.length
        ? `RAG: ${review.ragMatchedItems.join(', ')}.`
        : '';
      const contextText = [rationaleResterende, ragTag].filter(Boolean).join(' ');
 
      const uncertainty = review.uncertainties || '';
      const nextStep    = review.recommendedNextStep || '';
      const actionCls   = actionLabel.toLowerCase().replace(/\s+/g, '-');
 
      html += `
        <article class="compact-call${isExpandable ? '' : ' compact-call--static'}" id="${callId}">
 
          <!-- Bovenrij: rank + badges -->
          <div class="compact-call__top">
            <span class="compact-call__rank">#${rank}</span>
            <div class="compact-call__badges">
              <span class="compact-call__theme">${escapeHtml(primaryTheme)}</span>
              <span class="compact-call__status ${getStatusBadgeClass(call.status)}">${escapeHtml(call.status?.label || 'Onbekend')}</span>
              <span class="compact-call__action-label action-label--${actionCls}">${escapeHtml(actionLabel)}</span>
            </div>
          </div>
 
          <!-- Titel -->
          <h4 class="compact-call__title">${escapeHtml(call.title)}</h4>
 
          <!-- Meta: ID · programma · deadline -->
          <div class="compact-call__meta">
            <span class="compact-call__id">${escapeHtml(call.identifier)}</span>
            <span class="compact-call__sep">&middot;</span>
            <span class="compact-call__programme">${escapeHtml(call.frameworkProgrammes?.[0]?.label || 'EU')}</span>
            <span class="compact-call__sep">&middot;</span>
            <span class="compact-call__deadline">Deadline: ${escapeHtml(deadline)}</span>
          </div>
 
          <!-- Scores: gecombineerd -->
          <div class="compact-call__scores">
            <span class="compact-call__score-combined ${scoreCls}">AI ${aiScore} &middot; Fit ${fitScore}</span>
          </div>
 
          <!-- Snapshot: 1 zin waarom relevant -->
          <p class="compact-call__snapshot">${escapeHtml(snapshotReden)}</p>
 
          ${isExpandable ? `
          <!-- Expanded content -->
          <div class="compact-call__content" id="${callId}-content" aria-hidden="true">
 
            ${whyBullets.length ? `
            <div class="compact-call__section">
              <h5 class="compact-call__section-title">Waarom relevant</h5>
              <ul class="compact-call__bullets">
                ${whyBullets.map(b => `<li class="compact-call__bullet">${escapeHtml(cleanBulletText(b))}</li>`).join('')}
              </ul>
            </div>` : ''}
 
            ${possibleProject ? `
            <div class="compact-call__section">
              <h5 class="compact-call__section-title">Concreet RWS-project</h5>
              <p class="compact-call__text">${escapeHtml(possibleProject)}</p>
            </div>` : ''}
 
            ${uncertainty ? `
            <div class="compact-call__section">
              <h5 class="compact-call__section-title">Onzekerheid</h5>
              <p class="compact-call__text">${escapeHtml(uncertainty)}</p>
            </div>` : ''}
 
            ${nextStep ? `
            <div class="compact-call__section">
              <h5 class="compact-call__section-title">Volgende stap</h5>
              <p class="compact-call__text">${escapeHtml(nextStep)}</p>
            </div>` : ''}
 
            ${contextText ? `
            <div class="compact-call__section compact-call__section--context">
              <h5 class="compact-call__section-title">Context</h5>
              <p class="compact-call__text compact-call__text--small">${escapeHtml(contextText)}</p>
            </div>` : ''}
 
          </div>
 
          <!-- Footer: expand-knop onderaan + open call -->
          <div class="compact-call__footer">
            <button class="compact-call__toggle" aria-expanded="false" aria-controls="${callId}-content">
              <span class="compact-call__toggle-icon">&#9660;</span>
              <span class="compact-call__toggle-text">Bekijk details</span>
            </button>
            ${call.url ? `<a class="compact-call__open" href="${call.url}" target="_blank" rel="noreferrer">Open call &#8594;</a>` : ''}
          </div>` : `
          <!-- Static (rank 7+): alleen open call link -->
          <div class="compact-call__footer">
            ${call.url ? `<a class="compact-call__open" href="${call.url}" target="_blank" rel="noreferrer">Open call &#8594;</a>` : ''}
          </div>`}
 
        </article>`;
    });
 
    html += `</div></div>`;
  }
 
  // 5. Watchlist
  const watchlistCalls = getWatchlistCalls(reviews);
  if (watchlistCalls.length > 0) {
    html += `
    <div class="briefing-section">
      <h3 class="briefing-section__title">Watchlist</h3>
      <div class="watchlist">`;
 
    watchlistCalls.forEach(review => {
      const call = getCallByIdentifier(review.identifier);
      if (!call) return;
 
      const actionLabel  = clampActionLabel(review, call);
      const primaryTheme = getPrimaryThemeForGrant(call);
 
      let watchlistReason = '';
      if (review.projectFitScore >= review.aiRelevanceScore + 15) {
        watchlistReason = `Projectfit (${review.projectFitScore}) hoger dan AI-score (${review.aiRelevanceScore}) \u2014 relevant als projectidee concreter wordt.`;
      } else if (review.aiRelevanceScore >= 45 && review.aiRelevanceScore <= 70) {
        watchlistReason = `Score in monitorrange (${review.aiRelevanceScore}/100) \u2014 ${actionLabel}.`;
      } else {
        watchlistReason = `Actie: ${actionLabel}.`;
      }
 
      html += `
        <article class="watchlist-item">
          <div class="watchlist-item__header">
            <h4 class="watchlist-item__title">${escapeHtml(call.title)}</h4>
            <span class="watchlist-item__id">${escapeHtml(call.identifier)}</span>
          </div>
          <div class="watchlist-item__meta">
            <span class="watchlist-item__theme">${escapeHtml(primaryTheme)}</span>
            <span class="watchlist-item__score">AI: ${review.aiRelevanceScore}/100</span>
          </div>
          <p class="watchlist-item__reason">${escapeHtml(watchlistReason)}</p>
          ${call.url ? `<a class="watchlist-item__open" href="${call.url}" target="_blank" rel="noreferrer">Open</a>` : ''}
        </article>`;
    });
 
    html += `</div></div>`;
  }
 
  // 6. Vervolgacties
  const nextActions = getDeduplicatedNextActions(reviews);
  if (nextActions.length > 0) {
    html += `
    <div class="briefing-section">
      <h3 class="briefing-section__title">Vervolgacties</h3>
      <ul class="next-actions">
        ${nextActions.map(a => `<li class="next-action"><strong>${escapeHtml(a.callId)}:</strong> ${escapeHtml(a.action)}</li>`).join('')}
      </ul>
    </div>`;
  }
 
  // 7. Aannames en beperkingen
  html += `
    <div class="briefing-section briefing-disclaimer">
      <h3 class="briefing-section__title">Aannames en beperkingen</h3>
      <ul class="briefing-disclaimer__items">
        <li class="briefing-disclaimer__item">Scores zijn AI-gegenereerd en indicatief, geen garantie op volledigheid.</li>
        <li class="briefing-disclaimer__item">Thema-toewijzing is automatisch en dient gecontroleerd te worden.</li>
        <li class="briefing-disclaimer__item">Periode &ldquo;${escapeHtml(activePeriod)}&rdquo;: open calls gefilterd op openingsdatum; forthcoming calls op datum eerste signalering door de radar.</li>
        <li class="briefing-disclaimer__item">Shortlist is een vergaderhulpmiddel, geen definitief subsidiebesluit.</li>
      </ul>
    </div>`;
 
  container.innerHTML = html;
 
  // Expand/collapse
  setTimeout(() => {
    document.querySelectorAll('.compact-call__toggle').forEach(button => {
      button.addEventListener('click', () => {
        const callArticle = button.closest('.compact-call');
        const content     = document.getElementById(`${callArticle.id}-content`);
        if (!content) return;
 
        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!isExpanded));
        content.setAttribute('aria-hidden', String(isExpanded));
 
        button.querySelector('.compact-call__toggle-icon').innerHTML = isExpanded ? '&#9660;' : '&#9650;';
        button.querySelector('.compact-call__toggle-text').textContent = isExpanded ? 'Bekijk details' : 'Minder';
      });
    });
  }, 100);
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
    ragMatchedItems:     Array.isArray(review.ragMatchedItems) ? review.ragMatchedItems : [],
    snapshotReden:       review.snapshotReden || '',
    waaromRelevant:      Array.isArray(review.waaromRelevant) ? review.waaromRelevant : []
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

// ── Auth Functions ────────────────────────────────────────────
async function checkAuthSession() {
  if (!supabase) return;
  
  state.auth.loading = true;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      state.auth.session = session;
      state.auth.user = session.user;
      state.auth.error = null;
    }
  } catch (error) {
    console.error('Auth check failed:', error.message);
    state.auth.error = error.message;
  } finally {
    state.auth.loading = false;
    updateAuthUI();
  }
}

async function signInWithEmail(email, password) {
  if (!supabase) {
    state.auth.error = 'Supabase client not initialized';
    updateAuthUI();
    return false;
  }
  
  state.auth.loading = true;
  state.auth.error = null;
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) throw error;
    
    state.auth.session = data.session;
    state.auth.user = data.user;
    
    // Create profile if it doesn't exist
    await createUserProfileIfNotExists();
    
    // Load saved searches
    await loadSavedSearches();
    
    updateAuthUI();
    return true;
  } catch (error) {
    console.error('Sign in failed:', error.message);
    state.auth.error = error.message;
    updateAuthUI();
    return false;
  } finally {
    state.auth.loading = false;
  }
}

async function signUpWithEmail(email, password, displayName) {
  if (!supabase) {
    state.auth.error = 'Supabase client not initialized';
    updateAuthUI();
    return false;
  }
  
  state.auth.loading = true;
  state.auth.error = null;
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });
    
    if (error) throw error;
    
    state.auth.session = data.session;
    state.auth.user = data.user;
    
    // Create profile
    await createUserProfileIfNotExists();
    
    updateAuthUI();
    return true;
  } catch (error) {
    console.error('Sign up failed:', error.message);
    state.auth.error = error.message;
    updateAuthUI();
    return false;
  } finally {
    state.auth.loading = false;
  }
}

async function signOut() {
  if (!supabase) {
    state.auth.user = null;
    state.auth.session = null;
    state.savedSearches = [];
    updateAuthUI();
    return;
  }
  
  state.auth.loading = true;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    state.auth.user = null;
    state.auth.session = null;
    state.savedSearches = [];
    
    updateAuthUI();
  } catch (error) {
    console.error('Sign out failed:', error.message);
    state.auth.error = error.message;
    updateAuthUI();
  } finally {
    state.auth.loading = false;
  }
}

async function createUserProfileIfNotExists() {
  if (!supabase || !state.auth.user) return;
  
  try {
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', state.auth.user.id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('Profile check failed:', fetchError.message);
      return;
    }
    
    if (!existingProfile) {
      // Create new profile
      const displayName = state.auth.user.user_metadata?.display_name ||
                         state.auth.user.email.split('@')[0];
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: state.auth.user.id,
          email: state.auth.user.email,
          display_name: displayName
        });
      
      if (insertError) {
        console.error('Profile creation failed:', insertError.message);
      }
    }
  } catch (error) {
    console.error('Profile management failed:', error.message);
  }
}

function updateAuthUI() {
  if (!elements.authStatus || !elements.userGreeting) return;
  
  if (state.auth.user) {
    // Signed in
    elements.authStatus.classList.add('signed-in');
    elements.userGreeting.textContent = `Signed in as ${state.auth.user.email}`;
    elements.signInButton.hidden = true;
    elements.signUpButton.hidden = true;
    elements.signOutButton.hidden = false;
  } else {
    // Signed out
    elements.authStatus.classList.remove('signed-in');
    elements.userGreeting.textContent = 'Not signed in';
    elements.signInButton.hidden = false;
    elements.signUpButton.hidden = false;
    elements.signOutButton.hidden = true;
  }
}

function showAuthModal(type = 'signin') {
  // Remove existing modal if any
  const existingModal = document.querySelector('.auth-modal');
  if (existingModal) existingModal.remove();
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'auth-modal';
  
  const content = document.createElement('div');
  content.className = 'auth-modal-content';
  
  if (type === 'signin') {
    content.innerHTML = `
      <h2>Sign In</h2>
      ${state.auth.error ? `<div class="auth-error">${state.auth.error}</div>` : ''}
      ${state.auth.success ? `<div class="auth-success">${state.auth.success}</div>` : ''}
      <form class="auth-form">
        <input type="email" id="email-input" placeholder="Email" required>
        <input type="password" id="password-input" placeholder="Password" required>
        <button type="submit" id="confirm-signin">Sign In</button>
        <button type="button" id="cancel-auth" class="ghost-button">Cancel</button>
      </form>
      <p>Don't have an account? <button id="switch-to-signup" class="ghost-button">Sign Up</button></p>
      <p><button id="forgot-password" class="ghost-button">Forgot password?</button></p>
    `;
  } else {
    content.innerHTML = `
      <h2>Sign Up</h2>
      ${state.auth.error ? `<div class="auth-error">${state.auth.error}</div>` : ''}
      <form class="auth-form">
        <input type="text" id="display-name-input" placeholder="Display Name" required>
        <input type="email" id="email-input" placeholder="Email" required>
        <input type="password" id="password-input" placeholder="Password" required>
        <button type="submit" id="confirm-signup">Sign Up</button>
        <button type="button" id="cancel-auth" class="ghost-button">Cancel</button>
      </form>
      <p>Already have an account? <button id="switch-to-signin" class="ghost-button">Sign In</button></p>
    `;
  }
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event handlers
  const form = content.querySelector('.auth-form');
  const cancelBtn = content.querySelector('#cancel-auth');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (type === 'signin') {
      const email = content.querySelector('#email-input').value;
      const password = content.querySelector('#password-input').value;
      await signInWithEmail(email, password);
    } else {
      const displayName = content.querySelector('#display-name-input').value;
      const email = content.querySelector('#email-input').value;
      const password = content.querySelector('#password-input').value;
      await signUpWithEmail(email, password, displayName);
    }
    
    if (state.auth.user) {
      modal.remove();
    }
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  const switchToSignup = content.querySelector('#switch-to-signup');
  if (switchToSignup) {
    switchToSignup.addEventListener('click', () => {
      modal.remove();
      showAuthModal('signup');
    });
  }
  
  const switchToSignin = content.querySelector('#switch-to-signin');
  if (switchToSignin) {
    switchToSignin.addEventListener('click', () => {
      modal.remove();
      showAuthModal('signin');
    });
  }

  const forgotPasswordBtn = content.querySelector('#forgot-password');
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', () => {
      modal.remove();
      showPasswordResetRequestForm();
    });
  }
}

// Password Reset Functions
async function requestPasswordReset(email) {
  if (!supabase) {
    state.auth.error = 'Supabase client not initialized';
    updateAuthUI();
    return false;
  }

  if (!email) {
    state.auth.error = 'Please enter your email address';
    updateAuthUI();
    return false;
  }

  try {
    state.auth.loading = true;
    state.auth.error = null;
    updateAuthUI();

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`
    });

    // Safe logging - don't log sensitive data
    console.log('Password reset response:', {
      hasData: !!data,
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorStatus: error?.status
    });

    if (error) {
      // Show specific Supabase error in UI
      const errorMessage = error.message || 'Failed to send password reset email';
      console.error('Password reset error details:', {
        code: error.code,
        message: errorMessage,
        status: error.status
      });
      throw error;
    }

    // Only show success if no error
    if (!error) {
      state.auth.success = 'Password reset email sent! Check your inbox.';
      updateAuthUI();
    }
    return !error;

  } catch (error) {
    console.error('Password reset failed:', error.message);
    // Show the actual Supabase error message in UI
    state.auth.error = error.message || 'Failed to send password reset email';
    updateAuthUI();
    return false;
  } finally {
    state.auth.loading = false;
    updateAuthUI();
  }
}

function showPasswordResetRequestForm() {
  // Remove existing modal if any
  const existingModal = document.querySelector('.auth-modal');
  if (existingModal) existingModal.remove();
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'auth-modal';
  
  const content = document.createElement('div');
  content.className = 'auth-modal-content';
  
  content.innerHTML = `
    <h2>Reset Password</h2>
    ${state.auth.error ? `<div class="auth-error">${state.auth.error}</div>` : ''}
    ${state.auth.success ? `<div class="auth-success">${state.auth.success}</div>` : ''}
    <p>Enter your email address and we'll send you a link to reset your password.</p>
    <form class="auth-form">
      <input type="email" id="reset-email-input" placeholder="Email" required>
      <button type="submit" id="request-reset">Send Reset Link</button>
      <button type="button" id="cancel-reset-request" class="ghost-button">Cancel</button>
    </form>
    <p><button id="back-to-signin" class="ghost-button">Back to Sign In</button></p>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event handlers
  const form = content.querySelector('.auth-form');
  const cancelBtn = content.querySelector('#cancel-reset-request');
  const backToSignInBtn = content.querySelector('#back-to-signin');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = content.querySelector('#reset-email-input').value;
    await requestPasswordReset(email);
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.remove();
    state.auth.error = null;
    state.auth.success = null;
  });
  
  backToSignInBtn.addEventListener('click', () => {
    modal.remove();
    state.auth.error = null;
    state.auth.success = null;
    showAuthModal('signin');
  });
}

function showPasswordResetForm() {
  // Remove existing modal if any
  const existingModal = document.querySelector('.auth-modal');
  if (existingModal) existingModal.remove();
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'auth-modal';
  
  const content = document.createElement('div');
  content.className = 'auth-modal-content';
  
  content.innerHTML = `
    <h2>Set New Password</h2>
    ${state.auth.error ? `<div class="auth-error">${state.auth.error}</div>` : ''}
    ${state.auth.success ? `<div class="auth-success">${state.auth.success}</div>` : ''}
    <form class="auth-form">
      <input type="password" id="new-password-input" placeholder="New Password" required>
      <input type="password" id="confirm-password-input" placeholder="Confirm New Password" required>
      <button type="submit" id="confirm-reset">Set New Password</button>
      <button type="button" id="cancel-reset" class="ghost-button">Cancel</button>
    </form>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event handlers
  const form = content.querySelector('.auth-form');
  const cancelBtn = content.querySelector('#cancel-reset');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = content.querySelector('#new-password-input').value;
    const confirmPassword = content.querySelector('#confirm-password-input').value;
    
    if (newPassword !== confirmPassword) {
      state.auth.error = 'Passwords do not match';
      updateAuthUI();
      return;
    }
    
    try {
      state.auth.loading = true;
      state.auth.error = null;
      updateAuthUI();
      
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        throw error;
      }
      
      state.auth.success = 'Password updated successfully! You can now sign in.';
      updateAuthUI();
      
      // Auto-close modal after 2 seconds
      setTimeout(() => {
        modal.remove();
        state.auth.success = null;
      }, 2000);
      
    } catch (error) {
      console.error('Password update failed:', error.message);
      state.auth.error = error.message || 'Failed to update password';
      updateAuthUI();
    } finally {
      state.auth.loading = false;
      updateAuthUI();
    }
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.remove();
    state.auth.error = null;
    state.auth.success = null;
  });
}

// ── Saved Search Functions ──────────────────────────────────
async function loadSavedSearches() {
  if (!supabase || !state.auth.user) {
    state.savedSearches = [];
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', state.auth.user.id)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    state.savedSearches = data || [];
  } catch (error) {
    console.error('Failed to load saved searches:', error.message);
    state.savedSearches = [];
  }
}

async function saveCurrentSearch(name = null) {
  if (!supabase || !state.auth.user) {
    alert('Please sign in to save searches');
    return false;
  }
  
  // Generate a name if not provided
  if (!name) {
    const queryParts = state.filters.query.trim().split(' ').slice(0, 3);
    const theme = state.filters.theme !== 'all' ? RWS_THEMES.find(t => t.id === state.filters.theme)?.label : null;
    name = queryParts.length > 0 ? queryParts.join(' ') : (theme || 'Untitled search');
  }
  
  const searchData = {
    user_id: state.auth.user.id,
    name: name,
    query: state.filters.query,
    project_idea: state.filters.projectIdea,
    filters: {
      status: state.filters.status,
      programme: state.filters.programme,
      theme: state.filters.theme,
      actionType: state.filters.actionType,
      recentMonths: state.filters.recentMonths,
      sort: state.filters.sort
    }
  };
  
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .insert(searchData)
      .select();
    
    if (error) throw error;
    
    // Add to local state
    state.savedSearches.unshift(data[0]);
    
    // Record this search run
    await recordSearchRun(data[0].id);
    
    return true;
  } catch (error) {
    console.error('Failed to save search:', error.message);
    alert('Failed to save search: ' + error.message);
    return false;
  }
}

async function recordSearchRun(savedSearchId = null) {
  if (!supabase || !state.auth.user) return;
  
  try {
    const { error } = await supabase
      .from('search_runs')
      .insert({
        user_id: state.auth.user.id,
        saved_search_id: savedSearchId,
        query: state.filters.query,
        filters: {
          status: state.filters.status,
          programme: state.filters.programme,
          theme: state.filters.theme,
          actionType: state.filters.actionType,
          recentMonths: state.filters.recentMonths,
          sort: state.filters.sort
        },
        result_count: state.filtered.length
      });
    
    if (error) throw error;
  } catch (error) {
    console.error('Failed to record search run:', error.message);
  }
}

async function applySavedSearch(searchId) {
  if (!supabase || !state.auth.user) return false;
  
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('id', searchId)
      .eq('user_id', state.auth.user.id)
      .single();
    
    if (error) throw error;
    if (!data) return false;
    
    // Apply the saved search filters
    state.filters.query = data.query || '';
    state.filters.projectIdea = data.project_idea || '';
    state.filters.status = data.filters?.status || 'live';
    state.filters.programme = data.filters?.programme || 'all';
    state.filters.theme = data.filters?.theme || 'all';
    state.filters.actionType = data.filters?.actionType || 'all';
    state.filters.recentMonths = data.filters?.recentMonths || 'all';
    state.filters.sort = data.filters?.sort || 'relevance-desc';
    
    resetPagination();
    syncControls();
    update();
    
    // Record this search run
    await recordSearchRun(searchId);
    
    return true;
  } catch (error) {
    console.error('Failed to apply saved search:', error.message);
    alert('Failed to apply saved search: ' + error.message);
    return false;
  }
}

async function deleteSavedSearch(searchId) {
  if (!supabase || !state.auth.user) return false;
  
  try {
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', searchId)
      .eq('user_id', state.auth.user.id);
    
    if (error) throw error;
    
    // Remove from local state
    state.savedSearches = state.savedSearches.filter(s => s.id !== searchId);
    
    return true;
  } catch (error) {
    console.error('Failed to delete saved search:', error.message);
    alert('Failed to delete saved search: ' + error.message);
    return false;
  }
}

function showSaveSearchModal() {
  if (!state.auth.user) {
    alert('Please sign in to save searches');
    return;
  }
  
  // Remove existing modal if any
  const existingModal = document.querySelector('.save-search-modal');
  if (existingModal) existingModal.remove();
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'auth-modal save-search-modal';
  
  const content = document.createElement('div');
  content.className = 'auth-modal-content';
  
  // Generate default name
  const queryParts = state.filters.query.trim().split(' ').slice(0, 3);
  const theme = state.filters.theme !== 'all' ? RWS_THEMES.find(t => t.id === state.filters.theme)?.label : null;
  const defaultName = queryParts.length > 0 ? queryParts.join(' ') : (theme || 'Untitled search');
  
  content.innerHTML = `
    <h2>Save Current Search</h2>
    <form class="auth-form">
      <input type="text" id="search-name-input" placeholder="Search name" value="${defaultName}" required>
      <button type="submit" id="confirm-save-search">Save Search</button>
      <button type="button" id="cancel-save-search" class="ghost-button">Cancel</button>
    </form>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event handlers
  const form = content.querySelector('.auth-form');
  const cancelBtn = content.querySelector('#cancel-save-search');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = content.querySelector('#search-name-input').value;
    await saveCurrentSearch(name);
    modal.remove();
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
}

function renderSavedSearchesPanel() {
  if (!state.auth.user) return '';
  
  if (state.savedSearches.length === 0) {
    return `
      <div class="saved-searches-panel">
        <h3>Your Saved Searches</h3>
        <p>No saved searches yet. Save your current search to access it later.</p>
        <button id="save-current-search" class="ghost-button">Save Current Search</button>
      </div>
    `;
  }
  
  const searchItems = state.savedSearches.map(search => {
    const themeName = search.filters?.theme && search.filters.theme !== 'all'
      ? RWS_THEMES.find(t => t.id === search.filters.theme)?.label
      : 'All themes';
    
    return `
      <div class="saved-search-item" data-search-id="${search.id}">
        <div>
          <strong>${search.name}</strong>
          <div class="saved-search-meta">
            <small>${themeName} • ${search.filters?.status || 'live'}</small>
          </div>
        </div>
        <div class="saved-search-actions">
          <button class="apply-search-btn ghost-button" data-search-id="${search.id}">Apply</button>
          <button class="delete-search-btn ghost-button" data-search-id="${search.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <div class="saved-searches-panel">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3>Your Saved Searches</h3>
        <button id="save-current-search" class="ghost-button">Save Current Search</button>
      </div>
      <div class="saved-search-list">
        ${searchItems}
      </div>
    </div>
  `;
}

function wireSavedSearchEvents() {
  // Save current search button
  document.querySelector('#save-current-search')?.addEventListener('click', showSaveSearchModal);
  
  // Apply search buttons
  document.querySelectorAll('.apply-search-btn')?.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const searchId = e.target.dataset.searchId;
      await applySavedSearch(searchId);
    });
  });
  
  // Delete search buttons
  document.querySelectorAll('.delete-search-btn')?.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const searchId = e.target.dataset.searchId;
      if (confirm('Delete this saved search?')) {
        await deleteSavedSearch(searchId);
        update(); // Refresh UI
      }
    });
  });
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
  
  // Auth event handlers
  elements.signInButton?.addEventListener('click', () => showAuthModal('signin'));
  elements.signUpButton?.addEventListener('click', () => showAuthModal('signup'));
  elements.signOutButton?.addEventListener('click', signOut);
  window.addEventListener('hashchange', () => { parseHash(); syncControls(); update(); });
}

// ── Bootstrap ─────────────────────────────────────────────────
async function init() {
  loadSavedCalls();
  loadPipeline();
  parseHash();
  
  // Initialize auth
  await checkAuthSession();
  
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
