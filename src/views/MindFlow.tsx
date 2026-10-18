import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CASE_MINDMAPS } from '../data/mindmaps.js';

/* ─────────────────────────────────────────────────────────────────────────────
   MIND FLOW — Post-interview interactive case analysis canvas.
   Dynamically builds a mind map from the user's actual interview turns,
   then overlays the optimal path from the case solution data.
   ───────────────────────────────────────────────────────────────────────────── */

// ── Styles ────────────────────────────────────────────────────────────────────

const STYLES = `
.mf-root{display:flex;flex-direction:column;height:100vh;background:var(--bg-base);font-family:'Plus Jakarta Sans',sans-serif;color:var(--text-primary);overflow:hidden;user-select:none}
.mf-tb{display:flex;align-items:center;gap:10px;padding:0 16px;height:52px;background:var(--bg-surface);border-bottom:1px solid var(--bg-border);flex-shrink:0;z-index:40}
.mf-tb-l{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.mf-tb-r{display:flex;align-items:center;gap:7px;flex-shrink:0}
.mf-cpill{display:flex;align-items:center;gap:7px;padding:5px 11px 5px 7px;background:var(--bg-elevated);border:1px solid var(--bg-border-bright);border-radius:8px}
.mf-ctype{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:500;padding:2px 7px;border-radius:4px;letter-spacing:.05em;text-transform:uppercase}
.mf-cname{font-size:13px;font-weight:600}
.mf-vdiv{width:1px;height:22px;background:var(--bg-border);margin:0 2px;flex-shrink:0}
.mf-utabs{display:flex;background:var(--bg-elevated);border:1px solid var(--bg-border-bright);border-radius:8px;padding:3px;gap:2px}
.mf-utab{padding:5px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--text-tertiary);transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif}
.mf-utab.on{background:var(--bg-surface);color:var(--text-primary);box-shadow:0 1px 3px rgba(0,0,0,.09)}
.mf-ulock{font-size:11px;color:var(--text-tertiary)}
.mf-btn{display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:7px;font-size:12px;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;border:1px solid var(--bg-border-bright);background:var(--bg-surface);color:var(--text-secondary);transition:all .12s}
.mf-btn:hover{background:var(--bg-elevated)}
.mf-btn.pri{background:var(--accent-purple);color:#fff;border-color:var(--accent-purple)}
.mf-btn.pri:hover{opacity:.88}
.mf-body{display:flex;flex:1;overflow:hidden;position:relative}
.mf-cw{flex:1;overflow:hidden;position:relative;cursor:grab}
.mf-cw.drag{cursor:grabbing}
.mf-cv{position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform}
.mf-banner{position:absolute;top:12px;left:50%;transform:translateX(-50%);background:var(--bg-surface);border:1px solid var(--bg-border-bright);border-radius:9px;padding:8px 18px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:10px;box-shadow:var(--shadow-card);z-index:50;white-space:nowrap}
.mf-sstrip{position:absolute;top:12px;left:16px;background:var(--bg-surface);border:1px solid var(--bg-border);border-radius:12px;padding:13px 16px;z-index:40;min-width:195px;box-shadow:var(--shadow-card)}
.mf-ss-lbl{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary);margin-bottom:5px}
.mf-ss-num{font-size:28px;font-weight:700;line-height:1}
.mf-ss-bar{height:5px;background:var(--bg-border);border-radius:3px;overflow:hidden;margin:5px 0 8px}
.mf-ss-fill{height:100%;border-radius:3px;transition:width .6s}
.mf-ss-row{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary);margin-bottom:3px}
.mf-ss-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.mf-lgnd{position:absolute;bottom:44px;left:16px;background:var(--bg-surface);border:1px solid var(--bg-border);border-radius:9px;padding:10px 13px;z-index:40;display:flex;flex-direction:column;gap:5px;box-shadow:var(--shadow-card)}
.mf-lr{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text-secondary)}
.mf-ld{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.mf-ll{width:18px;height:2px;border-radius:1px;flex-shrink:0}
.mf-lda{width:18px;height:0;flex-shrink:0;border-top:2px dashed}
.mf-zm{position:absolute;bottom:44px;right:16px;display:flex;align-items:center;gap:4px;z-index:40}
.mf-zbtn{width:26px;height:26px;border-radius:6px;border:1px solid var(--bg-border-bright);background:var(--bg-surface);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);box-shadow:var(--shadow-card)}
.mf-zbtn:hover{background:var(--bg-elevated)}
.mf-zpct{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text-tertiary);min-width:38px;text-align:center}
.mf-bb{height:38px;background:var(--bg-surface);border-top:1px solid var(--bg-border);display:flex;align-items:center;padding:0 16px;gap:16px;flex-shrink:0;z-index:40}
.mf-bst{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-tertiary)}
.mf-bst strong{font-family:'IBM Plex Mono',monospace;font-size:12px}
.mf-panel{width:320px;flex-shrink:0;background:var(--bg-surface);border-left:1px solid var(--bg-border);display:flex;flex-direction:column;overflow:hidden;z-index:30;transition:width .18s}
.mf-panel.hidden{width:0;border:none}
.mf-ph{padding:16px;border-bottom:1px solid var(--bg-border);flex-shrink:0}
.mf-ph-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:9px}
.mf-ph-title{font-size:14px;font-weight:700;line-height:1.35}
.mf-phx{width:22px;height:22px;border-radius:5px;border:1px solid var(--bg-border-bright);background:var(--bg-elevated);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);flex-shrink:0}
.mf-phx:hover{background:var(--bg-border)}
.mf-pb{flex:1;overflow-y:auto;padding:14px 16px}
.mf-pb::-webkit-scrollbar{width:3px}
.mf-pb::-webkit-scrollbar-thumb{background:var(--bg-border-bright);border-radius:2px}
.mf-psec{margin-bottom:15px}
.mf-plbl{font-family:'IBM Plex Mono',monospace;font-size:9.5px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:7px}
.mf-badges{display:flex;flex-wrap:wrap;gap:5px}
.mf-bdg{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:500;padding:3px 8px;border-radius:5px;letter-spacing:.04em;text-transform:uppercase}
.mf-pdesc{font-size:12.5px;color:var(--text-secondary);line-height:1.65}
.mf-fbc{padding:10px 12px;border-radius:8px;border:1px solid;margin-bottom:7px;font-size:12px;line-height:1.6}
.mf-pact{width:100%;padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;border:1px solid var(--bg-border-bright);background:var(--bg-elevated);color:var(--text-primary);margin-bottom:6px;transition:background .1s;text-align:left}
.mf-pact:hover{background:var(--bg-border)}
.mf-pact.pri{background:var(--accent-purple);color:#fff;border-color:transparent;text-align:center}
.mf-pact.pri:hover{opacity:.85}
`;

// ── Types ─────────────────────────────────────────────────────────────────────

type Quality = 'strong' | 'partial' | 'missed' | 'optimal' | 'root';
type UnlockLevel = 'mine' | 'optimal' | 'top';

type MFNode = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  framework: string;
  quality: Quality;
  feedback: string;
  fromOptimal: boolean; // true if node came from the optimal solution, not the user
  phase: string;
};

type MFEdge = {
  from: string;
  to: string;
  optimal: boolean;
  fromOptimal: boolean; // edge only appears from solution data
};

type AINodeExplored = {
  id: string;
  label: string;
  framework: string;
  quality: string;
  parent_id: string | null;
  feedback: string;
};

type Turn = {
  question?: string;
  response?: string | null;
  phase?: string;
  alexResponse?: {
    nodes_explored?: AINodeExplored[];
    score_rationale?: string;
    [key: string]: unknown;
  };
  scores?: Record<string, number>;
  [key: string]: unknown;
};

type SessionResult = {
  turns: Turn[];
  cumulativeScores: Record<string, number>;
  elapsed: number;
  caseId: string;
  [key: string]: unknown;
};

type CaseData = {
  id: string;
  title: string;
  type: string;
  industry: string;
  [key: string]: unknown;
};

// ── Layout engine: positions nodes in a tree ──────────────────────────────────

const NODE_W = 140;
const NODE_H = 48;
const GAP_X = 100;
const GAP_Y = 65;

function layoutTree(
  nodes: Array<{ id: string; parentId: string | null; [key: string]: unknown }>,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const children = new Map<string, string[]>();

  for (const n of nodes) {
    const pid = n.parentId ?? '__none__';
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid)!.push(n.id);
  }

  // BFS to assign depth
  const depth = new Map<string, number>();
  const roots = nodes.filter(n => !n.parentId || !nodes.some(o => o.id === n.parentId));
  const queue = roots.map(r => ({ id: r.id, d: 0 }));
  while (queue.length) {
    const { id, d } = queue.shift()!;
    if (depth.has(id)) continue;
    depth.set(id, d);
    for (const cid of children.get(id) ?? []) {
      queue.push({ id: cid, d: d + 1 });
    }
  }

  // Count nodes at each depth for vertical spread
  const depthCounts = new Map<number, number>();
  const depthIndex = new Map<string, number>();
  for (const [id, d] of depth) {
    const idx = depthCounts.get(d) ?? 0;
    depthIndex.set(id, idx);
    depthCounts.set(d, idx + 1);
  }

  for (const [id, d] of depth) {
    const count = depthCounts.get(d) ?? 1;
    const idx = depthIndex.get(id) ?? 0;
    const totalHeight = count * (NODE_H + GAP_Y);
    const startY = Math.max(30, (400 - totalHeight) / 2);
    positions.set(id, {
      x: 60 + d * (NODE_W + GAP_X),
      y: startY + idx * (NODE_H + GAP_Y),
    });
  }

  return positions;
}

// ── Build mind map from session data ──────────────────────────────────────────

function buildMindMap(result: SessionResult, caseData: CaseData) {
  const turns = result.turns ?? [];
  const caseId = caseData.id;

  // Collect all AI-reported nodes from the session
  const nodeMap = new Map<string, { parentId: string | null; label: string; framework: string; quality: Quality; feedback: string; phase: string }>();
  const edgeSet = new Set<string>();

  for (const turn of turns) {
    const aiNodes = turn.alexResponse?.nodes_explored;
    if (!Array.isArray(aiNodes)) continue;
    for (const n of aiNodes) {
      if (!n.id) continue;
      const q: Quality = n.quality === 'strong' ? 'strong' : n.quality === 'partial' ? 'partial' : n.quality === 'missed' ? 'missed' : 'strong';
      // Only update if we don't have it yet, or if the new quality is better
      if (!nodeMap.has(n.id)) {
        nodeMap.set(n.id, {
          parentId: n.parent_id ?? null,
          label: n.label,
          framework: n.framework ?? '',
          quality: n.id === 'root' ? 'root' : q,
          feedback: n.feedback ?? '',
          phase: (turn.phase as string) ?? 'structure',
        });
      }
      // Add edge
      if (n.parent_id && n.parent_id !== n.id) {
        edgeSet.add(`${n.parent_id}::${n.id}`);
      }
    }
  }

  // If AI didn't return any nodes, build a minimal tree from turn phases
  if (nodeMap.size === 0) {
    nodeMap.set('root', { parentId: null, label: caseData.title.split(' ').slice(0, 3).join(' '), framework: caseData.type ?? 'Analysis', quality: 'root', feedback: 'Case root', phase: 'structure' });
    const phases = [...new Set(turns.map(t => (t.phase as string) || 'structure'))];
    for (const phase of phases) {
      const phaseTurns = turns.filter(t => (t.phase || 'structure') === phase);
      const phaseId = phase.replace(/[^a-z0-9]/gi, '_');
      if (phaseId !== 'root') {
        nodeMap.set(phaseId, {
          parentId: 'root', label: phase.replace('_', ' '), framework: 'Phase',
          quality: phaseTurns.length > 0 ? 'strong' : 'partial',
          feedback: `${phaseTurns.length} turns in this phase`, phase,
        });
        edgeSet.add(`root::${phaseId}`);
      }
    }
  }

  // Optimal nodes from the pre-built case mindmaps (with slug and name fuzzy matching)
  const caseMindMapsTyped = CASE_MINDMAPS as Record<
    string,
    {
      nodes: Array<{ id: string; x: number; y: number; label: string; type: string; optimal: boolean }>;
      edges: Array<{ from: string; to: string; optimal: boolean }>;
      optimalPath: string[];
    }
  >;

  const caseTitleLower = (caseData.title || "").toLowerCase();
  const matchedKey =
    caseId in caseMindMapsTyped
      ? caseId
      : caseTitleLower.includes("ev") || caseTitleLower.includes("gurgaon")
      ? "evcharging"
      : caseTitleLower.includes("fashion") || caseTitleLower.includes("retail")
      ? "fastfashion"
      : caseTitleLower.includes("nordvik") || caseTitleLower.includes("margin")
      ? "nordvik"
      : Object.keys(caseMindMapsTyped)[0];

  const caseMindMap = caseMindMapsTyped[matchedKey];
  const optimalNodes = new Map<string, { parentId: string | null; label: string; framework: string; quality: Quality; feedback: string; phase: string }>();
  const optimalEdges = new Set<string>();

  if (caseMindMap) {
    // Build parent map from edges
    const parentOf = new Map<string, string>();
    for (const e of caseMindMap.edges) {
      parentOf.set(e.to, e.from);
    }
    for (const n of caseMindMap.nodes) {
      if (nodeMap.has(n.id)) continue; // User already explored this
      const isOnOptimal = caseMindMap.optimalPath.includes(n.id);
      optimalNodes.set(n.id, {
        parentId: parentOf.get(n.id) ?? null,
        label: n.label.replace('\n', ' '),
        framework: n.type === 'problem' ? 'Root' : n.type === 'recommendation' ? 'Recommendation' : n.type === 'confirmed' ? 'Confirmed' : n.type === 'root_cause' ? 'Root Cause' : n.type === 'risk' ? 'Risk' : 'Hypothesis',
        quality: isOnOptimal ? 'optimal' : 'missed',
        feedback: isOnOptimal ? 'Part of the optimal solution path' : 'Branch not explored during the session',
        phase: 'deep_dive',
      });
    }
    for (const e of caseMindMap.edges) {
      optimalEdges.add(`${e.from}::${e.to}`);
    }

    // Ensure any user node without a parent or edge gets connected to root so no independent floating boxes exist
    for (const [id, node] of nodeMap.entries()) {
      if (id !== 'problem' && id !== 'root') {
        const hasIncomingEdge = [...edgeSet].some(k => k.endsWith(`::${id}`));
        if (!hasIncomingEdge) {
          const matchedParent = parentOf.get(id) || 'problem';
          edgeSet.add(`${matchedParent}::${id}`);
        }
      }
    }
  }

  // Layout the user nodes
  const userNodeList = [...nodeMap.entries()].map(([id, data]) => ({ id, parentId: data.parentId }));
  const allForLayout = [...userNodeList, ...[...optimalNodes.entries()].map(([id, data]) => ({ id, parentId: data.parentId }))];
  const positions = layoutTree(allForLayout);

  // Build final node list
  const userNodes: MFNode[] = [...nodeMap.entries()].map(([id, data]) => {
    const pos = positions.get(id) ?? { x: 60, y: 200 };
    return { id, x: pos.x, y: pos.y, w: NODE_W, h: NODE_H, label: data.label, framework: data.framework, quality: data.quality, feedback: data.feedback, fromOptimal: false, phase: data.phase };
  });

  const optNodes: MFNode[] = [...optimalNodes.entries()].map(([id, data]) => {
    const pos = positions.get(id) ?? { x: 60, y: 200 };
    return { id, x: pos.x, y: pos.y, w: NODE_W, h: NODE_H, label: data.label, framework: data.framework, quality: data.quality, feedback: data.feedback, fromOptimal: true, phase: data.phase };
  });

  // Build edges
  const userEdges: MFEdge[] = [...edgeSet].map(key => {
    const [from, to] = key.split('::');
    return { from, to, optimal: false, fromOptimal: false };
  });

  const optEdges: MFEdge[] = [...optimalEdges].map(key => {
    const [from, to] = key.split('::');
    const isOpt = caseMindMap?.optimalPath?.includes(to) ?? false;
    return { from, to, optimal: isOpt, fromOptimal: true };
  });

  return { userNodes, optNodes, userEdges, optEdges };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getQualityColor(q: Quality): string {
  if (q === 'strong' || q === 'root') return '#0f9560';
  if (q === 'partial') return '#b87a00';
  if (q === 'optimal') return '#2055c7';
  return '#6b34d6'; // missed
}

function getQualityBg(q: Quality): string {
  if (q === 'strong' || q === 'root') return '#e6f7f1';
  if (q === 'partial') return '#fef3dc';
  if (q === 'optimal') return '#eaeffc';
  return '#f0ebfd';
}

function getQualityLabel(q: Quality): string {
  if (q === 'root') return 'Root';
  if (q === 'strong') return 'Strong';
  if (q === 'partial') return 'Partial';
  if (q === 'optimal') return 'Optimal path';
  return 'Not explored';
}

function bezier(a: MFNode, b: MFNode): string {
  const x1 = a.x + a.w, y1 = a.y + a.h / 2;
  const x2 = b.x, y2 = b.y + b.h / 2;
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  result: unknown;
  caseData: unknown;
  onViewDebrief: () => void;
  onNextCase: () => void;
};

export default function MindFlow({ result, caseData, onViewDebrief, onNextCase }: Props) {
  const sessionResult = result as SessionResult | null;
  const caseInfo = caseData as CaseData | null;

  const [unlock, setUnlock] = useState<UnlockLevel>('mine');
  const [selId, setSelId] = useState<string | null>('root');
  const [scale, setScale] = useState(0.84);
  const [off, setOff] = useState({ x: 22, y: 28 });
  const [drag, setDrag] = useState(false);
  const [lastPt, setLastPt] = useState({ x: 0, y: 0 });
  const [hov, setHov] = useState<string | null>(null);
  const wRef = useRef<HTMLDivElement>(null);

  // Build the mind map from real session data
  const { userNodes, optNodes, userEdges, optEdges } = useMemo(() => {
    if (!sessionResult || !caseInfo) {
      return { userNodes: [], optNodes: [], userEdges: [], optEdges: [] };
    }
    return buildMindMap(sessionResult, caseInfo);
  }, [sessionResult, caseInfo]);

  const allNodes = useMemo(() => [...userNodes, ...optNodes], [userNodes, optNodes]);

  // Visible sets based on unlock
  const visNodes = useMemo(() => {
    if (unlock === 'mine') return userNodes;
    if (unlock === 'optimal') return [...userNodes, ...optNodes.filter(n => n.quality === 'optimal')];
    return allNodes;
  }, [unlock, userNodes, optNodes, allNodes]);

  const visEdges = useMemo(() => {
    const base = [...userEdges];
    if (unlock === 'optimal') {
      base.push(...optEdges.filter(e => e.optimal));
    } else if (unlock === 'top') {
      base.push(...optEdges);
    }
    const vIds = new Set(visNodes.map(n => n.id));
    return base.filter(e => vIds.has(e.from) && vIds.has(e.to));
  }, [unlock, userEdges, optEdges, visNodes]);

  const selNode = allNodes.find(n => n.id === selId) || null;

  // Stats
  const strongCount = userNodes.filter(n => n.quality === 'strong' || n.quality === 'root').length;
  const partialCount = userNodes.filter(n => n.quality === 'partial').length;
  const missedCount = optNodes.filter(n => n.quality === 'missed').length;
  const scores = (sessionResult?.cumulativeScores ?? {}) as Record<string, number>;
  const scoreVals = Object.values(scores).filter(v => v > 0);
  const avgScore = scoreVals.length > 0 ? Math.round(scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length * 10) : 0;

  // Case type pill
  const caseType = caseInfo?.type ?? 'Analysis';
  const caseTypePillColor = caseType.includes('Profit') ? '#d4537e' : caseType.includes('Market') ? '#6b34d6' : '#b87a00';
  const caseTypePillBg = caseType.includes('Profit') ? '#fbeaf0' : caseType.includes('Market') ? '#f0ebfd' : '#fef3dc';

  // ── Pan & zoom ──
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const el = wRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const d = e.deltaY > 0 ? 0.88 : 1.13;
    setScale(s => {
      const ns = Math.min(2, Math.max(0.3, s * d));
      setOff(o => ({ x: mx - (mx - o.x) * (ns / s), y: my - (my - o.y) * (ns / s) }));
      return ns;
    });
  }, []);

  useEffect(() => {
    const el = wRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const mD = (e: React.MouseEvent) => { setDrag(true); setLastPt({ x: e.clientX, y: e.clientY }); };
  const mM = (e: React.MouseEvent) => { if (!drag) return; setOff(o => ({ x: o.x + e.clientX - lastPt.x, y: o.y + e.clientY - lastPt.y })); setLastPt({ x: e.clientX, y: e.clientY }); };
  const mU = () => setDrag(false);

  const svgW = visNodes.reduce((m, n) => Math.max(m, n.x + n.w + 100), 600);
  const svgH = visNodes.reduce((m, n) => Math.max(m, n.y + n.h + 80), 400);
  const zp = Math.round(scale * 100);

  const BANNERS: Record<UnlockLevel, { bg: string; border: string; color: string; icon: string; text: string }> = {
    mine:    { bg: '#fef3dc', border: '#b87a00', color: '#b87a00', icon: '\ud83d\udd0d', text: 'Your exploration path from this session' },
    optimal: { bg: '#e6f7f1', border: '#0f9560', color: '#0f9560', icon: '\u2713', text: 'Optimal solution branches revealed in blue' },
    top:     { bg: '#f0ebfd', border: '#6b34d6', color: '#6b34d6', icon: '\u2605', text: 'Full expert map \u2014 all branches visible' },
  };
  const banner = BANNERS[unlock];

  // Find related turn feedback for selected node
  const relatedTurns = useMemo(() => {
    if (!selNode || !sessionResult) return [];
    return sessionResult.turns.filter(t => {
      const explored = t.alexResponse?.nodes_explored;
      if (!Array.isArray(explored)) return false;
      return explored.some((n: AINodeExplored) => n.id === selNode.id);
    });
  }, [selNode, sessionResult]);

  return (
    <>
      <style>{STYLES}</style>
      <div className="mf-root">
        {/* TOP BAR */}
        <motion.div className="mf-tb" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' as const }}>
          <div className="mf-tb-l">
            <div className="mf-cpill">
              <span className="mf-ctype" style={{ background: caseTypePillBg, color: caseTypePillColor }}>{caseType}</span>
              <span className="mf-cname">{caseInfo?.title ?? 'Case Review'}</span>
            </div>
            <div className="mf-vdiv" />
            <div className="mf-utabs">
              {([
                { id: 'mine' as const, l: 'My path' },
                { id: 'optimal' as const, l: 'Optimal path' },
                { id: 'top' as const, l: 'All branches' },
              ]).map(t => (
                <button key={t.id} className={`mf-utab ${unlock === t.id ? 'on' : ''}`} onClick={() => { setUnlock(t.id); setSelId(null); }}>{t.l}</button>
              ))}
            </div>
            <span className="mf-ulock">
              {unlock === 'mine' && `${userNodes.length} branches explored`}
              {unlock === 'optimal' && 'Optimal solution overlaid'}
              {unlock === 'top' && `${allNodes.length} total branches`}
            </span>
          </div>
          <div className="mf-tb-r">
            <button className="mf-btn" onClick={onViewDebrief}>{'\u2190'} Full Debrief</button>
            <button className="mf-btn pri" onClick={onNextCase}>Next case {'\u2192'}</button>
          </div>
        </motion.div>

        {/* BODY */}
        <div className="mf-body">
          <div ref={wRef} className={`mf-cw${drag ? ' drag' : ''}`} onMouseDown={mD} onMouseMove={mM} onMouseUp={mU} onMouseLeave={mU} onClick={() => setSelId(null)}>
            {/* Dot grid */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <defs>
                <pattern id="mf-gp" width={28 * scale} height={28 * scale} patternUnits="userSpaceOnUse" x={off.x % (28 * scale)} y={off.y % (28 * scale)}>
                  <circle cx={14 * scale} cy={14 * scale} r=".9" fill="rgba(0,0,0,0.06)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mf-gp)" />
            </svg>

            {/* Banner */}
            <AnimatePresence mode="wait">
              <motion.div key={unlock} className="mf-banner" style={{ borderColor: banner.border, background: banner.bg, color: banner.color }} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }}>
                <span>{banner.icon}</span>
                <span>{banner.text}</span>
              </motion.div>
            </AnimatePresence>

            {/* Score strip */}
            <motion.div className="mf-sstrip" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
              <div className="mf-ss-lbl">Session score</div>
              <div className="mf-ss-num" style={{ color: avgScore >= 70 ? '#0f9560' : avgScore >= 50 ? '#b87a00' : '#c93030' }}>
                {avgScore}<span style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 400 }}>/100</span>
              </div>
              <div className="mf-ss-bar"><div className="mf-ss-fill" style={{ width: `${avgScore}%`, background: avgScore >= 70 ? '#0f9560' : avgScore >= 50 ? '#b87a00' : '#c93030' }} /></div>
              <div className="mf-ss-row"><div className="mf-ss-dot" style={{ background: '#0f9560' }} />{strongCount} branches {'\u2014'} strong</div>
              <div className="mf-ss-row"><div className="mf-ss-dot" style={{ background: '#b87a00' }} />{partialCount} branches {'\u2014'} partial</div>
              {unlock !== 'mine' && <div className="mf-ss-row"><div className="mf-ss-dot" style={{ background: '#c93030' }} />{missedCount} branches {'\u2014'} missed</div>}
              <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-tertiary)' }}>
                {sessionResult?.turns?.length ?? 0} turns {'\u00b7'} {Math.floor((sessionResult?.elapsed ?? 0) / 60)}m {(sessionResult?.elapsed ?? 0) % 60}s
              </div>
            </motion.div>

            {/* SVG Canvas */}
            <div className="mf-cv" style={{ transform: `translate(${off.x}px,${off.y}px) scale(${scale})`, transformOrigin: '0 0' }}>
              <svg width={svgW} height={svgH} style={{ overflow: 'visible' }}>
                <defs>
                  <marker id="mf-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </marker>
                  <filter id="mf-sh"><feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity=".08" /></filter>
                </defs>
                {/* Edges */}
                {visEdges.map((e, i) => {
                  const a = visNodes.find(n => n.id === e.from);
                  const b = visNodes.find(n => n.id === e.to);
                  if (!a || !b) return null;
                  const color = e.optimal ? '#2055c7' : e.fromOptimal ? '#6b34d6' : b.quality === 'strong' || b.quality === 'root' ? '#0f9560' : b.quality === 'partial' ? '#b87a00' : 'rgba(0,0,0,0.18)';
                  return <path key={i} d={bezier(a, b)} fill="none" stroke={color} strokeWidth={e.optimal ? 2 : 1.2} strokeDasharray={e.fromOptimal ? '5,3' : 'none'} markerEnd="url(#mf-arr)" style={{ transition: 'stroke .2s' }} />;
                })}
                {/* Nodes */}
                {visNodes.map(n => {
                  const isSel = selId === n.id;
                  const isHov = hov === n.id;
                  const color = getQualityColor(n.quality);
                  const bg = getQualityBg(n.quality);
                  const lines = n.label.split('\n');
                  const lh = 14;
                  const tY = n.h / 2 - (lines.length - 1) * lh / 2;
                  return (
                    <g key={n.id} transform={`translate(${n.x},${n.y})`} style={{ cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); setSelId(selId === n.id ? null : n.id); }}
                      onMouseEnter={() => setHov(n.id)} onMouseLeave={() => setHov(null)}
                      filter={(isSel || isHov) ? 'url(#mf-sh)' : 'none'}>
                      {n.fromOptimal && (
                        <rect x={-4} y={-4} width={n.w + 8} height={n.h + 8} rx={13} fill="none" stroke="#6b34d6" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.4} />
                      )}
                      {isSel && (
                        <rect x={-2} y={-2} width={n.w + 4} height={n.h + 4} rx={11} fill="none" stroke={color} strokeWidth={2} opacity={0.4} />
                      )}
                      <rect x={0} y={0} width={n.w} height={n.h} rx={8} fill={bg} stroke={color} strokeWidth={isSel ? 1.8 : 0.8} strokeDasharray={n.fromOptimal ? '5,3' : 'none'} style={{ transition: 'fill .15s' }} />
                      {/* Framework pill */}
                      {n.framework && (
                        <>
                          <rect x={4} y={-11} width={Math.min(n.w - 8, n.framework.length * 5.5 + 14)} height={13} rx={4} fill={bg} stroke={color} strokeWidth={0.5} />
                          <text x={10} y={-1} fill={color} fontSize={8} fontFamily="IBM Plex Mono,monospace" fontWeight="500">{n.framework}</text>
                        </>
                      )}
                      {/* Quality dot */}
                      <circle cx={n.w - 8} cy={8} r={4} fill={color} opacity={0.9} />
                      {/* Label */}
                      {lines.map((ln, i) => (
                        <text key={i} x={n.w / 2} y={tY + i * lh + 4} textAnchor="middle" dominantBaseline="middle" fill={n.fromOptimal ? '#6b34d6' : color} fontSize={11} fontWeight="600" fontFamily="Plus Jakarta Sans,sans-serif">{ln}</text>
                      ))}
                      {/* Sub text */}
                      {n.fromOptimal && (
                        <text x={n.w / 2} y={n.h - 6} textAnchor="middle" dominantBaseline="middle" fill="rgba(0,0,0,.3)" fontSize={8} fontFamily="IBM Plex Mono,monospace">not explored</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <motion.div className="mf-lgnd" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Legend</div>
              <div className="mf-lr"><div className="mf-ld" style={{ background: '#0f9560' }} /> Strong branch</div>
              <div className="mf-lr"><div className="mf-ld" style={{ background: '#b87a00' }} /> Partial branch</div>
              {unlock !== 'mine' && <div className="mf-lr"><div className="mf-ld" style={{ background: '#2055c7' }} /> Optimal path</div>}
              {unlock === 'top' && <div className="mf-lr"><div className="mf-ld" style={{ background: '#6b34d6' }} /> Missed branch</div>}
              <div className="mf-lr"><div className="mf-ll" style={{ background: '#0f9560' }} /> Explored edge</div>
              {unlock !== 'mine' && <div className="mf-lr"><div className="mf-lda" style={{ borderColor: '#6b34d6' }} /> Solution edge</div>}
            </motion.div>

            {/* Zoom */}
            <div className="mf-zm">
              <button className="mf-zbtn" onClick={() => setScale(s => Math.max(0.3, s * 0.85))}>{'\u2212'}</button>
              <span className="mf-zpct">{zp}%</span>
              <button className="mf-zbtn" onClick={() => setScale(s => Math.min(2, s * 1.18))}>+</button>
              <button className="mf-zbtn" style={{ fontSize: 11 }} onClick={() => { setScale(0.84); setOff({ x: 22, y: 28 }); }}>{'\u21ba'}</button>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className={`mf-panel${!selNode ? ' hidden' : ''}`}>
            {selNode && (
              <>
                <div className="mf-ph">
                  <div className="mf-ph-top">
                    <div className="mf-ph-title">{selNode.label.replace('\n', ' ')}</div>
                    <button className="mf-phx" onClick={() => setSelId(null)}>{'\u2715'}</button>
                  </div>
                  <div className="mf-badges">
                    <span className="mf-bdg" style={{ background: getQualityBg(selNode.quality), color: getQualityColor(selNode.quality) }}>{getQualityLabel(selNode.quality)}</span>
                    {selNode.framework && <span className="mf-bdg" style={{ background: '#f0eeea', color: '#888' }}>{selNode.framework}</span>}
                    <span className="mf-bdg" style={{ background: '#f0eeea', color: '#888' }}>{selNode.phase.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="mf-pb">
                  {/* Not explored notice */}
                  {selNode.fromOptimal && (
                    <div className="mf-psec">
                      <div className="mf-fbc" style={{ borderColor: '#c3a8f5', background: '#f0ebfd', color: '#5b2aad' }}>
                        <strong>You didn&apos;t explore this branch.</strong>
                        <div style={{ marginTop: 5, opacity: 0.85, fontSize: 12 }}>
                          {selNode.quality === 'optimal' ? 'This is on the optimal solution path.' : 'Top scorers typically explore this within the first few minutes.'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI feedback for this node */}
                  {selNode.feedback && (
                    <div className="mf-psec">
                      <div className="mf-plbl">Feedback</div>
                      <div className="mf-fbc" style={{
                        borderColor: selNode.quality === 'strong' || selNode.quality === 'root' ? '#0f9560' : selNode.quality === 'partial' ? '#b87a00' : '#c3a8f5',
                        background: getQualityBg(selNode.quality),
                        color: 'var(--text-secondary)',
                      }}>{selNode.feedback}</div>
                    </div>
                  )}

                  {/* Turn-level feedback from the interview */}
                  {relatedTurns.length > 0 && (
                    <div className="mf-psec">
                      <div className="mf-plbl">Interviewer comments</div>
                      {relatedTurns.map((t, i) => (
                        <div key={i} className="mf-fbc" style={{ borderColor: 'var(--bg-border-bright)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          {t.alexResponse?.score_rationale || t.question || 'No additional feedback'}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mf-psec" style={{ marginTop: 8 }}>
                    {selNode.fromOptimal && unlock === 'mine' && (
                      <button className="mf-pact pri" onClick={() => setUnlock('optimal')}>
                        Unlock optimal path {'\u2197'}
                      </button>
                    )}
                    <button className="mf-pact" onClick={onViewDebrief}>
                      View full scoring debrief
                    </button>
                  </div>
                </div>
              </>
            )}
            {!selNode && (
              <div style={{ padding: 24, color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', marginTop: 80 }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>{'\ud83c\udf3f'}</div>
                <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Click any node</div>
                <div style={{ lineHeight: 1.6 }}>See interviewer feedback and compare your path to the optimal solution.</div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM BAR */}
        <motion.div className="mf-bb" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="mf-bst">Nodes <strong style={{ color: 'var(--text-primary)' }}>{visNodes.length}</strong></div>
          <div className="mf-bst">Strong <strong style={{ color: '#0f9560' }}>{strongCount}</strong></div>
          <div className="mf-bst">Partial <strong style={{ color: '#b87a00' }}>{partialCount}</strong></div>
          {unlock !== 'mine' && <div className="mf-bst">Missed <strong style={{ color: '#c93030' }}>{missedCount}</strong></div>}
          <div className="mf-bst">Score <strong style={{ color: avgScore >= 70 ? '#0f9560' : '#b87a00' }}>{avgScore}/100</strong></div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 500, padding: '3px 10px', borderRadius: 5, textTransform: 'uppercase', background: unlock === 'mine' ? '#fef3dc' : unlock === 'optimal' ? '#e6f7f1' : '#f0ebfd', color: unlock === 'mine' ? '#b87a00' : unlock === 'optimal' ? '#0f9560' : '#6b34d6' }}>
              {unlock === 'mine' ? 'My path' : unlock === 'optimal' ? 'Optimal revealed' : 'Expert map'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="mf-zbtn" onClick={() => setScale(s => Math.max(0.3, s * 0.85))}>{'\u2212'}</button>
              <span className="mf-zpct">{zp}%</span>
              <button className="mf-zbtn" onClick={() => setScale(s => Math.min(2, s * 1.18))}>+</button>
              <button className="mf-zbtn" style={{ fontSize: 11 }} onClick={() => { setScale(0.84); setOff({ x: 22, y: 28 }); }}>{'\u21ba'}</button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
