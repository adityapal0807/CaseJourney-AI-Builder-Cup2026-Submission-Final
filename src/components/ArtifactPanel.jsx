import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend
} from 'recharts';
import styles from './ArtifactPanel.module.css';

function BarChartArtifact({ data }) {
  const chartData = data.bars.map(b => ({
    label: b.label,
    value: Math.abs(b.value),
    fill: b.color === 'purple' ? '#7B6FE8' : b.color === 'green' ? '#22C55E' : '#EF4444',
    original: b.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" tick={{ fill: '#8B8A8E', fontSize: 11 }} />
        <YAxis tick={{ fill: '#8B8A8E', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#1C1C21', border: '1px solid #2A2A32', borderRadius: 8, fontSize: 12, color: '#F1F0ED' }}
          formatter={(value, name, props) => [`${props.payload.original > 0 ? '+' : ''}${props.payload.original}%`, 'Impact']}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <rect key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DataTableArtifact({ data }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {data.headers.map((h, i) => <th key={i}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className={row.highlight ? styles.highlightRow : ''}>
              {row.cells.map((cell, j) => <td key={j}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrendLineArtifact({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data.points} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="year" tick={{ fill: '#8B8A8E', fontSize: 11 }} />
        <YAxis tick={{ fill: '#8B8A8E', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#1C1C21', border: '1px solid #2A2A32', borderRadius: 8, fontSize: 12, color: '#F1F0ED' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#8B8A8E' }} />
        {data.lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            strokeDasharray={line.dashed ? '4 3' : '0'}
            dot={{ r: 4, fill: line.color }}
          />
        ))}
        {data.todayMarker && (
          <ReferenceLine x={data.todayMarker} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Today', fill: '#F59E0B', fontSize: 10 }} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

function InsightCardArtifact({ data }) {
  return (
    <div className={styles.insightCard}>
      <div className={styles.insightIcon}>💡</div>
      <div>
        <div className={styles.insightText}>{data.insight}</div>
        {data.implication && <div className={styles.insightSub}>{data.implication}</div>}
      </div>
    </div>
  );
}

function MarketFunnelArtifact({ data }) {
  const max = data.layers[0].count;
  return (
    <div className={styles.funnel}>
      {data.layers.map((layer, i) => {
        const widthPct = 100 - (i * 15);
        const opacity = 1 - i * 0.18;
        return (
          <div
            key={i}
            className={styles.funnelLayer}
            style={{ width: `${widthPct}%`, opacity, background: `rgba(123,111,232,${opacity})` }}
          >
            <span className={styles.funnelLabel}>{layer.label}</span>
            <span className={styles.funnelValue}>{layer.value}</span>
          </div>
        );
      })}
    </div>
  );
}

const RENDERERS = {
  bar_chart:    BarChartArtifact,
  data_table:   DataTableArtifact,
  trend_line:   TrendLineArtifact,
  insight_card: InsightCardArtifact,
  market_funnel: MarketFunnelArtifact,
};

export default function ArtifactPanel({ artifacts, currentArtifact }) {
  const artifact = currentArtifact || (artifacts && artifacts[artifacts.length - 1]);
  if (!artifact) return null;

  const Renderer = RENDERERS[artifact.type];
  if (!Renderer) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={artifact.title}
        className={styles.panel}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className={styles.header}>
          <span className={styles.title}>{artifact.title}</span>
          <span className={styles.type}>{artifact.type.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div className={styles.body}>
          <Renderer data={artifact.data} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
