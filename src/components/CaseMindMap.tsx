/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CASE_MINDMAPS, getBestAttempt } from '../data/mindmaps.js';

const NODE_STYLES: Record<string, {
  fill: string; stroke: string; textColor: string;
  badgeBg: string; badgeText: string; label: string;
}> = {
  problem:        { fill: '#FFFFFF', stroke: '#6B34D6', textColor: '#18181B', badgeBg: '#F0EBFD', badgeText: '#6B34D6', label: 'Root Problem' },
  hypothesis:     { fill: '#FFFFFF', stroke: '#2055C7', textColor: '#18181B', badgeBg: '#EAEFFC', badgeText: '#2055C7', label: 'Hypothesis' },
  confirmed:      { fill: '#FFFFFF', stroke: '#0F9560', textColor: '#18181B', badgeBg: '#E6F7F1', badgeText: '#0F9560', label: 'Confirmed' },
  dead_end:       { fill: '#FFFFFF', stroke: '#94A3B8', textColor: '#475569', badgeBg: '#F1F5F9', badgeText: '#64748B', label: 'Dead End' },
  root_cause:     { fill: '#FFFFFF', stroke: '#7C3AED', textColor: '#18181B', badgeBg: '#F3E8FF', badgeText: '#7C3AED', label: 'Root Cause' },
  contributing:   { fill: '#FFFFFF', stroke: '#D97706', textColor: '#18181B', badgeBg: '#FEF3C7', badgeText: '#B45309', label: 'Contributing' },
  recommendation: { fill: '#FFFFFF', stroke: '#059669', textColor: '#18181B', badgeBg: '#D1FAE5', badgeText: '#047857', label: 'Recommendation' },
  risk:           { fill: '#FFFFFF', stroke: '#E11D48', textColor: '#18181B', badgeBg: '#FFE4E6', badgeText: '#BE123C', label: 'Risk / Flaw' },
  branch:         { fill: '#FFFFFF', stroke: '#64748B', textColor: '#334155', badgeBg: '#F8FAFC', badgeText: '#475569', label: 'Branch' },
};

const LEGEND = [
  { type: 'problem',        label: 'Root Problem'   },
  { type: 'hypothesis',     label: 'Hypothesis'     },
  { type: 'confirmed',      label: 'Confirmed'      },
  { type: 'root_cause',     label: 'Root Cause'     },
  { type: 'recommendation', label: 'Recommendation' },
  { type: 'dead_end',       label: 'Dead End'       },
  { type: 'risk',           label: 'Risk / Barrier' },
];

type MindMapNode = {
  id: string; x: number; y: number; label: string;
  type: string; optimal: boolean;
};
type MindMapEdge = { from: string; to: string; optimal: boolean };
type MapData = {
  caseTitle: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  optimalPath: string[];
  phaseNodes: Record<string, string[]>;
};

type Props = {
  caseId: string;
  userVisitedNodes?: string[];
  currentScore?: number;
  revealed?: boolean;
};

function buildCurvedPath(x1: number, y1: number, x2: number, y2: number) {
  const cy = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
}

export default function CaseMindMap({ caseId, userVisitedNodes = [], currentScore = 0, revealed = true }: Props) {
  const [isRevealed, setIsRevealed] = useState(revealed);
  const [mode, setMode] = useState<'yours' | 'optimal' | 'best'>('yours');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Robust case map lookup with fallbacks
  const map: MapData | undefined = useMemo(() => {
    const maps = CASE_MINDMAPS as Record<string, MapData>;
    if (maps[caseId]) return maps[caseId];
    const cid = (caseId || '').toLowerCase();
    if (cid.includes('ev') || cid.includes('gurgaon')) return maps.evcharging;
    if (cid.includes('fashion') || cid.includes('retail')) return maps.fastfashion;
    if (cid.includes('nordvik') || cid.includes('margin')) return maps.nordvik;
    if (cid.includes('indev') || cid.includes('breakeven')) return maps.indev;
    return Object.values(maps)[0] || maps.evcharging;
  }, [caseId]);

  const bestAttempt = map ? getBestAttempt(caseId) : null;

  if (!map) return null;

  const optimalSet = new Set(map.optimalPath);

  const activeNodes = useMemo(() => {
    if (!isRevealed) return new Set<string>();
    if (mode === 'optimal') return new Set(map.optimalPath);
    if (mode === 'best' && bestAttempt) return new Set(bestAttempt.visitedNodes as string[]);
    if (userVisitedNodes && userVisitedNodes.length > 0) return new Set(userVisitedNodes);
    // fallback: if user finished interview, show all nodes
    return new Set(map.nodes.map(n => n.id));
  }, [isRevealed, mode, map, userVisitedNodes, bestAttempt]);

  const getNode = (id: string) => map.nodes.find(n => n.id === id);

  // Dimensions & bounds
  const nodeW = (type: string) => (type === 'problem' ? 132 : 112);
  const nodeH = (type: string) => (type === 'problem' ? 46 : 42);

  const xs = map.nodes.map(n => n.x);
  const ys = map.nodes.map(n => n.y);
  const minX = Math.min(...xs) - 75;
  const minY = Math.min(...ys) - 35;
  const maxX = Math.max(...xs) + 75;
  const maxY = Math.max(...ys) + 55;
  const vw = maxX - minX;
  const vh = maxY - minY;

  const matchedOptimalCount = map.optimalPath.filter(id => activeNodes.has(id)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div className="mono" style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
            Solution Architecture
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {map.caseTitle}
          </div>
        </div>

        {!isRevealed ? (
          <motion.button
            onClick={() => setIsRevealed(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 18px',
              background: '#6B34D6',
              border: 'none',
              borderRadius: '8px',
              color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(107,52,214,0.25)',
            }}
          >
            Reveal Solution Map
          </motion.button>
        ) : (
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'yours',   label: 'Your Path', icon: '◎' },
              { key: 'optimal', label: 'Optimal Path', icon: '★' },
              ...(bestAttempt ? [{ key: 'best', label: 'Best Attempt', icon: '🏆' }] : []),
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => setMode(btn.key as 'yours' | 'optimal' | 'best')}
                style={{
                  padding: '7px 14px', fontSize: '12px', fontWeight: 600,
                  borderRadius: '8px', cursor: 'pointer',
                  transition: '150ms ease',
                  border: mode === btn.key ? '1px solid rgba(107,52,214,0.35)' : '1px solid var(--bg-border)',
                  background: mode === btn.key ? '#F0EBFD' : 'var(--bg-elevated)',
                  color: mode === btn.key ? '#6B34D6' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span>{btn.icon}</span> {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SVG Canvas Map */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--bg-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
      }}>
        {/* Lock overlay if locked */}
        <AnimatePresence>
          {!isRevealed && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 10,
                backdropFilter: 'blur(6px)',
                background: 'rgba(245,244,241,0.92)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '38px', opacity: 0.7 }}>🗺️</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Solution Map Locked</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px' }}>
                Reveal to compare your interview thinking against the McKinsey-standard optimal path.
              </div>
              <button
                onClick={() => setIsRevealed(true)}
                style={{
                  marginTop: '6px',
                  padding: '8px 18px',
                  background: '#6B34D6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '7px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Reveal Solution Map
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <svg
          width="100%"
          viewBox={`${minX} ${minY} ${vw} ${vh}`}
          style={{ display: 'block', minHeight: '340px' }}
        >
          {/* Grid pattern & filters */}
          <defs>
            <pattern id="mindmap-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(0,0,0,0.035)" strokeWidth="0.6"/>
            </pattern>
            <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.06"/>
            </filter>
            <filter id="active-shadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#6B34D6" floodOpacity="0.18"/>
            </filter>
          </defs>
          <rect x={minX} y={minY} width={vw} height={vh} fill="url(#mindmap-grid)" />

          {/* Edges */}
          {map.edges.map((edge, i) => {
            const a = getNode(edge.from);
            const b = getNode(edge.to);
            if (!a || !b) return null;

            const aH = nodeH(a.type);
            const bH = nodeH(b.type);
            const path = buildCurvedPath(a.x, a.y + aH / 2, b.x, b.y - bH / 2);

            const isActive = activeNodes.has(edge.from) && activeNodes.has(edge.to);
            const isOpt = edge.optimal && optimalSet.has(edge.from) && optimalSet.has(edge.to);

            const strokeColor = !isRevealed
              ? 'rgba(0,0,0,0.08)'
              : isActive && isOpt
              ? '#6B34D6'
              : isActive
              ? '#2055C7'
              : 'rgba(0,0,0,0.12)';

            return (
              <path
                key={i}
                d={path}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isActive ? 2 : 1.2}
                strokeDasharray={isActive ? 'none' : '4 4'}
                strokeOpacity={isActive ? 0.9 : 0.4}
                style={{ transition: 'stroke 200ms ease, stroke-width 200ms ease' }}
              />
            );
          })}

          {/* Nodes rendered as sleek rounded cards */}
          {map.nodes.map((node) => {
            const isUser = activeNodes.has(node.id);
            const isOptimal = optimalSet.has(node.id);
            const isHov = hoveredNode === node.id;
            const s = NODE_STYLES[node.type] ?? NODE_STYLES.branch;

            const w = nodeW(node.type);
            const h = nodeH(node.type);
            const rx = 8;
            const lines = node.label.split('\n');

            // Opacity: active nodes full opacity, missed branches 45% (or 100% on hover)
            const nodeOpacity = !isRevealed ? 0.2 : (isUser || isHov ? 1.0 : 0.45);
            const strokeColor = isHov ? '#6B34D6' : isUser ? s.stroke : 'rgba(0,0,0,0.18)';
            const strokeW = isUser ? 2 : 1;
            const strokeDash = isUser ? 'none' : '3 3';

            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{
                  cursor: 'pointer',
                  opacity: nodeOpacity,
                  transition: 'opacity 180ms ease',
                }}
              >
                {/* Node Card Background */}
                <rect
                  x={node.x - w / 2}
                  y={node.y - h / 2}
                  width={w}
                  height={h}
                  rx={rx}
                  fill={isUser ? '#FFFFFF' : '#FAFAF8'}
                  stroke={strokeColor}
                  strokeWidth={strokeW}
                  strokeDasharray={strokeDash}
                  filter={isHov ? 'url(#active-shadow)' : 'url(#card-shadow)'}
                />

                {/* Left accent color bar */}
                <path
                  d={`M ${node.x - w / 2 + 1} ${node.y - h / 2 + rx} Q ${node.x - w / 2 + 1} ${node.y - h / 2 + 1} ${node.x - w / 2 + rx} ${node.y - h / 2 + 1} L ${node.x - w / 2 + 4} ${node.y - h / 2 + 1} L ${node.x - w / 2 + 4} ${node.y + h / 2 - 1} L ${node.x - w / 2 + rx} ${node.y + h / 2 - 1} Q ${node.x - w / 2 + 1} ${node.y + h / 2 - 1} ${node.x - w / 2 + 1} ${node.y + h / 2 - rx} Z`}
                  fill={s.stroke}
                  opacity={isUser ? 1 : 0.4}
                />

                {/* Status indicator on top right (Optimal star or Visited dot) */}
                {isOptimal && (
                  <text
                    x={node.x + w / 2 - 8}
                    y={node.y - h / 2 + 11}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#D97706"
                    fontWeight="700"
                  >
                    ★
                  </text>
                )}
                {isUser && !isOptimal && (
                  <circle
                    cx={node.x + w / 2 - 8}
                    cy={node.y - h / 2 + 8}
                    r={2.5}
                    fill={s.stroke}
                  />
                )}

                {/* Node Label Lines */}
                {lines.map((line, i) => {
                  const lineCount = lines.length;
                  const lineH = 13;
                  const startY = node.y - ((lineCount - 1) * lineH) / 2 + 4;
                  return (
                    <text
                      key={i}
                      x={node.x + 2}
                      y={startY + i * lineH}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isUser ? s.textColor : '#64748B'}
                      fontSize={node.type === 'problem' ? '10' : '9'}
                      fontFamily="IBM Plex Sans, Plus Jakarta Sans, system-ui, sans-serif"
                      fontWeight={isUser ? '600' : '500'}
                      letterSpacing="-0.01em"
                    >
                      {line}
                    </text>
                  );
                })}
              </g>
            );
          })}

          {/* Interactive Tooltip on Hover */}
          {hoveredNode && isRevealed && (() => {
            const n = getNode(hoveredNode);
            if (!n) return null;
            const isUser = activeNodes.has(n.id);
            const isOpt = optimalSet.has(n.id);
            const s = NODE_STYLES[n.type] ?? NODE_STYLES.branch;
            const w = nodeW(n.type);
            const h = nodeH(n.type);

            const tipText = isOpt && isUser
              ? '★ Optimal Path · Explored in your interview'
              : isOpt
              ? '★ Optimal Path · Missed in your interview'
              : isUser
              ? '◎ Explored branch in your session'
              : '— Branch not explored in your session';

            const tipW = 210;
            const tipH = 24;
            const tipX = Math.min(Math.max(n.x - tipW / 2, minX + 10), maxX - tipW - 10);
            const tipY = n.y - h / 2 - tipH - 8;

            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={tipX}
                  y={tipY}
                  width={tipW}
                  height={tipH}
                  rx={6}
                  fill="#18181B"
                  filter="url(#card-shadow)"
                />
                <text
                  x={tipX + tipW / 2}
                  y={tipY + 15}
                  textAnchor="middle"
                  fill="#F8FAFC"
                  fontSize="8.5"
                  fontFamily="IBM Plex Sans, sans-serif"
                  fontWeight="600"
                  letterSpacing="0.02em"
                >
                  {tipText}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legend & Stats */}
      {isRevealed && (
        <div style={{
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: '4px 2px',
        }}>
          {LEGEND.map(({ type, label }) => {
            const s = NODE_STYLES[type];
            return (
              <span
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    border: `1.5px solid ${s.stroke}`,
                    background: s.badgeBg,
                    display: 'inline-block',
                  }}
                />
                {label}
              </span>
            );
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px' }}>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span style={{ color: '#2055C7', fontWeight: 600 }}>{activeNodes.size}</span>
              /{map.nodes.length} nodes explored
            </span>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Optimal: <span style={{ color: '#6B34D6', fontWeight: 600 }}>
                {matchedOptimalCount}/{map.optimalPath.length}
              </span> matched
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
