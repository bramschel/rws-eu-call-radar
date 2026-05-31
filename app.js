const DATA_URL = './data/grants.json';
const AI_API_URL = window.location.hostname.includes('vercel.app')
  ? '/api/score'
  : '';
const PAGE_STEP = 50;
const SAVED_CALLS_STORAGE_KEY = 'rws-eu-call-radar-saved-calls';
const STATUS_OPTIONS = [
  { id: 'live', label: 'Live', matches: new Set(['31094501', '31094502']) },
  { id: '31094502', label: 'Open', matches: new Set(['31094502']) },
  { id: '31094501', label: 'Forthcoming', matches: new Set(['31094501']) }
];
const RWS_THEMES = [
  {
    id: 'corridor-management',
    label: 'Corridor Management',
    description: 'Transportcorridors, vaarwegen, TEN-T, multimodaliteit, verkeersmanagement en slimme mobiliteit.',
    terms: [
      'corridor management',
      'TEN-T',
      'trans-European transport network',
      'transport corridor',
      'inland waterways',
      'waterborne transport',
      'navigation',
      'shipping',
      'ports',
      'port areas',
      'multimodal transport',
      'logistics',
      'traffic management',
      'network management',
      'smart mobility',
      'cooperative intelligent transport systems',
      'C-ITS',
      'ITS',
      'River Information Services',
      'RIS',
      'cross-border transport',
      'transport infrastructure',
      'mobility corridor'
    ]
  },
  {
    id: 'climate-adaptation',
    label: 'Climate Adaptation',
    description: 'Klimaatbestendige infrastructuur, waterveiligheid, droogte, hitte, overstroming en resilience.',
    terms: [
      'climate adaptation',
      'climate resilience',
      'resilient infrastructure',
      'adaptive infrastructure',
      'flood risk',
      'flood safety',
      'flood protection',
      'flood preparedness',
      'water security',
      'water resilience',
      'sea level rise',
      'storm surge',
      'extreme weather',
      'heat stress',
      'drought',
      'freshwater availability',
      'fresh water',
      'water management',
      'river basin',
      'coastal resilience',
      'urban resilience',
      'climate proof',
      'climate-proof'
    ]
  },
  {
    id: 'sustainability',
    label: 'Sustainability / Duurzame Leefomgeving',
    description: 'Duurzame infrastructuur, circulariteit, klimaatneutraliteit, biodiversiteit, natuur en waterkwaliteit.',
    terms: [
      'sustainability',
      'sustainable infrastructure',
      'sustainable land use',
      'sustainable water management',
      'circular economy',
      'circular infrastructure',
      'material reuse',
      'reuse of materials',
      'secondary raw materials',
      'asphalt recycling',
      'recycling',
      'circular procurement',
      'zero-emission construction',
      'zero emission construction',
      'low carbon construction',
      'climate-neutral infrastructure',
      'carbon neutral',
      'carbon-neutral',
      'energy neutral',
      'biodiversity',
      'nature-inclusive infrastructure',
      'nature inclusive infrastructure',
      'habitat restoration',
      'ecosystem restoration',
      'nature-based solutions',
      'nature based solutions',
      'building with nature',
      'green infrastructure',
      'blue infrastructure',
      'green and blue infrastructure',
      'water quality',
      'water pollution',
      'wastewater',
      'ecology'
    ]
  },
  {
    id: 'digitalisation',
    label: 'Digitalisation',
    description: 'Data, AI, digital twins, smart infrastructure, automatisering, informatievoorziening en besluitvorming.',
    terms: [
      'digitalisation',
      'digitalization',
      'data',
      'data governance',
      'data-driven',
      'data driven',
      'information systems',
      'information management',
      'artificial intelligence',
      'AI',
      'machine learning',
      'decision support',
      'digital twin',
      'digital twins',
      'smart infrastructure',
      'smart mobility',
      'automation',
      'automated systems',
      'predictive maintenance',
      'sensor data',
      'remote sensing',
      'cybersecurity',
      'interoperability',
      'C-ITS',
      'ITS',
      'River Information Services',
      'RIS',
      'traffic data',
      'mobility data'
    ]
  },
  {
    id: 'network-governance',
    label: 'Network Governance',
    description: 'Internationale samenwerking, harmonisatie, standaardisatie, beleidsinstrumenten en netwerkcoördinatie.',
    terms: [
      'network governance',
      'governance',
      'cross-border cooperation',
      'cross border cooperation',
      'international cooperation',
      'European cooperation',
      'coordination',
      'co-ordination',
      'harmonisation',
      'harmonization',
      'standardisation',
      'standardization',
      'interoperability',
      'policy instruments',
      'capacity building',
      'institutional cooperation',
      'stakeholder cooperation',
      'partnerships',
      'public authorities',
      'public administration',
      'regulatory framework',
      'knowledge exchange',
      'best practices',
      'European networks',
      'network operators',
      'road authorities',
      'water authorities'
    ]
  }
];

const IMPORTANT_PHRASES = [
  {
    phrase: 'material reuse',
    theme: 'sustainability',
    weight: 28
  },
  {
    phrase: 'reuse of materials',
    theme: 'sustainability',
    weight: 28
  },
  {
    phrase: 'circular infrastructure',
    theme: 'sustainability',
    weight: 32
  },
  {
    phrase: 'asphalt recycling',
    theme: 'sustainability',
    weight: 30
  },
  {
    phrase: 'circular procurement',
    theme: 'sustainability',
    weight: 24
  },
  {
    phrase: 'nature-based solutions',
    theme: 'sustainability',
    weight: 26
  },
  {
    phrase: 'water quality',
    theme: 'sustainability',
    weight: 20
  },
  {
    phrase: 'climate resilient infrastructure',
    theme: 'climate-adaptation',
    weight: 34
  },
  {
    phrase: 'climate resilience',
    theme: 'climate-adaptation',
    weight: 24
  },
  {
    phrase: 'flood risk',
    theme: 'climate-adaptation',
    weight: 28
  },
  {
    phrase: 'flood protection',
    theme: 'climate-adaptation',
    weight: 28
  },
  {
    phrase: 'sea level rise',
    theme: 'climate-adaptation',
    weight: 26
  },
  {
    phrase: 'river basin',
    theme: 'climate-adaptation',
    weight: 22
  },
  {
    phrase: 'inland waterways',
    theme: 'corridor-management',
    weight: 30
  },
  {
    phrase: 'river information services',
    theme: 'corridor-management',
    weight: 30
  },
  {
    phrase: 'TEN-T corridor',
    theme: 'corridor-management',
    weight: 30
  },
  {
    phrase: 'traffic management',
    theme: 'corridor-management',
    weight: 22
  },
  {
    phrase: 'digital twin',
    theme: 'digitalisation',
    weight: 30
  },
  {
    phrase: 'decision support',
    theme: 'digitalisation',
    weight: 22
  },
  {
    phrase: 'predictive maintenance',
    theme: 'digitalisation',
    weight: 26
  },
  {
    phrase: 'sensor data',
    theme: 'digitalisation',
    weight: 20
  },
  {
    phrase: 'network governance',
    theme: 'network-governance',
    weight: 30
  },
  {
    phrase: 'cross-border cooperation',
    theme: 'network-governance',
    weight: 24
  },
  {
    phrase: 'interoperability',
    theme: 'network-governance',
    weight: 18
  },
  {
    phrase: 'harmonisation',
    theme: 'network-governance',
    weight: 18
  }
];

const RWS_DOMAIN_TERMS = [
  'infrastructure',
  'transport infrastructure',
  'road infrastructure',
  'roads',
  'highways',
  'bridges',
  'tunnels',
  'asset management',
  'maintenance',
  'renovation',
  'traffic management',
  'mobility',
  'smart mobility',
  'corridor',
  'TEN-T',
  'inland waterways',
  'waterways',
  'navigation',
  'shipping',
  'ports',
  'river',
  'river basin',
  'flood risk',
  'flood protection',
  'water safety',
  'water management',
  'coastal',
  'sea level rise',
  'drought',
  'digital twin',
  'sensor data',
  'decision support',
  'predictive maintenance',
'water infrastructure',
'flood management',
'flood resilience',
'flood defence',
'flood defense',
'stormwater',
'river management',
'coastal management',
'coastal protection',
'dike',
'dyke',
'levee',
'waterway infrastructure',
'climate-proof infrastructure',
'climate proof infrastructure',
'infrastructure resilience',
'road resilience',
'bridge resilience',
'tunnel resilience'
];

const STRONG_RWS_DOMAIN_TERMS = [
  'transport infrastructure',
  'road infrastructure',
  'water infrastructure',
  'climate resilient infrastructure',
  'climate-proof infrastructure',
  'climate proof infrastructure',
  'infrastructure resilience',
  'asset management',
  'traffic management',
  'inland waterways',
  'waterways',
  'waterway infrastructure',
  'navigation',
  'shipping',
  'ports',
  'river basin',
  'river management',
  'flood risk',
  'flood protection',
  'flood management',
  'flood resilience',
  'flood defence',
  'flood defense',
  'coastal management',
  'coastal protection',
  'sea level rise',
  'dike',
  'dyke',
  'levee',
  'digital twin',
  'sensor data',
  'decision support',
  'predictive maintenance',
  'TEN-T',
  'corridor management',
  'River Information Services',
  'RIS'
];

const LOW_RWS_FIT_TERMS = [
  'farmer',
  'farmers',
  'farming',
  'farm profitability',
  'agriculture',
  'agricultural',
  'agri-food',
  'agrifood',
  'crop',
  'crops',
  'livestock',
  'rural development',
  'food systems',
  'food chain',
  'soil fertility',
  'farm income',
  'common agricultural policy',
  'CAP',
'agricultural productivity',
'agricultural production',
'farmer income',
'farmers income',
'farmers profitability',
'farmer profitability',
'farm management',
'farm advisory',
'agricultural advisory',
'agricultural value chain',
'food production',
'food security',
'soil health',
'agroecology',
'agri sector',
'agricultural sector'
];

const NOISE_TERMS = [
  'clinical trial',
  'medical device',
  'pharmaceutical',
  'oncology',
  'rare diseases',
  'school curriculum',
  'performing arts',
  'film festival',
  'space telescope'
];

const state = {
  data: null,
  filtered: [],
  savedIds: new Set(),
  visibleCount: PAGE_STEP,
  aiReviews: new Map(), // identifier → review van batch-analyse
  aiRerankActive: false,
  filters: {
    query: '',
    projectIdea: '',
    status: 'live',
    programme: 'all',
    theme: 'all',
    recentMonths: 'all',
    sort: 'relevance-desc'
  }
};

const elements = {
  projectInput: document.querySelector('#project-input'),
  searchInput: document.querySelector('#search-input'),
  statusPills: document.querySelector('#status-pills'),
  programmeSelect: document.querySelector('#programme-select'),
  themeSelect: document.querySelector('#theme-select'),
  recentSelect: document.querySelector('#recent-select'),
  sortSelect: document.querySelector('#sort-select'),
  resetButton: document.querySelector('#reset-button'),
  metricTotal: document.querySelector('#metric-total'),
  metricLive: document.querySelector('#metric-live'),
  metricBudget: document.querySelector('#metric-budget'),
  lastUpdated: document.querySelector('#last-updated'),
  sourceCount: document.querySelector('#source-count'),
  resultsCount: document.querySelector('#results-count'),
  resultsHeadline: document.querySelector('#results-headline'),
  resultsList: document.querySelector('#results-list'),
  loadMoreButton: document.querySelector('#load-more-button'),
  savedCallsCount: document.querySelector('#saved-calls-count'),
  savedCallsList: document.querySelector('#saved-calls-list'),
  exportSavedButton: document.querySelector('#export-saved-button'),
  clearSavedButton: document.querySelector('#clear-saved-button'),
  topProgrammes: document.querySelector('#top-programmes'),
  grantCardTemplate: document.querySelector('#grant-card-template')
};

const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const moneyCompact = new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });
const stampFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

function parseHash() {
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);

  state.filters.query = params.get('q') || '';
  state.filters.projectIdea = params.get('idea') || '';
  state.filters.status = params.get('s') || 'live';
  state.filters.programme = params.get('p') || 'all';
  state.filters.theme = params.get('theme') || 'all';
  state.filters.recentMonths = params.get('recent') || 'all'; 
  state.filters.sort = params.get('sort') || 'relevance-desc';
}                                                                                                                                                                                                                                                                                                                                                                                       

function writeHash() {
  const params = new URLSearchParams();

  if (state.filters.query) {
    params.set('q', state.filters.query);
  }

  if (state.filters.projectIdea) {
    params.set('idea', state.filters.projectIdea);
  }

  if (state.filters.status !== 'live') {
    params.set('s', state.filters.status);
  }

  if (state.filters.programme !== 'all') {
    params.set('p', state.filters.programme);
  }

  if (state.filters.theme !== 'all') {
    params.set('theme', state.filters.theme);
  }

  if (state.filters.recentMonths !== 'all') {
    params.set('recent', state.filters.recentMonths);
  }

  if (state.filters.sort !== 'relevance-desc') {
    params.set('sort', state.filters.sort);
  }

  const nextHash = params.toString();
  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
  window.history.replaceState(null, '', nextUrl);
}

function formatDate(value) {
  if (!value) return 'TBA';
  return dateFormatter.format(new Date(value));
}

function formatStampDate(value) {
  if (!value) return 'TBA';
  return stampFormatter.format(new Date(value));
}

function formatCurrency(value) {
  if (!value) return 'Unknown';
  return moneyCompact.format(value);
}

function subtractMonths(date, months) {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setMonth(result.getMonth() - months);

  if (result.getDate() !== originalDay) {
    result.setDate(0);
  }

  return result;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textContainsAny(text, terms) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function scoreImportantPhrases(fields, selectedTheme) {
  let phraseScore = 0;
  const matchedPhrases = [];

  for (const item of IMPORTANT_PHRASES) {
    const normalizedPhrase = normalizeText(item.phrase);

    const matchedInTitle = fields.title.includes(normalizedPhrase);
    const matchedInSummary = fields.summary.includes(normalizedPhrase);
    const matchedInDestination = fields.destination.includes(normalizedPhrase);
    const matchedInAbstract = fields.abstract.includes(normalizedPhrase);
    const matchedInSearchText = fields.searchText.includes(normalizedPhrase);

    if (
      matchedInTitle ||
      matchedInSummary ||
      matchedInDestination ||
      matchedInAbstract ||
      matchedInSearchText
    ) {
      let weight = item.weight;

      if (matchedInTitle) {
        weight += 12;
      }

      if (matchedInSummary || matchedInDestination) {
        weight += 6;
      }

      if (selectedTheme !== 'all' && item.theme === selectedTheme) {
        weight += 10;
      }

      phraseScore += weight;
      matchedPhrases.push(item.phrase);
    }
  }

  return {
    phraseScore,
    matchedPhrases
 };
}

function splitTerms(value) {
  return normalizeText(value)
    .split(/[\s,;]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);
}

function getGrantTextFields(grant) {
  return {
    title: normalizeText(grant.title),
    summary: normalizeText(grant.summary),
    destination: normalizeText(grant.destination),
    abstract: normalizeText(grant.abstract),
    actionType: normalizeText(grant.actionType),
    searchText: normalizeText(grant.searchText)
  };
}

function calculateRelevance(grant, query, projectIdea) {
  const fields = getGrantTextFields(grant);
  const combinedInput = normalizeText([query, projectIdea].filter(Boolean).join(' '));
  const terms = splitTerms(combinedInput);

  const combinedGrantText = normalizeText([
    grant.title,
    grant.summary,
    grant.destination,
    grant.abstract,
    grant.actionType,
    grant.searchText
  ].filter(Boolean).join(' '));

  const hasRwsDomainFit = textContainsAny(combinedGrantText, RWS_DOMAIN_TERMS);
  const hasLowRwsFitContext = textContainsAny(combinedGrantText, LOW_RWS_FIT_TERMS);
  const hasStrongRwsDomainFit = textContainsAny(combinedGrantText, STRONG_RWS_DOMAIN_TERMS);

  let score = 0;
  let queryMatched = false;
  const matchedTerms = new Set();
  const matchedThemes = [];
  const reasons = [];

  const phraseResult = scoreImportantPhrases(fields, state.filters.theme);
  score += phraseResult.phraseScore;

  for (const term of terms) {
    let termMatched = false;

    if (fields.title.includes(term)) {
      score += 10;
      matchedTerms.add(term);
      termMatched = true;
    }

    if (fields.summary.includes(term)) {
      score += 6;
      matchedTerms.add(term);
      termMatched = true;
    }

    if (fields.destination.includes(term)) {
      score += 6;
      matchedTerms.add(term);
      termMatched = true;
    }

    if (fields.abstract.includes(term)) {
      score += 4;
      matchedTerms.add(term);
      termMatched = true;
    }

    if (fields.searchText.includes(term)) {
      score += 2;
      matchedTerms.add(term);
      termMatched = true;
    }

    if (termMatched) {
      queryMatched = true;
    }
  }

  for (const theme of RWS_THEMES) {
    let themeScore = 0;
    const themeMatches = [];

    for (const phrase of theme.terms) {
      const normalizedPhrase = normalizeText(phrase);

      if (
        fields.title.includes(normalizedPhrase) ||
        fields.summary.includes(normalizedPhrase) ||
        fields.destination.includes(normalizedPhrase) ||
        fields.abstract.includes(normalizedPhrase) ||
        fields.searchText.includes(normalizedPhrase)
      ) {
        themeScore += 8;
        themeMatches.push(phrase);
      }
    }

    if (themeScore > 0) {
      score += themeScore;
      matchedThemes.push({
        id: theme.id,
        label: theme.label,
        matches: themeMatches
      });
    }
  }

  for (const noiseTerm of NOISE_TERMS) {
    const normalizedNoise = normalizeText(noiseTerm);

    if (
      fields.title.includes(normalizedNoise) ||
      fields.summary.includes(normalizedNoise) ||
      fields.abstract.includes(normalizedNoise)
    ) {
      score -= 8;
    }
  }

  if (!combinedInput && matchedThemes.length === 0) {
    reasons.push('Geen zoekterm of themamatch; standaard live call getoond.');
  }

  if (matchedTerms.size > 0) {
    reasons.push(`Zoektermen gevonden: ${Array.from(matchedTerms).slice(0, 8).join(', ')}`);
  }

  if (matchedThemes.length > 0) {
    reasons.push(`Bureau Brussel-thema's: ${matchedThemes.map((theme) => theme.label).join(', ')}`);
  }

  if (phraseResult.matchedPhrases.length > 0) {
    reasons.push(`Sterke termcombinaties: ${phraseResult.matchedPhrases.slice(0, 8).join(', ')}`);
  }

  if (fields.title && terms.some((term) => fields.title.includes(term))) {
    reasons.push('Sterke match in titel.');
  }

  if (fields.abstract && terms.some((term) => fields.abstract.includes(term))) {
    reasons.push('Inhoudelijke match in abstract/scope.');
  }

  if (hasLowRwsFitContext && !hasStrongRwsDomainFit) {
    score = Math.min(score, 25);
    reasons.push('Lage RWS-fit: call lijkt primair gericht op landbouw, voedsel of rurale context zonder sterke infrastructuur-, waterveiligheids-, vaarweg- of mobiliteitscomponent.');
  }

  if (
    state.filters.theme === 'climate-adaptation' &&
    hasLowRwsFitContext &&
    !hasStrongRwsDomainFit
  ) {
    score = Math.min(score, 20);
    reasons.push('Niet passend als RWS Climate Adaptation: landbouw- of boerencontext zonder directe link met waterveiligheid, infrastructuur, rivieren, kust, vaarwegen, droogtebeheer of klimaatbestendig assetbeheer.');
  }

  return {
    score: Math.min(100, Math.max(0, score || 1)),
    queryMatched,
    matchedTerms: Array.from(matchedTerms),
    matchedPhrases: phraseResult.matchedPhrases,
    matchedThemes,
    reasons
  };
}

function loadSavedCalls() {
  try {
    const raw = localStorage.getItem(SAVED_CALLS_STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    state.savedIds = new Set(Array.isArray(ids) ? ids : []);
  } catch {
    state.savedIds = new Set();
  }
}

function persistSavedCalls() {
  localStorage.setItem(
    SAVED_CALLS_STORAGE_KEY,
    JSON.stringify(Array.from(state.savedIds))
  );
}

function getGrantSaveId(grant) {
  return String(grant.identifier || grant.id || '').trim();
}

function isGrantSaved(grant) {
  const id = getGrantSaveId(grant);

  if (!id) {
    return false;
  }

  return state.savedIds.has(id);
}

function toggleSavedGrant(grant) {
  const id = getGrantSaveId(grant);

  if (!id) {
    console.warn('Kan call niet bewaren: ontbrekende identifier', grant);
    return;
  }

  if (state.savedIds.has(id)) {
    state.savedIds.delete(id);
  } else {
    state.savedIds.add(id);
  }

  persistSavedCalls();
  update();
}

function getSavedGrants() {
  if (!state.data?.grants) {
    return [];
  }

  return state.data.grants.filter((grant) => state.savedIds.has(getGrantSaveId(grant)));
}

function escapeCsvValue(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function exportSavedCallsCsv() {
  const savedGrants = getSavedGrants();

  if (!savedGrants.length) {
    alert('Er zijn nog geen bewaarde calls om te exporteren.');
    return;
  }

  const headers = [
    'identifier',
    'title',
    'programme',
    'status',
    'openingDate',
    'deadlineDate',
    'actionType',
    'budgetEur',
    'expectedGrants',
    'relevanceScore',
    'bureauBrusselThemes',
    'matchedTerms',
    'relevanceReasons',
    'summary',
    'abstract',
    'url'
  ];

  const rows = savedGrants.map((grant) => {
    const themes = grant.relevance?.matchedThemes?.map((theme) => theme.label).join('; ') || '';
    const matchedTerms = grant.relevance?.matchedTerms?.join('; ') || '';
    const reasons = grant.relevance?.reasons?.join('; ') || '';

    return [
      grant.identifier,
      grant.title,
      getPrimaryProgramme(grant),
      grant.status?.label || '',
      grant.startDate || grant.plannedOpeningDate || '',
      grant.deadlineDate || '',
      grant.actionType || grant.kind?.label || '',
      grant.budget?.totalBudgetEur || '',
      grant.budget?.expectedGrants || '',
      grant.relevance?.score || '',
      themes,
      matchedTerms,
      reasons,
      grant.summary || grant.destination || grant.callTitle || '',
      grant.abstract || '',
      grant.url
    ].map(escapeCsvValue).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `rws-eu-call-radar-bewaarde-calls-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}

function toggleProgrammeFilter(programmeId) {
  state.filters.programme = state.filters.programme === programmeId ? 'all' : programmeId;
  state.visibleCount = PAGE_STEP;
  syncControls();
  update();
}

function getPrimaryProgramme(grant) {
  return grant.frameworkProgrammes[0]?.label || grant.programmeDivisions[0]?.label || grant.callIdentifier?.split('-')[0] || 'Programme unavailable';
}

function getStatusOption(id) {
  return STATUS_OPTIONS.find((option) => option.id === id) || STATUS_OPTIONS[0];
}

function filterGrants() {
  const query = state.filters.query.trim().toLowerCase();
  const projectIdea = state.filters.projectIdea.trim().toLowerCase();
  const combinedQuery = [query, projectIdea].filter(Boolean).join(' ');
  const statusOption = getStatusOption(state.filters.status);
  const now = Date.now();

  const recentMonths =
    state.filters.recentMonths === 'all'
      ? null
      : Number(state.filters.recentMonths);

  const recentCutoff =
    recentMonths && Number.isFinite(recentMonths)
      ? subtractMonths(new Date(), recentMonths).getTime()
      : null;

  state.filtered = state.data.grants
  .filter((grant) => {

    if (grant.deadlineDate && new Date(grant.deadlineDate).getTime() < now) {
      return false;
    }

      if (statusOption.matches && !statusOption.matches.has(grant.status.id)) {
        return false;
      }

      if (state.filters.programme !== 'all') {
        const programIds = new Set(grant.frameworkProgrammes.map((programme) => programme.id));
        if (!programIds.has(state.filters.programme)) {
          return false;
        }
      }

      if (recentCutoff && grant.startDate) {
        const startTime = new Date(grant.startDate).getTime();

        if (startTime < recentCutoff) {
          return false;
        }
      }

      const relevance = calculateRelevance(grant, query, projectIdea);
      grant.relevance = relevance;

if (state.filters.theme !== 'all') {
  const matchesSelectedTheme = relevance.matchedThemes.some((theme) => theme.id === state.filters.theme);

  if (!matchesSelectedTheme) {
    return false;
  }
}

if (combinedQuery && !relevance.queryMatched) {
  return false;
}

return true;
    })
    .sort((left, right) => {
      switch (state.filters.sort) {
        case 'relevance-desc': {
          return (right.relevance?.score || 0) - (left.relevance?.score || 0);
        }
        case 'deadline-asc': {
          return (new Date(left.deadlineDate || '2999-12-31').getTime()) - (new Date(right.deadlineDate || '2999-12-31').getTime());
        }
        case 'budget-desc': {
          return (right.budget?.totalBudgetEur || 0) - (left.budget?.totalBudgetEur || 0);
        }
        case 'title-asc': {
          return left.title.localeCompare(right.title);
        }
        case 'start-desc':
        default: {
          return (new Date(right.startDate || 0).getTime()) - (new Date(left.startDate || 0).getTime());
        }
      }
    });
}

function renderStatusPills() {
  elements.statusPills.innerHTML = '';
  const counts = state.data.summary.byStatus;

  for (const option of STATUS_OPTIONS) {
    const count = option.id === 'live'
      ? state.data.summary.total
      : (counts[option.id] || 0);

    const button = document.createElement('button');
    button.className = `status-pill${state.filters.status === option.id ? ' is-active' : ''}`;
    button.type = 'button';
    button.textContent = `${option.label} (${compactNumber.format(count)})`;
    button.addEventListener('click', () => {
      state.filters.status = option.id;
      state.visibleCount = PAGE_STEP;
      syncControls();
      update();
    });
    elements.statusPills.appendChild(button);
  }
}

function renderProgrammeOptions() {
  const option = document.createElement('option');
  option.value = 'all';
  option.textContent = 'All programmes';
  elements.programmeSelect.appendChild(option);

  for (const programme of state.data.facets.frameworkProgramme) {
    const nextOption = document.createElement('option');
    nextOption.value = programme.rawValue;
    nextOption.textContent = `${programme.value} (${compactNumber.format(programme.count)})`;
    elements.programmeSelect.appendChild(nextOption);
  }
}

function renderMetrics() {
  const openCount = state.data.summary.byStatus['31094502'] || 0;
  const workflowRefresh = state.data.source?.workflow || null;
  const updatedAt = workflowRefresh?.refreshedAt || state.data.generatedAt;
  const rawSourceCount =
    state.data.source?.storedResults
      ?? state.data.source?.totalResults
      ?? state.data.source?.reportedTotalResults
      ?? state.data.grants?.length
      ?? 0;
  const sourceCount = Number.isFinite(Number(rawSourceCount))
    ? Number(rawSourceCount)
    : (state.data.grants?.length || 0);

  elements.metricTotal.textContent = compactNumber.format(state.data.summary.total);
  elements.metricLive.textContent = compactNumber.format(openCount);
  elements.metricBudget.textContent = formatCurrency(state.data.summary.knownBudgetEur);
  elements.lastUpdated.textContent = formatStampDate(updatedAt);
  elements.lastUpdated.title = workflowRefresh?.workflowName
    ? `Open ${workflowRefresh.workflowName} run`
    : 'Last refresh timestamp';
  if (workflowRefresh?.runUrl) {
    elements.lastUpdated.href = workflowRefresh.runUrl;
  } else {
    elements.lastUpdated.removeAttribute('href');
  }
  elements.sourceCount.textContent = `${compactNumber.format(sourceCount)} current calls from the official EU index`;
}

function renderSidebar() {
  elements.topProgrammes.innerHTML = '';

  const programmes = state.data.facets.frameworkProgramme.slice(0, 6);
  if (!programmes.length) {
    const empty = document.createElement('div');
    empty.className = 'mini-list__item';
    empty.textContent = 'No programme filters available.';
    elements.topProgrammes.appendChild(empty);
    return;
  }

  for (const programme of programmes) {
    const button = document.createElement('button');
    button.className = `mini-filter${state.filters.programme === programme.rawValue ? ' is-active' : ''}`;
    button.type = 'button';
    button.innerHTML = `
      <span class="mini-filter__title">${escapeHtml(programme.value)}</span>
      <span class="mini-filter__meta">${escapeHtml(compactNumber.format(programme.count))} calls</span>
    `;
    button.addEventListener('click', () => toggleProgrammeFilter(programme.rawValue));
    elements.topProgrammes.appendChild(button);
  }
}

function createFact(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function renderResults() {
  const visible = state.filtered.slice(0, state.visibleCount);
  elements.resultsList.innerHTML = '';

  elements.resultsCount.textContent = `${compactNumber.format(state.filtered.length)} matches`;
  elements.resultsHeadline.textContent = state.filtered.length
    ? `${compactNumber.format(state.filtered.length)} grants in view`
    : 'No grants match the current filters';

  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Try a broader search or a different programme.';
    elements.resultsList.appendChild(empty);
    elements.loadMoreButton.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const grant of visible) {
    const card = elements.grantCardTemplate.content.firstElementChild.cloneNode(true);
    const statusChip = card.querySelector('.status-chip');
    const id = card.querySelector('.grant-card__id');
    const topLine = card.querySelector('.grant-card__topline');
    const titleButton = card.querySelector('.grant-card__title-button');
    const legacyTitleLink = card.querySelector('.grant-card__title a');
    const openLink = card.querySelector('.grant-card__open-link');
    const summary = card.querySelector('.grant-card__summary');
    // AI-analyseknop
    const aiButton = document.createElement('button');
aiButton.className = 'ghost-button grant-card__ai-button';
aiButton.type = 'button';
aiButton.textContent = AI_CACHE.has(grant.identifier) ? 'AI-score bekijken' : 'Analyseer met AI';
aiButton.onclick = async () => {
  aiButton.textContent = 'Analyseren…';
  aiButton.disabled = true;
  const result = await scoreGrantWithAI(grant);
  if (result) {
    // Voeg AI-blok toe aan de kaart
    let aiBlock = card.querySelector('.grant-card__ai-result');
    if (!aiBlock) {
      aiBlock = document.createElement('div');
      aiBlock.className = 'grant-card__ai-result';
      facts.insertAdjacentElement('afterend', aiBlock);
    }
    aiBlock.innerHTML = `
      <p class="grant-card__relevance-title">AI-analyse voor RWS</p>
      <p><strong>Score: ${result.score}/100</strong> — Thema: ${escapeHtml(result.thema)}</p>
      <p>${escapeHtml(result.uitleg)}</p>
    `;
    aiButton.textContent = `AI: ${result.score}/100`;
  } else {
    aiButton.textContent = 'Analyseer met AI';
    aiButton.disabled = false;
  }
};

if (topLine) topLine.appendChild(aiButton);
    const saveButton = document.createElement('button');
saveButton.className = 'ghost-button grant-card__save-button';
saveButton.type = 'button';
saveButton.textContent = isGrantSaved(grant) ? 'Bewaard' : 'Bewaar';
saveButton.setAttribute(
  'aria-label',
  isGrantSaved(grant) ? 'Verwijder call uit bewaarde calls' : 'Bewaar call'
);

saveButton.onclick = (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleSavedGrant(grant);
};

    const drawer = card.querySelector('.grant-card__drawer');
    const drawerSummary = card.querySelector('.grant-card__drawer-summary');
    const drawerAbstract = card.querySelector('.grant-card__drawer-abstract');
    const drawerAbstractBlock = card.querySelector('.grant-card__drawer-block--abstract');
    const facts = card.querySelector('.grant-card__facts');

    statusChip.dataset.status = grant.status.id;
    statusChip.textContent = grant.status.label;
    id.textContent = grant.identifier;
    if (titleButton) {
      titleButton.textContent = grant.title;
      titleButton.setAttribute('aria-expanded', 'false');
    }
    if (legacyTitleLink) {
      legacyTitleLink.textContent = grant.title;
      legacyTitleLink.href = grant.url;
    }
    
if (openLink) {
  openLink.href = grant.url;
}

if (topLine) {
  topLine.appendChild(saveButton);
}

    summary.textContent = grant.destination || grant.callTitle || grant.summary || 'No destination summary available.';
    if (drawerSummary) {
      drawerSummary.textContent = grant.destination || grant.callTitle || grant.summary || 'No short summary was exposed for this call.';
    }

    if (grant.abstract && drawerAbstract && drawerAbstractBlock) {
      drawerAbstract.textContent = grant.abstract;
      drawerAbstractBlock.hidden = false;
    } else if (drawerAbstract && drawerAbstractBlock) {
      drawerAbstract.textContent = '';
      drawerAbstractBlock.hidden = true;
    }

    if (titleButton && drawer) {
      titleButton.addEventListener('click', () => {
        const isOpen = !drawer.hidden;
        drawer.hidden = isOpen;
        card.classList.toggle('is-expanded', !isOpen);
        titleButton.setAttribute('aria-expanded', String(!isOpen));
      });
    }

    const relevanceScore = grant.relevance?.score ?? 0;
    const bureauThemes = grant.relevance?.matchedThemes?.map((theme) => theme.label) || [];

    facts.innerHTML = [
      createFact('Relevance', relevanceScore ? `${relevanceScore}` : 'Not scored'),
      createFact('Bureau Brussel-thema', bureauThemes.length ? bureauThemes.join(', ') : 'Geen directe themamatch'),
      createFact('Programme', getPrimaryProgramme(grant)),
      createFact('Opening', formatDate(grant.startDate || grant.plannedOpeningDate)),
      createFact('Deadline', formatDate(grant.deadlineDate)),
      createFact('Action', grant.actionType || grant.kind.label),
      createFact('Budget', formatCurrency(grant.budget?.totalBudgetEur)),
      createFact('Expected grants', grant.budget?.expectedGrants ? compactNumber.format(grant.budget.expectedGrants) : 'Unknown')
    ].join('');

const existingRelevanceBlock = card.querySelector('.grant-card__relevance');
    if (existingRelevanceBlock) {
      existingRelevanceBlock.remove();
    }

    const relevanceBlock = document.createElement('div');
    relevanceBlock.className = 'grant-card__relevance';

    const reasons = grant.relevance?.reasons || [];
    const matchedTerms = grant.relevance?.matchedTerms || [];

    relevanceBlock.innerHTML = `
      <p class="grant-card__relevance-title">Waarom gevonden</p>
      ${
        reasons.length
          ? `<ul>${reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>`
          : '<p>Geen specifieke matchuitleg beschikbaar.</p>'
      }
      ${
        matchedTerms.length
          ? `<p class="grant-card__matched-terms">Zoektermen: ${escapeHtml(matchedTerms.slice(0, 12).join(', '))}</p>`
          : ''
      }
    `;

    facts.insertAdjacentElement('afterend', relevanceBlock);

    // AI-rerank block: toon resultaat van batch-analyse als dat beschikbaar is
    const aiReview = state.aiReviews.get(grant.identifier);
if (aiReview) {
  const normalizedAiReview = normalizeAiReviewForDisplay(aiReview);

  const aiBlock = document.createElement('div');
  aiBlock.className = 'grant-card__ai-review';

  const aiScore = normalizedAiReview.score;
  const scoreClass = aiScore >= 61 ? 'ai-score--high' : aiScore >= 41 ? 'ai-score--mid' : 'ai-score--low';
  const themeFit = normalizedAiReview.theme || '—';

      aiBlock.innerHTML = `
  <p class="grant-card__relevance-title">
    AI-analyse voor RWS
    <span class="ai-score ${scoreClass}" style="margin-left:0.5rem">${aiScore}/100</span>
  </p>

  <p>${escapeHtml(normalizedAiReview.rationale || 'Geen toelichting beschikbaar.')}</p>

  <dl class="grant-card__facts" style="margin-top:0.5rem">
    ${
      themeFit !== '—'
        ? `<div><dt>Thema's</dt><dd>${escapeHtml(themeFit)}</dd></div>`
        : ''
    }
    ${
      normalizedAiReview.possibleRwsRole
        ? `<div><dt>RWS-rol</dt><dd>${escapeHtml(normalizedAiReview.possibleRwsRole)}</dd></div>`
        : ''
    }
    ${
      normalizedAiReview.uncertainties
        ? `<div><dt>Onzekerheden</dt><dd>${escapeHtml(normalizedAiReview.uncertainties)}</dd></div>`
        : ''
    }
    ${
      normalizedAiReview.recommendedNextStep
        ? `<div><dt>Volgende stap</dt><dd>${escapeHtml(normalizedAiReview.recommendedNextStep)}</dd></div>`
        : ''
    }
  </dl>
`;

      relevanceBlock.insertAdjacentElement('afterend', aiBlock);
    }

    fragment.appendChild(card);
  }

  elements.resultsList.appendChild(fragment);
  elements.loadMoreButton.hidden = state.filtered.length <= state.visibleCount;
}

function syncControls() {
  elements.projectInput.value = state.filters.projectIdea;
  elements.searchInput.value = state.filters.query;
  elements.programmeSelect.value = state.filters.programme;
  elements.themeSelect.value = state.filters.theme;
  elements.recentSelect.value = state.filters.recentMonths;
  elements.sortSelect.value = state.filters.sort;
}

function renderSavedCallsPanel() {
  const savedGrants = getSavedGrants();
  const count = savedGrants.length;

  if (elements.savedCallsCount) {
    elements.savedCallsCount.textContent = count === 1 ? '1 bewaarde call' : `${count} bewaarde calls`;
  }

  if (elements.savedCallsList) {
    elements.savedCallsList.innerHTML = '';

    if (!savedGrants.length) {
      const empty = document.createElement('p');
      empty.className = 'sidebar__copy';
      empty.textContent = 'Nog geen calls bewaard.';
      elements.savedCallsList.appendChild(empty);
    } else {
      const visibleSaved = savedGrants.slice(0, 12);

      for (const grant of visibleSaved) {
        const item = document.createElement('div');
        item.className = 'saved-call-item';

        const textWrapper = document.createElement('div');
        textWrapper.className = 'saved-call-text';

        const link = document.createElement('a');
        link.className = 'saved-call-link';
        link.href = grant.url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = grant.title || grant.identifier;
        link.title = grant.title || grant.identifier;

        const meta = document.createElement('span');
        meta.className = 'saved-call-link__meta';
        meta.textContent = grant.identifier;
        meta.title = grant.identifier;

        textWrapper.appendChild(link);
        textWrapper.appendChild(meta);

        const removeButton = document.createElement('button');
        removeButton.className = 'saved-call-remove-button';
        removeButton.type = 'button';
        removeButton.title = 'Verwijder uit bewaarde calls';
        removeButton.setAttribute('aria-label', `Verwijder ${grant.identifier} uit bewaarde calls`);
        removeButton.textContent = '×';

        removeButton.addEventListener('click', () => {
          state.savedIds.delete(getGrantSaveId(grant));
          persistSavedCalls();
          update();
        });

        item.appendChild(textWrapper);
        item.appendChild(removeButton);

        elements.savedCallsList.appendChild(item);
      }

      if (savedGrants.length > visibleSaved.length) {
        const more = document.createElement('p');
        more.className = 'sidebar__copy';
        more.textContent = `+ ${savedGrants.length - visibleSaved.length} meer in export.`;
        elements.savedCallsList.appendChild(more);
      }
    }
  }

  if (elements.exportSavedButton) {
    elements.exportSavedButton.disabled = count === 0;
  }

  if (elements.clearSavedButton) {
    elements.clearSavedButton.disabled = count === 0;
  }

  const aiReviewButton = document.querySelector('#ai-review-button');
  if (aiReviewButton) {
    const backendConfigured = Boolean(AI_API_URL);
    aiReviewButton.hidden = !backendConfigured || count === 0;
    aiReviewButton.disabled = count === 0;
  }
}

// ── AI review (via serverless backend) ───────────────────────

async function runAiReview() {
  const savedGrants = getSavedGrants();
  if (!savedGrants.length) return;

  if (!AI_API_URL) {
    alert('AI-backend nog niet geconfigureerd. Test AI via de Vercel-site.');
    return;
  }

  const aiReviewButton = document.querySelector('#ai-review-button');

  if (aiReviewButton) {
    aiReviewButton.disabled = true;
    aiReviewButton.textContent = 'Analyseren...';
  }

  const callsPayload = savedGrants.slice(0, 10).map((grant) => ({
    identifier: grant.identifier,
    title: grant.title,
    programme: getPrimaryProgramme(grant),
    destination: grant.destination || '',
    summary: grant.summary || '',
    abstract: String(grant.abstract || '').slice(0, 2500),
    actionType: grant.actionType || grant.kind?.label || '',
    budget: grant.budget?.totalBudgetEur || null,
    deadline: grant.deadlineDate || null,
    matchedThemes: grant.relevance?.matchedThemes?.map((theme) => theme.label) || [],
    matchedTerms: grant.relevance?.matchedTerms || [],
    localRelevanceScore: grant.relevance?.score || 0
  }));

  const payload = {
    projectIdea: state.filters.projectIdea,
    keywords: state.filters.query,
    selectedTheme: state.filters.theme !== 'all' ? state.filters.theme : '',
    calls: callsPayload
  };

  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Backend-fout ${response.status}`);
    }

    const data = await response.json();

    for (const review of data.reviews || []) {
      const normalized = normalizeAiReviewForDisplay(review);
      state.aiReviews.set(normalized.identifier, normalized);
    }

    renderAiResults();
    renderResults();
  } catch (error) {
    console.error('AI-review mislukt:', error);
    alert(`AI-review mislukt: ${error.message}`);
  } finally {
    if (aiReviewButton) {
      aiReviewButton.disabled = false;
      aiReviewButton.textContent = 'Beoordeel met AI';
    }
  }
}

function normalizeAiReviewForDisplay(review) {
  const score =
    review.aiRelevanceScore ??
    review.score ??
    review.relevanceScore ??
    review.projectFitScore ??
    0;

  const themeValue =
    review.themeFit ??
    review.theme ??
    review.thema ??
    review.bureauBrusselTheme ??
    review.selectedTheme ??
    '';

  return {
    identifier: review.identifier || review.callId || '',
    score: Number(score) || 0,
    theme: Array.isArray(themeValue) ? themeValue.join(', ') : String(themeValue || ''),
    rationale: review.rationale || review.uitleg || review.explanation || '',
    possibleRwsRole:
      review.possibleRwsRole ||
      review.possibleRWSRole ||
      review.rwsRole ||
      review.rws_role ||
      '',
    uncertainties:
      review.uncertainties ||
      review.onzekerheden ||
      '',
    recommendedNextStep:
      review.recommendedNextStep ||
      review.nextStep ||
      review.next_step ||
      ''
  };
}

function renderAiResults() {
  const aiResultsPanel = document.querySelector('#ai-results-panel');
  if (!aiResultsPanel) return;

  if (!state.aiReviews.size) {
    aiResultsPanel.hidden = true;
    return;
  }

  aiResultsPanel.hidden = false;

  const list = aiResultsPanel.querySelector('#ai-results-list');
  if (!list) return;

  list.innerHTML = '';

  const sorted = Array.from(state.aiReviews.values())
    .map(normalizeAiReviewForDisplay)
    .sort((a, b) => b.score - a.score);

  for (const review of sorted) {
    const item = document.createElement('div');
    item.className = 'ai-review-item';

    const scoreClass =
      review.score >= 70
        ? 'ai-score--high'
        : review.score >= 40
          ? 'ai-score--mid'
          : 'ai-score--low';

    item.innerHTML = `
      <div class="ai-review-item__header">
        <span class="ai-score ${scoreClass}">${escapeHtml(String(review.score))}/100</span>
        <strong class="ai-review-item__id">${escapeHtml(review.identifier || 'Onbekende call')}</strong>
      </div>

      <p class="ai-review-item__rationale">
        ${escapeHtml(review.rationale || 'Geen toelichting beschikbaar.')}
      </p>

      <dl class="ai-review-item__facts">
        <div>
          <dt>RWS-rol</dt>
          <dd>${escapeHtml(review.possibleRwsRole || 'Niet gespecificeerd')}</dd>
        </div>
        <div>
          <dt>Onzekerheden</dt>
          <dd>${escapeHtml(review.uncertainties || 'Niet gespecificeerd')}</dd>
        </div>
        <div>
          <dt>Volgende stap</dt>
          <dd>${escapeHtml(review.recommendedNextStep || 'Niet gespecificeerd')}</dd>
        </div>
        <div>
          <dt>Thema</dt>
          <dd>${escapeHtml(review.theme || 'Niet gespecificeerd')}</dd>
        </div>
      </dl>
    `;

    list.appendChild(item);
  }
}

// ── AI reranking: batch top 10 ────────────────────────────────

function toAiCallPayload(grant) {
  return {
    identifier: grant.identifier,
    title: grant.title,
    programme: getPrimaryProgramme(grant),
    destination: grant.destination || '',
    summary: grant.summary || '',
    abstract: String(grant.abstract || '').slice(0, 2500),
    actionType: grant.actionType || grant.kind?.label || '',
    frameworkProgrammes: grant.frameworkProgrammes?.map((p) => p.label) || [],
    programmeDivisions: grant.programmeDivisions?.map((d) => d.label) || [],
    matchedThemes: grant.relevance?.matchedThemes?.map((t) => t.label) || [],
    matchedTerms: grant.relevance?.matchedTerms || [],
    localRelevanceScore: grant.relevance?.score || 0
  };
}

async function scoreTopResultsWithAI() {
  if (!AI_API_URL) {
    alert('AI_API_URL is niet ingesteld. Zorg dat de Vercel-backend actief is.');
    return;
  }

  const candidates = state.filtered.slice(0, 10);
  if (!candidates.length) {
    alert('Geen resultaten om te analyseren. Pas je filters aan.');
    return;
  }

  const button = document.querySelector('#ai-rerank-button');
  const statusEl = document.querySelector('#ai-rerank-status');

  if (button) { button.disabled = true; button.textContent = 'Analyseren…'; }
  if (statusEl) { statusEl.textContent = `Top ${candidates.length} calls worden beoordeeld…`; statusEl.hidden = false; }

  const payload = {
    projectIdea: state.filters.projectIdea,
    keywords: state.filters.query,
    selectedTheme: state.filters.theme !== 'all' ? state.filters.theme : '',
    calls: candidates.map(toAiCallPayload)
  };

  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Backend-fout ${response.status}`);
    }

    const data = await response.json();
    const reviews = data.reviews || [];

    if (!reviews.length) throw new Error('Geen beoordelingen ontvangen.');

    for (const review of reviews) {
      state.aiReviews.set(review.identifier, review);
    }

    // Sorteer: AI-gescoorde calls bovenaan, rest onderaan op bestaande volgorde
    state.filtered.sort((a, b) => {
      const left  = state.aiReviews.get(a.identifier)?.aiRelevanceScore ?? -1;
      const right = state.aiReviews.get(b.identifier)?.aiRelevanceScore ?? -1;
      return right - left;
    });

    state.aiRerankActive = true;

    if (statusEl) { statusEl.textContent = `${reviews.length} calls beoordeeld door AI — gesorteerd op AI-relevantie.`; }
    if (button) { button.textContent = 'Heranalyseer'; button.disabled = false; }

    renderResults();

  } catch (error) {
    console.error('AI-reranking mislukt:', error);
    if (statusEl) { statusEl.textContent = `Analyse mislukt: ${error.message}`; }
    if (button) { button.textContent = 'AI analyseer top 10'; button.disabled = false; }
  }
}

// ─────────────────────────────────────────────────────────────

function update() {
  filterGrants();
  writeHash();
  renderStatusPills();
  renderMetrics();
  renderSidebar();
  renderSavedCallsPanel();
  renderResults();
}

async function loadData() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`Could not load data: ${response.status}`);
  }

  return response.json();
}

function wireEvents() {
  elements.searchInput.addEventListener('input', (event) => {
    state.filters.query = event.target.value;
    state.visibleCount = PAGE_STEP;
    update();
  });

elements.exportSavedButton.addEventListener('click', () => {
  exportSavedCallsCsv();
});

elements.clearSavedButton.addEventListener('click', () => {
  if (!state.savedIds.size) {
    return;
  }

  const confirmed = confirm('Weet je zeker dat je alle bewaarde calls wilt wissen?');

  if (!confirmed) {
    return;
  }

  state.savedIds.clear();
  persistSavedCalls();
  update();
});

  elements.projectInput.addEventListener('input', (event) => {
    state.filters.projectIdea = event.target.value;
    state.visibleCount = PAGE_STEP;
    update();
  });

  elements.themeSelect.addEventListener('change', (event) => {
    state.filters.theme = event.target.value;
    state.visibleCount = PAGE_STEP;
    update();
  });

  elements.recentSelect.addEventListener('change', (event) => {
    state.filters.recentMonths = event.target.value;
    state.visibleCount = PAGE_STEP;
    update();
  });

  elements.programmeSelect.addEventListener('change', (event) => {
    state.filters.programme = event.target.value;
    state.visibleCount = PAGE_STEP;
    update();
  });

  elements.sortSelect.addEventListener('change', (event) => {
    state.filters.sort = event.target.value;
    update();
  });

  elements.resetButton.addEventListener('click', () => {
  state.filters = {
    query: '',
    projectIdea: '',
    status: 'live',
    programme: 'all',
    theme: 'all',
    recentMonths: 'all',
    sort: 'relevance-desc'
  };

  state.aiReviews.clear();
  state.aiRerankActive = false;
  const statusEl = document.querySelector('#ai-rerank-status');
  if (statusEl) { statusEl.hidden = true; statusEl.textContent = ''; }
  const aiBtn = document.querySelector('#ai-rerank-button');
  if (aiBtn) { aiBtn.textContent = 'AI analyseer top 10'; aiBtn.disabled = false; }

  state.visibleCount = PAGE_STEP;
  syncControls();
  update();
});

  elements.loadMoreButton.addEventListener('click', () => {
    state.visibleCount += PAGE_STEP;
    renderResults();
  });

  const aiRerankButton = document.querySelector('#ai-rerank-button');
  if (aiRerankButton) {
    aiRerankButton.addEventListener('click', () => scoreTopResultsWithAI());
  }

  const aiReviewButton = document.querySelector('#ai-review-button');
  if (aiReviewButton) {
    aiReviewButton.addEventListener('click', () => {
      runAiReview();
    });
  }

  window.addEventListener('hashchange', () => {
    parseHash();
    syncControls();
    update();
  });
}

async function init() {
  loadSavedCalls();
  parseHash();
  state.data = await loadData();
  renderProgrammeOptions();
  renderMetrics();
  syncControls();
  wireEvents();
  update();
}

// ── AI scoring ────────────────────────────────────────────────
const AI_CACHE = new Map(); // identifier → resultaat

async function scoreGrantWithAI(grant) {
  if (!AI_API_URL) {
    alert('AI-backend nog niet geconfigureerd. Test AI via de Vercel-site.');
    return null;
  }

  const cacheKey = grant.identifier;
  if (AI_CACHE.has(cacheKey)) {
    return AI_CACHE.get(cacheKey);
  }

  const projectIdea = document.querySelector('#project-input')?.value || '';
  const keywords = document.querySelector('#search-input')?.value || '';
  const selectedTheme = state.filters.theme || 'all';

  const payload = {
    projectIdea,
    keywords,
    selectedTheme,
    calls: [
      {
        identifier: grant.identifier,
        title: grant.title,
        programme: getPrimaryProgramme(grant),
        destination: grant.destination || '',
        summary: grant.summary || '',
        abstract: grant.abstract || '',
        actionType: grant.actionType || grant.kind?.label || '',
        frameworkProgrammes: grant.frameworkProgrammes?.map((programme) => programme.label) || [],
        programmeDivisions: grant.programmeDivisions?.map((division) => division.label) || [],
        matchedThemes: grant.relevance?.matchedThemes?.map((theme) => theme.label) || [],
        matchedTerms: grant.relevance?.matchedTerms || []
      }
    ]
  };

  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `AI-backend fout: ${response.status}`);
    }

    const data = await response.json();

    const review =
      data.reviews?.[0] ||
      (Array.isArray(data) ? data[0] : null) ||
      data;

    const themeValue =
  review.themeFit ||
  review.thema ||
  review.theme ||
  review.bureauBrusselTheme ||
  review.selectedTheme ||
  '';

const result = {
  score: review.aiRelevanceScore ?? review.score ?? review.relevanceScore ?? 0,
  uitleg: review.rationale ?? review.uitleg ?? review.explanation ?? '',
  thema: Array.isArray(themeValue) ? themeValue.join(', ') : themeValue,
  possibleRwsRole: review.possibleRwsRole ?? review.rwsRole ?? '',
  uncertainties: review.uncertainties ?? review.onzekerheden ?? '',
  recommendedNextStep: review.recommendedNextStep ?? review.nextStep ?? ''
};

    AI_CACHE.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('AI-analyse mislukt:', error);
    alert(`AI-analyse mislukt: ${error.message}`);
    return null;
  }
}

init().catch((error) => {
  elements.resultsList.innerHTML = `<div class="empty-state">${error.message}</div>`;
  console.error(error);
});