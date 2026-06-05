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

const QUERY_SYNONYMS = {
  // Assetmanagement, instandhouding en areaal
  assetmanagement: [
    'asset management',
    'infrastructure asset management',
    'ISO 55001',
    'lifecycle management',
    'asset lifecycle',
    'network performance',
    'condition assessment',
    'asset data',
    'areaaldata',
    'infrastructure maintenance'
  ],
  instandhouding: [
    'maintenance',
    'infrastructure maintenance',
    'asset management',
    'renovation',
    'replacement',
    'renewal',
    'lifecycle management',
    'predictive maintenance',
    'condition monitoring'
  ],
  onderhoud: [
    'maintenance',
    'infrastructure maintenance',
    'asset management',
    'predictive maintenance',
    'preventive maintenance',
    'condition-based maintenance'
  ],
  renovatie: [
    'renovation',
    'infrastructure renovation',
    'renewal',
    'replacement',
    'rehabilitation',
    'lifecycle extension'
  ],
  vervanging: [
    'replacement',
    'renewal',
    'renovation',
    'infrastructure renewal',
    'asset replacement'
  ],
  areaal: [
    'infrastructure assets',
    'asset base',
    'road assets',
    'waterway assets',
    'civil infrastructure'
  ],
  areaaldata: [
    'asset data',
    'infrastructure data',
    'BIM data',
    'geospatial data',
    'asset information management'
  ],
  kunstwerken: [
    'civil structures',
    'bridges',
    'tunnels',
    'locks',
    'sluices',
    'viaducts',
    'hydraulic structures'
  ],
  bruggen: [
    'bridges',
    'bridge infrastructure',
    'civil structures',
    'structural assets'
  ],
  bruggenmonitoring: [
    'bridge monitoring',
    'bridge inspection',
    'structural health monitoring',
    'condition monitoring',
    'sensor-based monitoring',
    'predictive maintenance'
  ],
  brugmonitoring: [
    'bridge monitoring',
    'bridge inspection',
    'structural health monitoring',
    'condition monitoring'
  ],
  tunnels: [
    'tunnels',
    'tunnel infrastructure',
    'civil structures',
    'infrastructure safety',
    'industrial automation'
  ],
  sluizen: [
    'locks',
    'sluices',
    'waterway infrastructure',
    'hydraulic structures',
    'navigation locks'
  ],
  viaducten: [
    'viaducts',
    'bridges',
    'civil structures',
    'infrastructure renovation'
  ],

  // Hoofdwegennet, wegen en mobiliteit
  hoofdwegennet: [
    'highway network',
    'road network',
    'national road network',
    'motorway network',
    'road infrastructure',
    'TEN-T road network'
  ],
  rijkswegen: [
    'highways',
    'national roads',
    'motorways',
    'road infrastructure',
    'road network',
    'TEN-T roads'
  ],
  wegen: [
    'roads',
    'road infrastructure',
    'road network',
    'highways',
    'motorways'
  ],
  verkeersmanagement: [
    'traffic management',
    'road traffic management',
    'traffic flow',
    'network management',
    'traffic control',
    'intelligent transport systems',
    'ITS'
  ],
  doorstroming: [
    'traffic flow',
    'traffic efficiency',
    'congestion management',
    'network performance',
    'traffic management'
  ],
  verkeersveiligheid: [
    'road safety',
    'traffic safety',
    'transport safety',
    'safe mobility'
  ],
  hinderaanpak: [
    'traffic disruption management',
    'roadworks planning',
    'maintenance planning',
    'smart planning',
    'mobility management'
  ],
  smartmobility: [
    'smart mobility',
    'intelligent transport systems',
    'ITS',
    'C-ITS',
    'connected mobility',
    'multimodal mobility',
    'digital mobility services'
  ],
  'slimme mobiliteit': [
    'smart mobility',
    'intelligent transport systems',
    'ITS',
    'C-ITS',
    'connected mobility',
    'multimodal mobility'
  ],
  corridor: [
    'transport corridor',
    'TEN-T corridor',
    'mobility corridor',
    'logistics corridor',
    'multimodal corridor'
  ],
  corridorbeheer: [
    'corridor management',
    'TEN-T corridor management',
    'transport corridor management',
    'multimodal corridor management'
  ],

  // Vaarwegen, water en klimaatadaptatie
  vaarwegen: [
    'waterways',
    'inland waterways',
    'navigation',
    'waterborne transport',
    'waterway infrastructure',
    'River Information Services',
    'RIS'
  ],
  binnenvaart: [
    'inland navigation',
    'inland waterways',
    'waterborne transport',
    'shipping',
    'River Information Services',
    'RIS'
  ],
  rivieren: [
    'rivers',
    'river basin',
    'river management',
    'river systems',
    'water management',
    'flood risk'
  ],
  rivierbeheer: [
    'river management',
    'river basin management',
    'integrated river management',
    'water management',
    'flood risk management'
  ],
  waterbeheer: [
    'water management',
    'water system management',
    'river basin management',
    'integrated water management',
    'water governance'
  ],
  waterveiligheid: [
    'flood risk',
    'flood protection',
    'flood safety',
    'water safety',
    'flood resilience',
    'flood risk management'
  ],
  overstroming: [
    'flood',
    'flooding',
    'flood risk',
    'flood protection',
    'flood resilience'
  ],
  overstromingsrisico: [
    'flood risk',
    'flood risk management',
    'flood resilience',
    'flood protection'
  ],
  droogte: [
    'drought',
    'drought resilience',
    'water scarcity',
    'freshwater availability',
    'water security'
  ],
  zoetwater: [
    'freshwater',
    'freshwater availability',
    'water availability',
    'water security'
  ],
  zoetwatervoorziening: [
    'freshwater supply',
    'freshwater availability',
    'water security',
    'drought management'
  ],
  kust: [
    'coastal',
    'coastal resilience',
    'coastal management',
    'coastal protection'
  ],
  kustbeheer: [
    'coastal management',
    'coastal protection',
    'coastal resilience'
  ],
  zeespiegelstijging: [
    'sea level rise',
    'coastal resilience',
    'coastal protection',
    'flood risk'
  ],
  dijken: [
    'dikes',
    'dykes',
    'levees',
    'flood defences',
    'flood protection'
  ],
  waterkeringen: [
    'flood defences',
    'water barriers',
    'dikes',
    'dykes',
    'levees',
    'flood protection'
  ],
  klimaatadaptatie: [
    'climate adaptation',
    'climate resilience',
    'climate-proof infrastructure',
    'climate proof infrastructure',
    'resilient infrastructure',
    'adaptive infrastructure'
  ],
  klimaatbestendig: [
    'climate resilient',
    'climate-proof',
    'climate proof',
    'resilient infrastructure',
    'climate adaptive'
  ],
  stresstest: [
    'stress test',
    'climate stress test',
    'vulnerability assessment',
    'climate risk assessment'
  ],
  stresstesten: [
    'stress tests',
    'climate stress tests',
    'vulnerability assessments',
    'climate risk assessments'
  ],

  // Duurzaamheid, circulariteit en leefomgeving
  duurzaamheid: [
    'sustainability',
    'sustainable infrastructure',
    'sustainable asset management',
    'climate neutral',
    'low carbon infrastructure'
  ],
  circulair: [
    'circular economy',
    'circular infrastructure',
    'circular construction',
    'material reuse',
    'reuse of materials',
    'secondary raw materials'
  ],
  circulariteit: [
    'circular economy',
    'circular infrastructure',
    'circular construction',
    'material reuse',
    'reuse of materials'
  ],
  materiaalhergebruik: [
    'material reuse',
    'reuse of materials',
    'reuse of construction materials',
    'secondary raw materials',
    'circular construction'
  ],
  hergebruik: [
    'reuse',
    'material reuse',
    'reuse of materials',
    'recycling',
    'secondary raw materials'
  ],
  asfalt: [
    'asphalt',
    'asphalt recycling',
    'recycled asphalt',
    'low-temperature asphalt',
    'road materials'
  ],
  asfalthergebruik: [
    'asphalt recycling',
    'recycled asphalt',
    'asphalt reuse',
    'circular road materials'
  ],
  lagetemperatuurasfalt: [
    'low-temperature asphalt',
    'warm mix asphalt',
    'low carbon asphalt',
    'sustainable asphalt'
  ],
  biobased: [
    'bio-based materials',
    'biobased materials',
    'sustainable materials',
    'circular materials'
  ],
  natuurinclusief: [
    'nature-inclusive',
    'nature inclusive infrastructure',
    'biodiversity',
    'ecological infrastructure',
    'green infrastructure'
  ],
  biodiversiteit: [
    'biodiversity',
    'ecosystem restoration',
    'habitat restoration',
    'nature-inclusive infrastructure'
  ],
  natuur: [
    'nature',
    'biodiversity',
    'ecosystem',
    'habitat',
    'nature-based solutions'
  ],
  waterkwaliteit: [
    'water quality',
    'water pollution',
    'ecological water quality',
    'aquatic ecosystems'
  ],
  energietransitie: [
    'energy transition',
    'renewable energy',
    'solar energy',
    'wind energy',
    'energy infrastructure',
    'zero emission'
  ],
  emissiereductie: [
    'emission reduction',
    'CO2 reduction',
    'carbon reduction',
    'low carbon',
    'zero emission'
  ],
  klimaatneutraal: [
    'climate neutral',
    'carbon neutral',
    'net zero',
    'zero emission'
  ],

  // Data, informatievoorziening en digitalisering
  digitalisering: [
    'digitalisation',
    'digitalization',
    'digital transformation',
    'digital infrastructure',
    'data-driven infrastructure'
  ],
  informatievoorziening: [
    'information management',
    'information systems',
    'data management',
    'digital infrastructure'
  ],
  data: [
    'data',
    'data governance',
    'data ecosystem',
    'data sharing',
    'data infrastructure'
  ],
  dataecosysteem: [
    'data ecosystem',
    'data sharing ecosystem',
    'digital ecosystem',
    'interoperable data'
  ],
  'data-ecosysteem': [
    'data ecosystem',
    'data sharing ecosystem',
    'digital ecosystem',
    'interoperable data'
  ],
  datascience: [
    'data science',
    'analytics',
    'machine learning',
    'AI',
    'decision support'
  ],
  sensoring: [
    'sensors',
    'sensoring',
    'sensor data',
    'remote sensing',
    'monitoring'
  ],
  sensoren: [
    'sensors',
    'sensor data',
    'monitoring',
    'remote sensing'
  ],
  digitaltwin: [
    'digital twin',
    'digital twins',
    'infrastructure digital twin',
    'asset digital twin'
  ],
  'digitale tweeling': [
    'digital twin',
    'digital twins',
    'infrastructure digital twin',
    'asset digital twin'
  ],
  'digitale tweelingen': [
    'digital twins',
    'infrastructure digital twins',
    'asset digital twins'
  ],
  voorspellendonderhoud: [
    'predictive maintenance',
    'condition-based maintenance',
    'asset monitoring',
    'failure prediction'
  ],
  'voorspellend onderhoud': [
    'predictive maintenance',
    'condition-based maintenance',
    'asset monitoring',
    'failure prediction'
  ],
  robotisering: [
    'robotics',
    'robotisation',
    'automation',
    'inspection robots',
    'maintenance robotics'
  ],
  automatisering: [
    'automation',
    'industrial automation',
    'control systems',
    'operational technology'
  ],
  cyberveiligheid: [
    'cybersecurity',
    'cyber security',
    'secure infrastructure',
    'operational technology security'
  ],
  bim: [
    'BIM',
    'Building Information Model',
    'Building Information Modelling',
    'asset information model'
  ],
  dsgo: [
    'DSGO',
    'digital built environment',
    'data ecosystem',
    'built environment data'
  ],
  dsm: [
    'DSM',
    'digital mobility system',
    'mobility data ecosystem',
    'transport data'
  ],
  ngii: [
    'NGII',
    'geospatial data infrastructure',
    'national geo-information infrastructure',
    'geodata'
  ],

  // Samenwerking, governance en EU-context
  opgavegericht: [
    'mission-oriented',
    'challenge-driven',
    'programme-based cooperation',
    'integrated approach'
  ],
  opgavegerichtsamenwerken: [
    'mission-oriented collaboration',
    'integrated cooperation',
    'cross-sector cooperation',
    'public sector cooperation'
  ],
  'opgavegericht samenwerken': [
    'mission-oriented collaboration',
    'integrated cooperation',
    'cross-sector cooperation',
    'public sector cooperation'
  ],
  ketensamenwerking: [
    'value chain cooperation',
    'supply chain cooperation',
    'sector collaboration',
    'infrastructure sector cooperation'
  ],
  samenwerking: [
    'cooperation',
    'collaboration',
    'partnership',
    'knowledge exchange'
  ],
  grensoverschrijdend: [
    'cross-border',
    'cross-border cooperation',
    'transnational cooperation',
    'international cooperation'
  ],
  harmonisatie: [
    'harmonisation',
    'harmonization',
    'standardisation',
    'standardization',
    'interoperability'
  ],
  standaardisatie: [
    'standardisation',
    'standardization',
    'harmonisation',
    'interoperability'
  ],
  interoperabiliteit: [
    'interoperability',
    'data interoperability',
    'technical interoperability',
    'standards'
  ],
  infrabeheerders: [
    'infrastructure managers',
    'infrastructure operators',
    'road authorities',
    'water authorities',
    'asset owners'
  ],
  markt: [
    'market parties',
    'contractors',
    'infrastructure sector',
    'supply chain',
    'public procurement'
  ],
  portfolioaanpak: [
    'portfolio approach',
    'programme approach',
    'portfolio management',
    'infrastructure portfolio'
  ],
  tweefasenaanpak: [
    'two-phase approach',
    'two-stage contracting',
    'collaborative contracting',
    'procurement innovation'
  ],
  taskforceinfra: [
    'Taskforce Infra',
    'infrastructure sector collaboration',
    'market cooperation',
    'innovation platform'
  ],
  'taskforce infra': [
    'Taskforce Infra',
    'infrastructure sector collaboration',
    'market cooperation',
    'innovation platform'
  ],
  piarc: [
    'PIARC',
    'World Road Association',
    'road authorities',
    'international road cooperation'
  ],
  pianc: [
    'PIANC',
    'waterborne transport infrastructure',
    'navigation infrastructure',
    'ports and waterways'
  ]
};

const STOP_WORDS = new Set([
  // Nederlands
  'de',
  'het',
  'een',
  'en',
  'of',
  'op',
  'in',
  'aan',
  'van',
  'voor',
  'met',
  'zonder',
  'door',
  'over',
  'onder',
  'naar',
  'uit',
  'bij',
  'als',
  'dat',
  'dit',
  'die',
  'deze',
  'wat',
  'waar',
  'welke',
  'hoe',
  'om',
  'te',
  'tot',
  'is',
  'zijn',
  'wordt',
  'worden',
  'kan',
  'kunnen',
  'rond',
  'binnen',
  'tussen',
  'zoals',

  // Engels
  'the',
  'and',
  'or',
  'for',
  'with',
  'without',
  'from',
  'into',
  'onto',
  'over',
  'under',
  'between',
  'within',
  'about',
  'that',
  'this',
  'these',
  'those',
  'what',
  'which',
  'how',
  'can',
  'could',
  'should',
  'would',
  'will',
  'are',
  'was',
  'were',
  'been',
  'being',
  'such',
  'via'
]);

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
  aiSummary: null, // Management summary van AI-analyse
  aiRerankActive: false,
  activeView: 'radar',
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
  aiBriefingPanel: document.querySelector('#ai-briefing-panel'),
  savedCallsCount: document.querySelector('#saved-calls-count'),
  savedCallsList: document.querySelector('#saved-calls-list'),
  exportSavedButton: document.querySelector('#export-saved-button'),
  clearSavedButton: document.querySelector('#clear-saved-button'),
  topProgrammes: document.querySelector('#top-programmes'),
  grantCardTemplate: document.querySelector('#grant-card-template'),
  viewTabs: document.querySelector('.view-tabs'),
  radarView: document.querySelector('#radar-view'),
  shortlistView: document.querySelector('#shortlist-view'),
  pipelineView: document.querySelector('#pipeline-view'),
  tabRadar: document.querySelector('#tab-radar'),
  tabShortlist: document.querySelector('#tab-shortlist'),
  tabPipeline: document.querySelector('#tab-pipeline')
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
    .filter((term) => {
      if (term.length < 3) {
        return false;
      }

      if (STOP_WORDS.has(term)) {
        return false;
      }

      // Filter woorden die alleen uit cijfers bestaan
      if (/^\d+$/.test(term)) {
        return false;
      }

      return true;
    });
}

function expandQueryTerms(rawInputOrTerms) {
  const rawInput = Array.isArray(rawInputOrTerms)
    ? rawInputOrTerms.join(' ')
    : String(rawInputOrTerms || '');

  const normalizedInput = normalizeText(rawInput);
  const baseTerms = Array.isArray(rawInputOrTerms)
    ? rawInputOrTerms
    : splitTerms(rawInput);

  const expanded = new Set(baseTerms);

  for (const [trigger, synonyms] of Object.entries(QUERY_SYNONYMS)) {
    const normalizedTrigger = normalizeText(trigger);

    const triggerMatches =
      normalizedInput.includes(normalizedTrigger) ||
      baseTerms.includes(normalizedTrigger);

    if (!triggerMatches) {
      continue;
    }

    for (const synonym of synonyms) {
      const normalizedSynonym = normalizeText(synonym);

      if (normalizedSynonym) {
        expanded.add(normalizedSynonym);
      }

      for (const synonymTerm of splitTerms(synonym)) {
        expanded.add(synonymTerm);
      }
    }
  }

  return Array.from(expanded);
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

// Termen die veel voorkomen en weinig discrimineren — tellen alleen mee als er ook
// een RWS-domeinterm aanwezig is (zie calculateRelevance).
const WEAK_TERMS = new Set([
  'data', 'ai', 'resilience', 'sustainability', 'innovation', 'transition',
  'governance', 'management', 'system', 'systems', 'network', 'capacity',
  'digital', 'green', 'smart', 'risk', 'assessment', 'monitoring', 'analysis'
]);

function calculateRelevance(grant, query, projectIdea) {
  const fields = getGrantTextFields(grant);
  const combinedInput = normalizeText([query, projectIdea].filter(Boolean).join(' '));
  const originalTerms = splitTerms(combinedInput);
  const terms = expandQueryTerms(combinedInput);

  const combinedGrantText = [
    fields.title,
    fields.summary,
    fields.destination,
    fields.abstract,
    fields.actionType,
    fields.searchText
  ].join(' ');

  const hasRwsDomainFit = textContainsAny(combinedGrantText, RWS_DOMAIN_TERMS);
  const hasStrongRwsFit = textContainsAny(combinedGrantText, STRONG_RWS_DOMAIN_TERMS);
  const hasLowRwsFitContext = textContainsAny(combinedGrantText, LOW_RWS_FIT_TERMS);

  const matchedTerms = new Set();
  const originalMatchedTerms = new Set();
  const matchedThemes = [];
  const reasons = [];

  let expandedPhraseMatched = false;

  // ── Component 1: query/keyword match (max 30) ─────────────
  let queryRaw = 0;

  for (const term of terms) {
    const isOriginalTerm = originalTerms.includes(term);
    const isExpandedPhrase = term.includes(' ');

    // Zwakke generieke termen tellen alleen mee als er ook RWS-domeinfit is.
    if (WEAK_TERMS.has(term) && !hasRwsDomainFit) {
      continue;
    }

    let termMatched = false;

    const titleWeight = isOriginalTerm ? 10 : isExpandedPhrase ? 9 : 3;
    const summaryWeight = isOriginalTerm ? 6 : isExpandedPhrase ? 6 : 2;
    const abstractWeight = isOriginalTerm ? 4 : isExpandedPhrase ? 4 : 1;
    const searchTextWeight = isOriginalTerm ? 2 : isExpandedPhrase ? 2 : 0;

    if (fields.title.includes(term)) {
      queryRaw += titleWeight;
      termMatched = true;
    } else if (fields.summary.includes(term) || fields.destination.includes(term)) {
      queryRaw += summaryWeight;
      termMatched = true;
    } else if (fields.abstract.includes(term)) {
      queryRaw += abstractWeight;
      termMatched = true;
    } else if (searchTextWeight > 0 && fields.searchText.includes(term)) {
      queryRaw += searchTextWeight;
      termMatched = true;
    }

    if (termMatched) {
      matchedTerms.add(term);

      if (isOriginalTerm) {
        originalMatchedTerms.add(term);
      }

      if (isExpandedPhrase) {
        expandedPhraseMatched = true;
      }
    }
  }

  const queryScore = Math.min(30, queryRaw);
  const queryMatched = matchedTerms.size > 0;
  const originalQueryMatched = originalMatchedTerms.size > 0;

  // ── Component 2: thema-match (max 40) ─────────────────────
  let themeRaw = 0;

  for (const theme of RWS_THEMES) {
    let themeScore = 0;
    const themeMatches = [];

    for (const phrase of theme.terms) {
      const normalizedPhrase = normalizeText(phrase);

      if (combinedGrantText.includes(normalizedPhrase)) {
        const weight = normalizedPhrase.includes(' ') ? 6 : 3;
        themeScore += weight;
        themeMatches.push(phrase);
      }
    }

    if (themeScore > 0) {
      if (state.filters.theme !== 'all' && theme.id === state.filters.theme) {
        themeScore += 8;
      }

      themeRaw += themeScore;

      matchedThemes.push({
        id: theme.id,
        label: theme.label,
        matches: themeMatches
      });
    }
  }

  const themeScore = Math.min(40, themeRaw);

  // ── Component 3: specifieke RWS-phrases (max 30) ──────────
  const phraseResult = scoreImportantPhrases(fields, state.filters.theme);
  const phraseScore = Math.min(30, phraseResult.phraseScore);

  // ── Totaal vóór penalties ─────────────────────────────────
  let score = queryScore + themeScore + phraseScore;

  // ── Noise penalty ─────────────────────────────────────────
  for (const noiseTerm of NOISE_TERMS) {
    if (combinedGrantText.includes(normalizeText(noiseTerm))) {
      score -= 10;
    }
  }

  // ── Low-fit penalty: landbouw/voedsel/ruraal ──────────────
  if (hasLowRwsFitContext) {
    if (!hasStrongRwsFit) {
      score = Math.min(score, 30);
      reasons.push('Lage RWS-fit: primair gericht op landbouw, voedsel of rurale context zonder sterke infrastructuur- of watercomponent.');
    } else {
      score = Math.min(score, 60);
      reasons.push('Gemengde scope: landbouw-context naast infrastructuur/water.');
    }
  }

  // ── Reasons voor UI ───────────────────────────────────────
  if (!combinedInput && matchedThemes.length === 0) {
    reasons.push('Geen zoekterm of themamatch; standaard live call getoond.');
  }

  if (matchedTerms.size > 0) {
    const displayTerms = originalMatchedTerms.size > 0
      ? Array.from(originalMatchedTerms)
      : Array.from(matchedTerms);

    reasons.push(`Zoektermen: ${displayTerms.slice(0, 6).join(', ')}`);
  }

  if (matchedThemes.length > 0) {
    reasons.push(`Thema's: ${matchedThemes.map((theme) => theme.label).join(', ')}`);
  }

  if (phraseResult.matchedPhrases.length > 0) {
    reasons.push(`Sleuteltermen: ${phraseResult.matchedPhrases.slice(0, 5).join(', ')}`);
  }

  if (fields.title && terms.some((term) => fields.title.includes(term))) {
    reasons.push('Match in titel.');
  }

  return {
    score: Math.min(100, Math.max(0, score || 1)),
    queryMatched,
    originalQueryMatched,
    expandedPhraseMatched,
    matchedTerms: Array.from(matchedTerms),
    originalMatchedTerms: Array.from(originalMatchedTerms),
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

if (
  combinedQuery &&
  !relevance.originalQueryMatched &&
  !relevance.expandedPhraseMatched &&
  !(relevance.matchedPhrases && relevance.matchedPhrases.length > 0) &&
  relevance.score < 50
) {
  return false;
}

return true;
    })
    .sort((left, right) => {
      // Als AI-reranking actief is, sorteer op AI-score
      if (state.aiRerankActive) {
        const leftScore = state.aiReviews.get(left.identifier)?.aiRelevanceScore ?? -1;
        const rightScore = state.aiReviews.get(right.identifier)?.aiRelevanceScore ?? -1;
        // Calls met AI-score bovenaan, gesorteerd op score (hoog naar laag)
        if (leftScore !== -1 && rightScore !== -1) {
          return rightScore - leftScore;
        }
        if (leftScore !== -1) return -1;
        if (rightScore !== -1) return 1;
        // Beide zonder AI-score: gebruik lokale relevance score als fallback
        return (right.relevance?.score || 0) - (left.relevance?.score || 0);
      }
      
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

function switchView(viewName) {
  state.activeView = viewName;
  if (elements.tabRadar) elements.tabRadar.classList.toggle('is-active', viewName === 'radar');
  if (elements.tabShortlist) elements.tabShortlist.classList.toggle('is-active', viewName === 'shortlist');
  if (elements.tabPipeline) elements.tabPipeline.classList.toggle('is-active', viewName === 'pipeline');
  if (elements.radarView) elements.radarView.hidden = viewName !== 'radar';
  if (elements.shortlistView) elements.shortlistView.hidden = viewName !== 'shortlist';
  if (elements.pipelineView) elements.pipelineView.hidden = viewName !== 'pipeline';
  if (viewName === 'shortlist') {
    renderAiShortlist();
  }
}

function renderViewTabs() {
  if (elements.tabRadar) {
    elements.tabRadar.addEventListener('click', () => switchView('radar'));
  }
  if (elements.tabShortlist) {
    elements.tabShortlist.addEventListener('click', () => switchView('shortlist'));
  }
  if (elements.tabPipeline) {
    elements.tabPipeline.addEventListener('click', () => switchView('pipeline'));
  }
}

function getCallByIdentifier(identifier) {
  if (!state.data?.grants || !identifier) return null;
  return state.data.grants.find(g => g.identifier === identifier) || null;
}

function renderAiShortlist() {
  const container = document.querySelector('#shortlist-content');
  if (!container) return;

  const sortedReviews = Array.from(state.aiReviews.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  if (sortedReviews.length === 0) {
    container.innerHTML = '<p>Draai eerst een AI-analyse in de Radar-tab.</p>';
    return;
  }

  const top3 = sortedReviews.slice(0, 3);
  const others = sortedReviews.slice(3);

  let html = '';

  // Summary section
  if (state.aiSummary) {
    const s = state.aiSummary;
    html += `
      <div class="shortlist-summary">
        <div class="shortlist-summary__section">
          <h4>Kernbeeld</h4>
          <p>${escapeHtml(s.executiveSummary || 'Geen kernbeeld beschikbaar.')}</p>
        </div>
        <div class="shortlist-summary__section">
          <h4>Advies</h4>
          <p class="shortlist-summary__advice">${escapeHtml(s.overallAdvice || 'Geen advies beschikbaar.')}</p>
        </div>
        <div class="shortlist-summary__section">
          <h4>Kansrijke lijnen</h4>
          <div class="shortlist-opportunities">
            ${s.topOpportunities && s.topOpportunities.length > 0
              ? s.topOpportunities.slice(0, 5).map((opp, idx) => `
                  <div class="shortlist-opportunity">
                    <span class="shortlist-opportunity__rank">#${idx + 1}</span>
                    <span class="shortlist-opportunity__title">${escapeHtml(opp.title || opp.identifier || 'Onbekend')}</span>
                    <span class="shortlist-opportunity__score">${opp.score ? escapeHtml(String(opp.score)) + '/100' : ''}</span>
                  </div>
                `).join('')
              : '<p>Geen kansrijke lijnen geïdentificeerd.</p>'
            }
          </div>
        </div>
        <div class="shortlist-summary__section">
          <h4>Aandachtspunten</h4>
          <p>${escapeHtml(s.notableExclusions || 'Geen specifieke aandachtspunten gemeld.')}</p>
        </div>
        <div class="shortlist-summary__section">
          <h4>Vervolgstappen</h4>
          <ul class="shortlist-steps">
            ${s.recommendedNextSteps && s.recommendedNextSteps.length > 0
              ? s.recommendedNextSteps.map(step => `<li>${escapeHtml(step)}</li>`).join('')
              : '<li>Geen vervolgstappen gespecificeerd.</li>'
            }
          </ul>
        </div>
      </div>
    `;
  }

  // Top 3 section
  html += '<h3 class="shortlist-section-title">Top 3 kansrijke calls</h3>';
  html += '<div class="shortlist-top3">';
  
  for (const review of top3) {
    const call = getCallByIdentifier(review.identifier);
    const rwsText = review.projectFit 
      ? `${review.projectFit}${review.possibleRwsRole ? ' — ' + review.possibleRwsRole : ''}${review.rationale ? '. ' + review.rationale : ''}`
      : 'Nog te concretiseren op basis van de officiële calltekst.';

    const scoreClass = review.score >= 70 ? 'score-high' : review.score >= 40 ? 'score-mid' : 'score-low';

    html += `
      <article class="shortlist-top3__call">
        <div class="shortlist-top3__header">
          <h4 class="shortlist-top3__title">${escapeHtml(call?.title || review.identifier)}</h4>
          <span class="shortlist-top3__id">${escapeHtml(review.identifier)}</span>
          <span class="shortlist-score ${scoreClass}">${review.score}/100</span>
        </div>
        <div class="shortlist-top3__body">
          <div class="shortlist-top3__block">
            <dt>Projectfit</dt>
            <dd>${escapeHtml(review.projectFit || 'Niet gespecificeerd')}${review.projectFitScore ? ` <span class="shortlist-score score-mid">${review.projectFitScore}/100</span>` : ''}</dd>
          </div>
          <div class="shortlist-top3__block">
            <dt>Motivatie</dt>
            <dd>${escapeHtml(review.rationale || 'Geen motivatie beschikbaar.')}</dd>
          </div>
          <div class="shortlist-top3__block">
            <dt>RWS-rol</dt>
            <dd>${escapeHtml(review.possibleRwsRole || 'Niet gespecificeerd')}</dd>
          </div>
          <div class="shortlist-top3__block">
            <dt>Onzekerheden</dt>
            <dd>${escapeHtml(review.uncertainties || 'Geen onzekerheden gemeld.')}</dd>
          </div>
          <div class="shortlist-top3__block">
            <dt>Volgende stap</dt>
            <dd>${escapeHtml(review.recommendedNextStep || 'Niet gespecificeerd')}</dd>
          </div>
          <div class="shortlist-top3__block shortlist-top3__block--rws">
            <dt>Mogelijk RWS-project</dt>
            <dd>${escapeHtml(rwsText)}</dd>
          </div>
        </div>
        ${call?.url ? `<a class="shortlist-top3__open" href="${call.url}" target="_blank" rel="noreferrer">Open call</a>` : ''}
      </article>
    `;
  }

  html += '</div>';

  // Others section
  if (others.length > 0) {
    html += '<h3 class="shortlist-section-title">Overige geanalyseerde calls</h3>';
    html += '<div class="shortlist-others">';
    
    for (const review of others) {
      const call = getCallByIdentifier(review.identifier);
      const scoreClass = review.score >= 70 ? 'score-high' : review.score >= 40 ? 'score-mid' : 'score-low';
      const uncertaintyText = review.uncertainties ? escapeHtml(review.uncertainties.slice(0, 60) + (review.uncertainties.length > 60 ? '...' : '')) : 'Geen';
      
      html += `
        <article class="shortlist-others__call">
          <div class="shortlist-others__header">
            <h5 class="shortlist-others__title">${escapeHtml(call?.title || review.identifier)}</h5>
            <span class="shortlist-score ${scoreClass}">${review.score}/100</span>
          </div>
          <p class="shortlist-others__fit">${escapeHtml(review.projectFit || 'Geen projectfit beschikbaar')}</p>
          <p class="shortlist-others__uncertainty">⚠ ${uncertaintyText}</p>
          ${call?.url ? `<a class="shortlist-others__open" href="${call.url}" target="_blank" rel="noreferrer">Open call</a>` : ''}
        </article>
      `;
    }
    
    html += '</div>';
  }

  container.innerHTML = html;
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
  const normalizedAiReview = aiReview; // already normalized when stored

  const aiBlock = document.createElement('div');
  aiBlock.className = 'grant-card__ai-review';

  const aiScore = normalizedAiReview.aiRelevanceScore ?? 0;
  const scoreClass = aiScore >= 61
    ? 'ai-score--high'
    : aiScore >= 41
      ? 'ai-score--mid'
      : 'ai-score--low';

  const themeFit = normalizedAiReview.theme || '—';

  const projectFitHtml = normalizedAiReview.projectFit
    ? `<p><strong>Projectfit:</strong> ${escapeHtml(normalizedAiReview.projectFit)}${
        normalizedAiReview.projectFitScore
          ? ` <span class="ai-score ai-score--mid" style="margin-left:0.35rem">${escapeHtml(String(normalizedAiReview.projectFitScore))}/100</span>`
          : ''
      }</p>`
    : '';

  const themeHtml = themeFit !== '—'
    ? `<div><dt>Thema's</dt><dd>${escapeHtml(themeFit)}</dd></div>`
    : '';

  const roleHtml = normalizedAiReview.possibleRwsRole
    ? `<div><dt>RWS-rol</dt><dd>${escapeHtml(normalizedAiReview.possibleRwsRole)}</dd></div>`
    : '';

  const uncertaintiesHtml = normalizedAiReview.uncertainties
    ? `<div><dt>Onzekerheden</dt><dd>${escapeHtml(normalizedAiReview.uncertainties)}</dd></div>`
    : '';

  const nextStepHtml = normalizedAiReview.recommendedNextStep
    ? `<div><dt>Volgende stap</dt><dd>${escapeHtml(normalizedAiReview.recommendedNextStep)}</dd></div>`
    : '';

  aiBlock.innerHTML = `
    <p class="grant-card__relevance-title">
      AI-analyse voor RWS
      <span class="ai-score ${scoreClass}" style="margin-left:0.5rem">${escapeHtml(String(aiScore))}/100</span>
    </p>

    ${projectFitHtml}

    <p>${escapeHtml(normalizedAiReview.rationale || 'Geen toelichting beschikbaar.')}</p>

    <dl class="grant-card__facts" style="margin-top:0.5rem">
      ${themeHtml}
      ${roleHtml}
      ${uncertaintiesHtml}
      ${nextStepHtml}
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
  // aiRelevanceScore is the canonical field from the server.
  // Never fall back to projectFitScore, score, relevanceScore or any local score.
  const score = review.aiRelevanceScore != null ? Number(review.aiRelevanceScore) : 0;

  const themeValue =
    review.themeFit ??
    review.theme ??
    review.thema ??
    review.bureauBrusselTheme ??
    review.selectedTheme ??
    '';

  return {
  identifier: review.identifier || review.callId || '',
  score: score,
  aiRelevanceScore: score,
  projectFit: review.projectFit || review.project_fit || review.projectMatch || '',
  projectFitScore: Number(
    review.projectFitScore ??
    review.project_fit_score ??
    review.projectMatchScore ??
    0
  ),
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
    .sort((a, b) => (b.aiRelevanceScore ?? 0) - (a.aiRelevanceScore ?? 0));

  for (const review of sorted) {
    const item = document.createElement('div');
    item.className = 'ai-review-item';

    const aiScore = review.aiRelevanceScore ?? 0;
    const scoreClass =
      aiScore >= 70
        ? 'ai-score--high'
        : aiScore >= 40
          ? 'ai-score--mid'
          : 'ai-score--low';

   
item.innerHTML = `
  <div class="ai-review-item__header">
    <span class="ai-score ${scoreClass}">${escapeHtml(String(aiScore))}/100</span>
    <strong class="ai-review-item__id">${escapeHtml(review.identifier || 'Onbekende call')}</strong>
  </div>

  <p class="ai-review-item__project-fit">
    <strong>Projectfit:</strong>
    ${escapeHtml(review.projectFit || 'Geen specifieke projectfit toegelicht.')}
    ${review.projectFitScore ? ` <span class="ai-score ai-score--mid">${escapeHtml(String(review.projectFitScore))}/100</span>` : ''}
  </p>

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

function renderAiBriefing() {
  const briefingPanel = elements.aiBriefingPanel;
  if (!briefingPanel) return;

  if (!state.aiSummary) {
    briefingPanel.hidden = true;
    return;
  }

  briefingPanel.hidden = false;

  const summary = state.aiSummary;

  briefingPanel.innerHTML = `
    <div class="ai-briefing__header">
      <h3 class="ai-briefing__title">AI Shortlist Briefing</h3>
      <span class="ai-briefing__badge">Management Samenvatting</span>
    </div>

    <div class="ai-briefing__content">
      <section class="ai-briefing__section">
        <h4>Executive Summary</h4>
        <p class="ai-briefing__text">${escapeHtml(summary.executiveSummary || 'Geen samenvatting beschikbaar.')}</p>
      </section>

      <section class="ai-briefing__section">
        <h4>Overall Advice</h4>
        <p class="ai-briefing__text ai-briefing__text--advice">${escapeHtml(summary.overallAdvice || 'Geen advies beschikbaar.')}</p>
      </section>

      <section class="ai-briefing__section">
        <h4>Top 3 Opportunities</h4>
        <div class="ai-briefing__opportunities">
          ${summary.topOpportunities && summary.topOpportunities.length > 0
            ? summary.topOpportunities.slice(0, 3).map((opp, idx) => `
                <div class="ai-briefing__opportunity">
                  <span class="ai-briefing__opportunity-rank">#${idx + 1}</span>
                  <div class="ai-briefing__opportunity-content">
                    <strong class="ai-briefing__opportunity-title">${escapeHtml(opp.title || opp.identifier || 'Onbekend')}</strong>
                    <p class="ai-briefing__opportunity-rationale">${escapeHtml(opp.rationale || '')}</p>
                    <span class="ai-briefing__opportunity-score">Score: ${opp.score || 'N/A'}/100</span>
                  </div>
                </div>
              `).join('')
            : '<p class="ai-briefing__text">Geen top opportuniteiten geïdentificeerd.</p>'
          }
        </div>
      </section>

      <section class="ai-briefing__section">
        <h4>Notable Exclusions</h4>
        <p class="ai-briefing__text">${escapeHtml(summary.notableExclusions || 'Geen belangrijke exclusies gemeld.')}</p>
      </section>

      <section class="ai-briefing__section">
        <h4>Recommended Next Steps</h4>
        <ul class="ai-briefing__steps">
          ${summary.recommendedNextSteps && summary.recommendedNextSteps.length > 0
            ? summary.recommendedNextSteps.map(step => `
                <li class="ai-briefing__step">${escapeHtml(step)}</li>
              `).join('')
            : '<li class="ai-briefing__step">Geen aanbevolen stappen beschikbaar.</li>'
          }
        </ul>
      </section>

      <section class="ai-briefing__section ai-briefing__section--rag">
        <h4>Gebruikte RAG Context</h4>
        <div class="ai-briefing__rag-tags">
          ${summary.ragContextUsed && summary.ragContextUsed.length > 0
            ? summary.ragContextUsed.map(tag => `
                <span class="ai-briefing__rag-tag">${escapeHtml(tag)}</span>
              `).join('')
            : '<span class="ai-briefing__text">Geen RAG context gebruikt.</span>'
          }
        </div>
      </section>
    </div>
  `;
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
    const summary = data.summary || null;

    if (!reviews.length) throw new Error('Geen beoordelingen ontvangen.');

    for (const review of reviews) {
      const normalized = normalizeAiReviewForDisplay(review);
      state.aiReviews.set(normalized.identifier, normalized);
    }

    // Sla de management summary op
    state.aiSummary = summary;

    // Sorteer: AI-gescoorde calls bovenaan op aiRelevanceScore, rest onderaan
    state.filtered.sort((a, b) => {
      const left  = state.aiReviews.get(a.identifier)?.aiRelevanceScore ?? -1;
      const right = state.aiReviews.get(b.identifier)?.aiRelevanceScore ?? -1;
      return right - left;
    });

    state.aiRerankActive = true;

    if (statusEl) { statusEl.textContent = `${reviews.length} calls beoordeeld door AI — gesorteerd op AI-relevantie.`; }
    if (button) { button.textContent = 'Heranalyseer'; button.disabled = false; }

    renderAiBriefing();
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
  renderAiBriefing();
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
  state.aiSummary = null;
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
  renderViewTabs();
  switchView(state.activeView);
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