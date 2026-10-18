-- ═══════════════════════════════════════════════════════════════════════
-- SEED: EV Charging Stations in Gurgaon — Guesstimate Case
-- Run this in the Supabase SQL Editor after schema.sql is applied.
-- Uses the Dev Admin user (00000000-0000-0000-0000-000000000001) as author.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. CASE ────────────────────────────────────────────────────────────
INSERT INTO cases (
  id,
  author_id,
  status,
  name,
  problem_statement,
  case_type,
  industry,
  company_style,
  round,
  difficulty,
  tags,
  clarifying_questions,
  brownie_points,
  keep_in_mind
) VALUES (
  'a0e1c2d3-0001-4000-a000-000000000001',
  '00000000-0000-0000-0000-000000000001',   -- Dev Admin
  'published',
  'EV Charging Infrastructure in Gurgaon',
  'You are advising the Chief Minister of Haryana, who is preparing for a major policy review on electric vehicle infrastructure in the state. The CM wants a crisp answer to three questions: (1) How many EV charging stations are currently operational in Gurgaon (Gurugram)? (2) Is that number adequate for the current and projected EV population? (3) What should Haryana''s target be for Gurgaon by 2030, and roughly what investment would that require? Walk me through your estimation approach step by step.',
  'Guesstimate',
  'Energy',
  '.',
  'R1',
  2,    -- Associate difficulty
  ARRAY['guesstimate', 'ev', 'infrastructure', 'public-policy', 'haryana', 'energy-transition'],

  -- Clarifying questions a strong candidate should ask
  '• Are we scoping only public/semi-public charging stations, or including private residential chargers too?
• Should we count individual charging points or charging stations (one station may have 4-8 points)?
• Are we including EV battery-swapping stations (common for 2W/3W)?
• Geographic scope — Gurgaon Municipal Corporation limits, or the wider Gurgaon district (incl. Manesar, Sohna)?
• Time frame — current operational count as of 2025, or a forward projection?
• Are we distinguishing AC slow chargers (7-22 kW) from DC fast chargers (50+ kW)?',

  -- Brownie points — things that impress the interviewer
  '• Segmenting by charger type: AC Level 2 (slow, ~7-22 kW) vs DC fast (50-150 kW) — because economics and use cases differ dramatically.
• Referencing FAME II / FAME III subsidy data specific to Haryana — shows awareness of policy levers.
• Benchmarking against Delhi (~3,000+ public chargers) and Bengaluru (~1,500) to triangulate.
• Noting Gurgaon-specific demand drivers: Cyber City / DLF corporate parks, Golf Course Road high-rises, NH-48 highway corridor, metro stations.
• Mentioning the grid capacity constraint — Gurgaon already has summer peak-load issues; fast-charger rollout needs HVPNL (Haryana Vidyut) coordination.
• Proposing a phased rollout: Phase 1 (2025-27) highways + malls, Phase 2 (2027-29) residential + fleet depots, Phase 3 (2029-30) ubiquitous coverage.',

  -- Keep in mind — the "root cause" / key insight the AI interviewer uses internally
  'The answer is approximately 250–400 public EV charging stations in Gurgaon as of mid-2025. Key estimation logic: Gurgaon has ~3,500 registered 4W EVs and ~15,000 registered 2W EVs. At ~1 public charger per 10-15 four-wheeler EVs (global best practice is 1:10), demand-side yields ~250-350 stations. Supply-side validation: ~80-100 in malls/commercial (DLF Cyber Hub, Ambience, MGF), ~60-80 in corporate parks (Cyber City, Udyog Vihar), ~40-50 at fuel stations (IOCL/BPCL EV add-ons), ~30-40 dedicated hubs (Tata Power, Ather Grid), ~40-60 at residential complexes = ~250-330 total.

For the CM recommendation: Target 2,000-2,500 stations by 2030 (aligned with Haryana EV Policy target of 4,000 state-wide). Investment: ₹800-1,200 Cr (at ₹35-50 lakh per DC fast charger station, ₹8-12 lakh per AC slow charger station, weighted mix). Key bottleneck is not capex but land acquisition, grid connectivity, and standardisation of charging connectors (CCS2 vs CHAdeMO vs BIS AC).'
)
ON CONFLICT (id) DO NOTHING;


-- ─── 2. CASE TURNS (Interview Flow) ─────────────────────────────────────
-- Turn 1: Interviewer opens the case
INSERT INTO case_turns (id, case_id, turn_number, role, dialogue_text, canvas_triggers) VALUES (
  'c0000001-0001-4000-a000-000000000001',
  'a0e1c2d3-0001-4000-a000-000000000001',
  1,
  'interviewer',
  'Welcome. Today I''d like you to help me with an estimate for the Chief Minister of Haryana. The CM is preparing for a policy review and wants to know: roughly how many EV charging stations are currently operational in Gurgaon? And based on that, what should the target be by 2030? Take a moment to think about how you''d structure this estimation.',
  '[{"type": "set_focus", "data": {"question": "How would you structure an estimation of EV charging stations in Gurgaon?", "tips": ["Think demand-side vs supply-side", "Consider what drives charger deployment", "Clarify scope before estimating"]}}]'
) ON CONFLICT (id) DO NOTHING;

-- Turn 2: Candidate proposes framework — scored on Structure
INSERT INTO case_turns (id, case_id, turn_number, role, dialogue_text, scoring_dimension, scoring_weight) VALUES (
  'c0000001-0001-4000-a000-000000000002',
  'a0e1c2d3-0001-4000-a000-000000000001',
  2,
  'candidate',
  '[Candidate proposes their estimation framework — ideally demand-side estimation, supply-side validation, cross-check, and recommendation to CM]',
  'Structure',
  25
) ON CONFLICT (id) DO NOTHING;

-- Turn 3: Interviewer probes demand-side estimation
INSERT INTO case_turns (id, case_id, turn_number, role, dialogue_text, canvas_triggers, exhibit_reveal) VALUES (
  'c0000001-0001-4000-a000-000000000003',
  'a0e1c2d3-0001-4000-a000-000000000001',
  3,
  'interviewer',
  'Good. Let''s start with the demand side. Walk me through your estimation: how many EVs are on Gurgaon''s roads, and how does that translate to charging station demand? Be specific about your assumptions on population, vehicle ownership, and EV penetration.',
  '[{"type": "add_context", "data": {"label": "GURGAON POPULATION", "value": "~1.5 million (municipal area)", "state": "confirmed"}}, {"type": "add_context", "data": {"label": "INDIA EV PENETRATION (4W)", "value": "~2-3% of new sales (2025)", "state": "confirmed"}}]',
  '{"type": "data_table", "title": "Gurgaon Vehicle & EV Data Points", "chart_data": {"headers": ["Metric", "Value", "Source"], "rows": [{"cells": ["Gurgaon registered vehicles", "~18 lakh (1.8M)", "Haryana Transport Dept"], "highlight": false}, {"cells": ["4W EV registrations (cumulative)", "~3,500", "Vahan Dashboard"], "highlight": true}, {"cells": ["2W EV registrations (cumulative)", "~15,000", "Vahan Dashboard"], "highlight": false}, {"cells": ["Avg household car ownership", "~1.3 cars/household", "Census extrapolation"], "highlight": false}]}}'
) ON CONFLICT (id) DO NOTHING;

-- Turn 4: Candidate does demand-side math — scored on Quantitative Rigor
INSERT INTO case_turns (id, case_id, turn_number, role, dialogue_text, scoring_dimension, scoring_weight) VALUES (
  'c0000001-0001-4000-a000-000000000004',
  'a0e1c2d3-0001-4000-a000-000000000001',
  4,
  'candidate',
  '[Candidate walks through demand-side math: population → households → vehicle ownership → EV penetration → charger-to-EV ratio → station count]',
  'Quantitative Rigor',
  25
) ON CONFLICT (id) DO NOTHING;

-- Turn 5: Interviewer pushes for supply-side validation
INSERT INTO case_turns (id, case_id, turn_number, role, dialogue_text, canvas_triggers, exhibit_reveal) VALUES (
  'c0000001-0001-4000-a000-000000000005',
  'a0e1c2d3-0001-4000-a000-000000000001',
  5,
  'interviewer',
  'Interesting. Now flip it — approach from the supply side. Where are EV chargers actually installed in a city like Gurgaon? Can you validate your demand-side number by building it bottom-up from location types?',
  '[{"type": "add_context", "data": {"label": "KEY CORRIDORS", "value": "NH-48, Golf Course Rd, Cyber City, Sohna Rd", "state": "confirmed"}}, {"type": "add_context", "data": {"label": "BENCHMARK", "value": "Delhi has ~3,000+ public chargers", "state": "hypothesis"}}]',
  '{"type": "bar_chart", "title": "Charger Locations by Type (Typical Tier-1 City)", "chart_data": {"bars": [{"label": "Malls & Retail", "value": 28, "color": "purple"}, {"label": "Corporate Parks", "value": 24, "color": "blue"}, {"label": "Fuel Stations", "value": 18, "color": "green"}, {"label": "Dedicated Hubs", "value": 15, "color": "amber"}, {"label": "Residential", "value": 10, "color": "red"}, {"label": "Highway/Transit", "value": 5, "color": "blue"}]}}'
) ON CONFLICT (id) DO NOTHING;

-- Turn 6: Candidate does supply-side + cross-check — scored on Creativity
INSERT INTO case_turns (id, case_id, turn_number, role, dialogue_text, scoring_dimension, scoring_weight) VALUES (
  'c0000001-0001-4000-a000-000000000006',
  'a0e1c2d3-0001-4000-a000-000000000001',
  6,
  'candidate',
  '[Candidate validates from supply-side: malls, corporate parks, fuel stations, residential — and cross-checks against Delhi benchmark or FAME II data]',
  'Creativity',
  20
) ON CONFLICT (id) DO NOTHING;

-- Turn 7: Interviewer pushes for CM recommendation
INSERT INTO case_turns (id, case_id, turn_number, role, dialogue_text, canvas_triggers) VALUES (
  'c0000001-0001-4000-a000-000000000007',
  'a0e1c2d3-0001-4000-a000-000000000001',
  7,
  'interviewer',
  'The CM has 2 minutes before his next meeting. Give him your final estimate, your 2030 target, and the investment ballpark. Structure it as a crisp executive brief — what, so what, now what.',
  '[{"type": "set_focus", "data": {"question": "Deliver a 2-minute executive brief to the CM: current count, 2030 target, investment needed.", "tips": ["Lead with the number", "Contextualize against demand", "Propose phased investment"]}}]'
) ON CONFLICT (id) DO NOTHING;

-- Turn 8: Candidate delivers recommendation — scored on Communication
INSERT INTO case_turns (id, case_id, turn_number, role, dialogue_text, scoring_dimension, scoring_weight) VALUES (
  'c0000001-0001-4000-a000-000000000008',
  'a0e1c2d3-0001-4000-a000-000000000001',
  8,
  'candidate',
  '[Candidate delivers structured recommendation: ~250-400 stations today, target 2,000+ by 2030, ~₹800-1,200 Cr investment, phased rollout plan]',
  'Communication',
  15
) ON CONFLICT (id) DO NOTHING;

-- Turn 9: Candidate speed scoring (system-evaluated)
INSERT INTO case_turns (id, case_id, turn_number, role, dialogue_text, scoring_dimension, scoring_weight) VALUES (
  'c0000001-0001-4000-a000-000000000009',
  'a0e1c2d3-0001-4000-a000-000000000001',
  9,
  'candidate',
  '[Speed is evaluated across all turns — how efficiently the candidate moved through the estimation without getting stuck]',
  'Speed',
  15
) ON CONFLICT (id) DO NOTHING;


-- ─── 3. FRAMEWORK NODES (Ideal Solution Tree) ──────────────────────────
-- The AI interviewer uses this tree to evaluate how close the candidate's
-- approach is to the "gold standard" solution structure.

-- Root node
INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000001',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'EV Charging Stations in Gurgaon',
  'Guesstimate',
  'root',
  'Root problem: Estimate the number of EV charging stations in Gurgaon for the Haryana CM. Requires both demand-side and supply-side estimation with cross-validation.',
  NULL,
  400, 40
) ON CONFLICT (id) DO NOTHING;

-- ── L1: Four main branches ──

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000002',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Demand-Side Estimation',
  'Estimation Approach',
  'optimal',
  'Top-down: Population → Households → Vehicles → EVs → Charger ratio → Station count. This is the primary estimation path.',
  'f0000001-0001-4000-a000-000000000001',
  150, 140
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000003',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Supply-Side Validation',
  'Validation',
  'optimal',
  'Bottom-up: Count chargers by location type (malls, corporate parks, fuel stations, residential, dedicated hubs). Validates the demand-side number.',
  'f0000001-0001-4000-a000-000000000001',
  400, 140
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000004',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Cross-Check & Benchmarking',
  'Cross-Check',
  'best',
  'Triangulate using Delhi benchmark (~3,000 chargers for ~30,000 EVs), FAME II subsidy allocation data, and industry reports (CEEW, NITI Aayog).',
  'f0000001-0001-4000-a000-000000000001',
  620, 140
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000005',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Recommendation to CM',
  'Recommendation',
  'optimal',
  'Synthesis: Current count ~250-400, target 2,000+ by 2030, investment ~₹800-1,200 Cr, phased rollout prioritizing highways and commercial first.',
  'f0000001-0001-4000-a000-000000000001',
  820, 140
) ON CONFLICT (id) DO NOTHING;

-- ── L2: Demand-Side children ──

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000006',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Population & Households',
  'Estimation Approach',
  'optimal',
  'Gurgaon population ~1.5M, ~400K households. This is the starting point for the demand funnel.',
  'f0000001-0001-4000-a000-000000000002',
  60, 260
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000007',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Vehicle Ownership Rate',
  'Estimation Approach',
  'optimal',
  '~1.3 cars per household in Gurgaon (high for India due to affluent demographics). ~520K registered 4W vehicles.',
  'f0000001-0001-4000-a000-000000000002',
  160, 260
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000008',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'EV Penetration Rate',
  'Estimation Approach',
  'best',
  'EV 4W penetration in Gurgaon ~0.7% of stock (3,500 out of ~500K). New sales penetration ~2-3%. Key assumption that differentiates good vs great answers.',
  'f0000001-0001-4000-a000-000000000002',
  260, 260
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000009',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Charger-to-EV Ratio',
  'Estimation Approach',
  'normal',
  'Global best practice: 1 public charger per 10-15 EVs. India currently at ~1:8-12 in metros. Yields ~250-350 stations for Gurgaon.',
  'f0000001-0001-4000-a000-000000000002',
  360, 260
) ON CONFLICT (id) DO NOTHING;

-- ── L2: Supply-Side children ──

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000010',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Malls & Commercial Hubs',
  'Validation',
  'best',
  '~15-20 major malls/commercial centers in Gurgaon (Ambience, DLF Mega Mall, Cyber Hub, etc.). ~4-6 chargers each = ~80-100 stations.',
  'f0000001-0001-4000-a000-000000000003',
  320, 260
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000011',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Corporate Parks & IT Corridors',
  'Validation',
  'best',
  'DLF Cyber City, Udyog Vihar, Golf Course Extension. ~10-12 major parks × 5-7 chargers = ~60-80 stations. High utilisation during work hours.',
  'f0000001-0001-4000-a000-000000000003',
  420, 260
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000012',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Fuel Stations with EV',
  'Validation',
  'normal',
  'IOCL, BPCL, HPCL adding EV chargers at existing pumps. ~50-60 fuel stations in Gurgaon, ~30-40% have EV chargers = ~18-24 stations.',
  'f0000001-0001-4000-a000-000000000003',
  520, 260
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000013',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Dedicated EV Hubs',
  'Validation',
  'normal',
  'Tata Power EZ Charge, Ather Grid, Statiq, ChargeZone. ~30-40 standalone hubs in Gurgaon. Growing fastest.',
  'f0000001-0001-4000-a000-000000000003',
  420, 360
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000014',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Residential Complexes',
  'Validation',
  'normal',
  'Gurgaon has ~200+ gated societies. Only ~20-30% have any EV charging. ~40-60 residential stations. Severely underserved — biggest gap.',
  'f0000001-0001-4000-a000-000000000003',
  520, 360
) ON CONFLICT (id) DO NOTHING;

-- ── L2: Cross-Check children ──

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000015',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Delhi / NCR Benchmark',
  'Cross-Check',
  'best',
  'Delhi has ~3,000+ public chargers for ~30,000 EVs. Gurgaon has ~10% of NCR EVs → implies ~300 chargers. Consistent with demand-side estimate.',
  'f0000001-0001-4000-a000-000000000004',
  580, 260
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000016',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'FAME II / III Subsidy Data',
  'Cross-Check',
  'normal',
  'FAME II sanctioned ~2,877 chargers for Haryana. ~30-35% allocated to Gurgaon district = ~850-1,000 sanctioned (but only ~30% operational).',
  'f0000001-0001-4000-a000-000000000004',
  680, 260
) ON CONFLICT (id) DO NOTHING;

-- ── L2: Recommendation children ──

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000017',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Current Gap Analysis',
  'Recommendation',
  'optimal',
  'Current: ~250-400 stations. For 2025 EV stock, need ~350-500. Gap of ~100-150 stations. Biggest gaps: residential (needs 3x), fleet depots (nearly zero).',
  'f0000001-0001-4000-a000-000000000005',
  760, 260
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000018',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Target: 2,000+ by 2030',
  'Recommendation',
  'best',
  'Aligned with Haryana EV Policy target of 4,000 state-wide. Gurgaon needs ~50% of state total given EV concentration. Phased: 800 by 2027, 2,000 by 2030.',
  'f0000001-0001-4000-a000-000000000005',
  860, 260
) ON CONFLICT (id) DO NOTHING;

INSERT INTO framework_nodes (id, case_id, label, framework, quality, analysis_note, parent_node_id, pos_x, pos_y) VALUES (
  'f0000001-0001-4000-a000-000000000019',
  'a0e1c2d3-0001-4000-a000-000000000001',
  'Investment: ₹800-1,200 Cr',
  'Recommendation',
  'normal',
  'DC fast charger station: ₹35-50 lakh each. AC slow charger: ₹8-12 lakh. Weighted mix of ~1,600 new stations → ₹800-1,200 Cr. Funding: 40% govt subsidy, 30% CPO equity, 30% debt.',
  'f0000001-0001-4000-a000-000000000005',
  960, 260
) ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (run after seed to confirm)
-- ═══════════════════════════════════════════════════════════════════════

-- Check case was inserted
-- SELECT id, name, status, case_type, industry FROM cases WHERE id = 'a0e1c2d3-0001-4000-a000-000000000001';

-- Check turns (should be 9 rows)
-- SELECT turn_number, role, scoring_dimension, scoring_weight FROM case_turns WHERE case_id = 'a0e1c2d3-0001-4000-a000-000000000001' ORDER BY turn_number;

-- Check framework nodes (should be 19 rows)
-- SELECT label, framework, quality, parent_node_id IS NULL as is_root FROM framework_nodes WHERE case_id = 'a0e1c2d3-0001-4000-a000-000000000001' ORDER BY pos_y, pos_x;
