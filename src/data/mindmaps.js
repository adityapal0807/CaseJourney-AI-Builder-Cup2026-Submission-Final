/**
 * Per-case solution mind maps.
 * Each node has: id, x, y, label, type, optimal (bool)
 * Each edge has: from, to, optimal (bool)
 * optimalPath: ordered array of node ids showing the gold standard flow
 * phaseKeywords: maps phase → node ids the AI explores in that phase
 */

export const CASE_MINDMAPS = {
  nordvik: {
    caseTitle: 'Nordvik Margin Collapse',
    nodes: [
      { id: 'problem',      x: 360, y: 40,  label: 'Margin Collapse\n14% → 9%',      type: 'problem',        optimal: true },
      // L1
      { id: 'revenue',      x: 180, y: 130, label: 'Revenue\nDecline?',               type: 'hypothesis',     optimal: false },
      { id: 'cost',         x: 540, y: 130, label: 'Cost\nInflation?',                type: 'hypothesis',     optimal: true  },
      // L2 revenue
      { id: 'volume',       x: 80,  y: 230, label: 'Volume\nMix',                     type: 'dead_end',       optimal: false },
      { id: 'price_rev',    x: 240, y: 230, label: 'Pricing\nPressure',               type: 'dead_end',       optimal: false },
      // L2 cost
      { id: 'cogs',         x: 460, y: 230, label: 'COGS\n+34% YoY',                 type: 'confirmed',      optimal: true  },
      { id: 'overhead',     x: 640, y: 230, label: 'Overhead\n& SG&A',               type: 'branch',         optimal: false },
      // L3 cogs
      { id: 'supplier',     x: 380, y: 340, label: 'Supplier\nConcentration',         type: 'root_cause',     optimal: true  },
      { id: 'commodity',    x: 540, y: 340, label: 'Commodity\nInflation',            type: 'contributing',   optimal: false },
      // L4 recommendation
      { id: 'dual_source',  x: 260, y: 450, label: 'Dual-Source\nSuppliers',         type: 'recommendation', optimal: true  },
      { id: 'hedge',        x: 400, y: 450, label: 'Commodity\nHedge',               type: 'recommendation', optimal: true  },
      { id: 'renegotiate',  x: 540, y: 450, label: 'Renegotiate\nContracts',         type: 'recommendation', optimal: false },
    ],
    edges: [
      { from: 'problem',   to: 'revenue',    optimal: false },
      { from: 'problem',   to: 'cost',       optimal: true  },
      { from: 'revenue',   to: 'volume',     optimal: false },
      { from: 'revenue',   to: 'price_rev',  optimal: false },
      { from: 'cost',      to: 'cogs',       optimal: true  },
      { from: 'cost',      to: 'overhead',   optimal: false },
      { from: 'cogs',      to: 'supplier',   optimal: true  },
      { from: 'cogs',      to: 'commodity',  optimal: false },
      { from: 'supplier',  to: 'dual_source',optimal: true  },
      { from: 'supplier',  to: 'hedge',      optimal: true  },
      { from: 'commodity', to: 'renegotiate',optimal: false },
    ],
    optimalPath: ['problem', 'cost', 'cogs', 'supplier', 'dual_source', 'hedge'],
    phaseNodes: {
      structure: ['problem', 'revenue', 'cost'],
      deep_dive: ['cogs', 'overhead', 'supplier', 'commodity', 'volume', 'price_rev'],
      synthesis: ['dual_source', 'hedge', 'renegotiate'],
    },
  },

  fastfashion: {
    caseTitle: 'FashionCo EU Market Entry',
    nodes: [
      { id: 'problem',      x: 360, y: 40,  label: 'EU Market\nEntry Decision',       type: 'problem',        optimal: true  },
      // L1
      { id: 'attractive',   x: 160, y: 130, label: 'Market\nAttractive?',             type: 'hypothesis',     optimal: true  },
      { id: 'can_win',      x: 380, y: 130, label: 'Can Client\nWin?',                type: 'hypothesis',     optimal: true  },
      { id: 'how_enter',    x: 590, y: 130, label: 'How to\nEnter?',                  type: 'hypothesis',     optimal: true  },
      // L2 attract
      { id: 'mkt_size',     x: 80,  y: 230, label: 'Market Size\n€85B',               type: 'confirmed',      optimal: true  },
      { id: 'digital_pen',  x: 220, y: 230, label: 'Digital Pen.\n34% & rising',      type: 'confirmed',      optimal: true  },
      // L2 can_win
      { id: 'supply_chain', x: 350, y: 230, label: 'Supply Chain\nAdvantage',         type: 'confirmed',      optimal: true  },
      { id: 'regulation',   x: 490, y: 230, label: 'EU DPP\nCompliance',              type: 'risk',           optimal: false },
      // L2 how_enter
      { id: 'full_physical',x: 580, y: 230, label: 'Full Physical\n€120M+',           type: 'dead_end',       optimal: false },
      { id: 'digital_first',x: 680, y: 230, label: 'Digital-First\nLow Capex',        type: 'root_cause',     optimal: true  },
      // L3
      { id: 'ecomm',        x: 580, y: 350, label: 'E-Commerce\nLaunch',              type: 'recommendation', optimal: true  },
      { id: 'flagship',     x: 700, y: 350, label: '2 Flagship\nStores',              type: 'recommendation', optimal: true  },
      { id: 'influencer',   x: 460, y: 350, label: 'Influencer\nLocalisation',        type: 'recommendation', optimal: true  },
    ],
    edges: [
      { from: 'problem',      to: 'attractive',   optimal: true  },
      { from: 'problem',      to: 'can_win',       optimal: true  },
      { from: 'problem',      to: 'how_enter',     optimal: true  },
      { from: 'attractive',   to: 'mkt_size',      optimal: true  },
      { from: 'attractive',   to: 'digital_pen',   optimal: true  },
      { from: 'can_win',      to: 'supply_chain',  optimal: true  },
      { from: 'can_win',      to: 'regulation',    optimal: false },
      { from: 'how_enter',    to: 'full_physical', optimal: false },
      { from: 'how_enter',    to: 'digital_first', optimal: true  },
      { from: 'digital_first',to: 'ecomm',         optimal: true  },
      { from: 'digital_first',to: 'flagship',      optimal: true  },
      { from: 'digital_first',to: 'influencer',    optimal: true  },
    ],
    optimalPath: ['problem', 'attractive', 'can_win', 'how_enter', 'mkt_size', 'digital_pen', 'supply_chain', 'digital_first', 'ecomm', 'flagship', 'influencer'],
    phaseNodes: {
      structure: ['problem', 'attractive', 'can_win', 'how_enter'],
      deep_dive: ['mkt_size', 'digital_pen', 'supply_chain', 'regulation', 'full_physical', 'digital_first'],
      synthesis: ['ecomm', 'flagship', 'influencer'],
    },
  },

  indev: {
    caseTitle: 'IndEV Breakeven Push',
    nodes: [
      { id: 'problem',      x: 360, y: 40,  label: 'EBITDA Breakeven\n–8% Margin',   type: 'problem',        optimal: true  },
      // L1
      { id: 'revenue_',     x: 160, y: 130, label: 'Revenue\nGrowth',                type: 'hypothesis',     optimal: false },
      { id: 'unit_econ',    x: 380, y: 130, label: 'Unit Economics\nBreakdown',       type: 'hypothesis',     optimal: true  },
      { id: 'subsidy',      x: 590, y: 130, label: 'Subsidy\nDependency',             type: 'hypothesis',     optimal: true  },
      // L2 unit
      { id: 'battery',      x: 300, y: 240, label: 'Battery Cost\n42% of COGS',       type: 'root_cause',     optimal: true  },
      { id: 'cac',          x: 460, y: 240, label: 'CAC\n₹8,200 vs ₹4,100',          type: 'root_cause',     optimal: true  },
      // L2 subsidy
      { id: 'fame2',        x: 580, y: 240, label: 'FAME II\nExpired',                type: 'confirmed',      optimal: true  },
      { id: 'fame3',        x: 700, y: 240, label: 'FAME III\nDelayed',               type: 'risk',           optimal: false },
      // L3
      { id: 'baas',         x: 200, y: 360, label: 'Battery-as-a-\nService (BaaS)',   type: 'recommendation', optimal: true  },
      { id: 'supply_neg',   x: 360, y: 360, label: 'Battery Supply\nNegotiation',     type: 'recommendation', optimal: false },
      { id: 'd2c',          x: 500, y: 360, label: 'D2C Channel\nShift',              type: 'recommendation', optimal: true  },
      { id: 'price_up',     x: 640, y: 360, label: '₹5K Price\nIncrease',             type: 'recommendation', optimal: false },
    ],
    edges: [
      { from: 'problem',   to: 'revenue_',   optimal: false },
      { from: 'problem',   to: 'unit_econ',  optimal: true  },
      { from: 'problem',   to: 'subsidy',    optimal: true  },
      { from: 'unit_econ', to: 'battery',    optimal: true  },
      { from: 'unit_econ', to: 'cac',        optimal: true  },
      { from: 'subsidy',   to: 'fame2',      optimal: true  },
      { from: 'subsidy',   to: 'fame3',      optimal: false },
      { from: 'battery',   to: 'baas',       optimal: true  },
      { from: 'battery',   to: 'supply_neg', optimal: false },
      { from: 'cac',       to: 'd2c',        optimal: true  },
      { from: 'fame2',     to: 'price_up',   optimal: false },
    ],
    optimalPath: ['problem', 'unit_econ', 'subsidy', 'battery', 'cac', 'fame2', 'baas', 'd2c'],
    phaseNodes: {
      structure: ['problem', 'revenue_', 'unit_econ', 'subsidy'],
      deep_dive: ['battery', 'cac', 'fame2', 'fame3'],
      synthesis: ['baas', 'd2c', 'supply_neg', 'price_up'],
    },
  },

  evcharging: {
    caseTitle: 'EV Charging Infrastructure in Gurgaon',
    nodes: [
      { id: 'problem',           x: 360, y: 40,  label: 'EV Infrastructure\nDemand & Sizing',    type: 'problem',        optimal: true },
      // L1 Branches
      { id: 'pop_fleet',         x: 140, y: 130, label: 'Population &\nVehicle Fleet',          type: 'hypothesis',     optimal: true },
      { id: 'retail_vs_comm',    x: 360, y: 130, label: 'Retail vs.\nCommercial Fleet',         type: 'hypothesis',     optimal: true },
      { id: 'charging_turn',     x: 580, y: 130, label: 'Charging Duration\n& Utilization',      type: 'hypothesis',     optimal: true },
      { id: 'unconstrained',     x: 760, y: 130, label: '24h Flat Sizing\n(Unrealistic)',       type: 'dead_end',       optimal: false },
      // L2 Demand & Fleets
      { id: 'gurgaon_pop',       x: 80,  y: 230, label: '2.5M Pop\n600k Households',            type: 'confirmed',      optimal: true },
      { id: 'car_fleet',         x: 200, y: 230, label: '350k Fleet\n~5.5k EVs (1.5%)',         type: 'confirmed',      optimal: true },
      { id: 'retail_home',       x: 300, y: 230, label: 'Retail: 80% Fleet\nHome Charge Bias',   type: 'confirmed',      optimal: true },
      { id: 'comm_surge',        x: 440, y: 230, label: 'Commercial: 20% Fleet\n75% Daily Demand',type: 'root_cause',    optimal: true },
      { id: 'truck_dwell',       x: 560, y: 230, label: 'Truck Dwell Time\n80–90 min/session',   type: 'root_cause',     optimal: true },
      // L2 Inconsistencies & Misses
      { id: 'flat_24h_mistake',  x: 740, y: 230, label: 'Assumed 24h Queue\n(Missed Peak)',      type: 'risk',           optimal: false },
      { id: 'no_buffer_risk',    x: 860, y: 230, label: 'Zero Downtime Buffer\n(45 Stns Flaw)',  type: 'risk',           optimal: false },
      // L3 Correction & Synthesis
      { id: 'peak_window_fix',   x: 380, y: 350, label: '12h Peak Window\nAdjustment',          type: 'recommendation', optimal: true },
      { id: 'downtime_buffer',   x: 520, y: 350, label: '25% Maintenance\n& Queue Buffer',       type: 'recommendation', optimal: true },
      { id: 'corridor_shift',    x: 660, y: 350, label: 'Dwarka Expressway\nGrid Shift',         type: 'recommendation', optimal: true },
      { id: 'target_2030',       x: 800, y: 350, label: '2030 Target:\n2,200 Stations',        type: 'recommendation', optimal: true },
    ],
    edges: [
      { from: 'problem',          to: 'pop_fleet',        optimal: true },
      { from: 'problem',          to: 'retail_vs_comm',   optimal: true },
      { from: 'problem',          to: 'charging_turn',    optimal: true },
      { from: 'problem',          to: 'unconstrained',    optimal: false },
      { from: 'pop_fleet',        to: 'gurgaon_pop',      optimal: true },
      { from: 'pop_fleet',        to: 'car_fleet',        optimal: true },
      { from: 'retail_vs_comm',   to: 'retail_home',      optimal: true },
      { from: 'retail_vs_comm',   to: 'comm_surge',       optimal: true },
      { from: 'charging_turn',    to: 'truck_dwell',      optimal: true },
      { from: 'unconstrained',    to: 'flat_24h_mistake', optimal: false },
      { from: 'unconstrained',    to: 'no_buffer_risk',   optimal: false },
      { from: 'comm_surge',       to: 'peak_window_fix',  optimal: true },
      { from: 'charging_turn',    to: 'downtime_buffer',  optimal: true },
      { from: 'downtime_buffer',  to: 'corridor_shift',   optimal: true },
      { from: 'peak_window_fix',  to: 'target_2030',      optimal: true },
    ],
    optimalPath: [
      'problem',
      'pop_fleet',
      'retail_vs_comm',
      'charging_turn',
      'gurgaon_pop',
      'car_fleet',
      'retail_home',
      'comm_surge',
      'truck_dwell',
      'peak_window_fix',
      'downtime_buffer',
      'corridor_shift',
      'target_2030'
    ],
    phaseNodes: {
      structure: ['problem', 'pop_fleet', 'retail_vs_comm', 'charging_turn', 'unconstrained'],
      deep_dive: ['gurgaon_pop', 'car_fleet', 'retail_home', 'comm_surge', 'truck_dwell', 'flat_24h_mistake', 'no_buffer_risk'],
      synthesis: ['peak_window_fix', 'downtime_buffer', 'corridor_shift', 'target_2030'],
    },
  },
};

// Aliases for case IDs
CASE_MINDMAPS['a0e1c2d3-0001-4000-a000-000000000001'] = CASE_MINDMAPS.evcharging;
CASE_MINDMAPS['gurgaon_ev'] = CASE_MINDMAPS.evcharging;

export function buildUserPath(caseId, turns) {
  const map = CASE_MINDMAPS[caseId];
  if (!map || !turns?.length) return [];

  const visited = new Set(['problem']);

  for (const turn of turns) {
    const phase = turn.phase || 'structure';
    const phaseNodes = map.phaseNodes[phase] || [];
    // Add nodes from this phase based on what the AI discussed
    phaseNodes.forEach(n => visited.add(n));
  }

  return Array.from(visited);
}

export function getBestAttempt(caseId) {
  try {
    const key = `casejourney_mindmap_${caseId}`;
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch { return null; }
}

export function saveMindMapAttempt(caseId, visitedNodes, score) {
  try {
    const key = `casejourney_mindmap_${caseId}`;
    const existing = getBestAttempt(caseId);
    if (!existing || score > existing.score) {
      localStorage.setItem(key, JSON.stringify({ visitedNodes, score, date: Date.now() }));
    }
  } catch { /* noop */ }
}
