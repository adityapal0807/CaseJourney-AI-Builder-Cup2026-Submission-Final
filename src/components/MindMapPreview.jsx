import styles from './MindMapPreview.module.css';

const DEFAULT_NODES = [
  { id: 'root',    x: 200, y: 180, label: 'Margin Collapse', type: 'root' },
  { id: 'rev',     x: 80,  y: 80,  label: 'Revenue', type: 'branch' },
  { id: 'cost',    x: 320, y: 80,  label: 'Cost', type: 'confirmed' },
  { id: 'vol',     x: 40,  y: 200, label: 'Volume', type: 'dead' },
  { id: 'price',   x: 100, y: 280, label: 'Pricing', type: 'dead' },
  { id: 'cogs',    x: 320, y: 200, label: 'COGS', type: 'confirmed' },
  { id: 'supplier',x: 360, y: 300, label: 'Supplier Conc.', type: 'confirmed' },
  { id: 'rec',     x: 200, y: 320, label: 'Dual-source', type: 'recommendation' },
];

const EDGES = [
  ['root', 'rev'], ['root', 'cost'],
  ['rev', 'vol'], ['rev', 'price'],
  ['cost', 'cogs'], ['cogs', 'supplier'],
  ['supplier', 'rec'],
];

const TYPE_STYLES = {
  root:           { fill: '#7B6FE8', textColor: '#fff', r: 28 },
  branch:         { fill: '#3B82F6', textColor: '#fff', r: 20 },
  confirmed:      { fill: '#22C55E', textColor: '#fff', r: 20 },
  dead:           { fill: '#2A2A32', textColor: '#4A4A52', r: 16 },
  recommendation: { fill: '#F59E0B', textColor: '#000', r: 22 },
};

export default function MindMapPreview({ nodes = DEFAULT_NODES, edges = EDGES, onExpand }) {
  const W = 420, H = 380;

  const getNode = (id) => nodes.find(n => n.id === id);

  return (
    <div className={styles.container}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className={styles.svg}>
        {/* Edges */}
        {edges.map(([from, to], i) => {
          const a = getNode(from), b = getNode(to);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x} y1={a.y}
              x2={b.x} y2={b.y}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const s = TYPE_STYLES[node.type] || TYPE_STYLES.branch;
          return (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={s.r} fill={s.fill} opacity={node.type === 'dead' ? 0.5 : 1} />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={s.textColor}
                fontSize="9"
                fontFamily="Inter"
                fontWeight="600"
              >
                {node.label.length > 10 ? node.label.slice(0, 9) + '…' : node.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className={styles.legend}>
        <span className={styles.legendItem} style={{ '--dot': '#7B6FE8' }}>Problem</span>
        <span className={styles.legendItem} style={{ '--dot': '#3B82F6' }}>Hypothesis</span>
        <span className={styles.legendItem} style={{ '--dot': '#22C55E' }}>Confirmed</span>
        <span className={styles.legendItem} style={{ '--dot': '#4A4A52' }}>Dead End</span>
        <span className={styles.legendItem} style={{ '--dot': '#F59E0B' }}>Rec.</span>
      </div>

      {onExpand && (
        <button className={styles.expandBtn} onClick={onExpand}>
          View Full Map
        </button>
      )}
    </div>
  );
}
