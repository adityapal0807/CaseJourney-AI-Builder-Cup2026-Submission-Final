export const RANK_THRESHOLDS = [
  { min: 0,    max: 999,  label: 'ANALYST',      color: '#8B8A8E', badge: 'gray' },
  { min: 1000, max: 1199, label: 'ASSOCIATE I',  color: '#7B6FE8', badge: 'purple' },
  { min: 1200, max: 1399, label: 'ASSOCIATE II', color: '#7B6FE8', badge: 'purple' },
  { min: 1400, max: 1599, label: 'MANAGER I',    color: '#3B82F6', badge: 'blue' },
  { min: 1600, max: 1799, label: 'MANAGER II',   color: '#3B82F6', badge: 'blue' },
  { min: 1800, max: Infinity, label: 'PARTNER',  color: '#F59E0B', badge: 'gold' },
];

export function getRank(elo) {
  return RANK_THRESHOLDS.find(r => elo >= r.min && elo <= r.max) || RANK_THRESHOLDS[0];
}

export function calcEloChange(score) {
  // score is 0–10, ELO changes by (score - 7) * 4
  return Math.round((score - 7) * 4);
}

export function calcFinalScore(cumulativeScores) {
  const vals = Object.values(cumulativeScores).filter(v => v !== null && v > 0);
  if (vals.length === 0) return 7.0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export const ACHIEVEMENTS = [
  { id: 'mece_machine',   label: 'MECE Machine',    condition: (scores) => scores.structure >= 9,    color: '#7B6FE8' },
  { id: 'quant_wizard',   label: 'Quant Wizard',    condition: (scores) => scores.quantitative >= 9,  color: '#22C55E' },
  { id: 'wildcard_tamer', label: 'Wildcard Tamer',  condition: (scores) => scores.creativity >= 9,    color: '#F59E0B' },
  { id: 'speed_demon',    label: 'Speed Demon',     condition: (scores) => scores.speed >= 9,          color: '#EF4444' },
  { id: 'communicator',   label: 'The Communicator',condition: (scores) => scores.communication >= 9, color: '#3B82F6' },
];

export const SCORE_STANDARD = {
  structure: 8,
  quantitative: 8,
  creativity: 7,
  communication: 8,
  speed: 7,
};
