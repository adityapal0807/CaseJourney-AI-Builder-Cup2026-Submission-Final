import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts';
import styles from './SpiderChart.module.css';

const DIMENSION_LABELS = {
  structure: 'Structure',
  quantitative: 'Quantitative',
  creativity: 'Creativity',
  communication: 'Communication',
  speed: 'Speed',
};

export default function SpiderChart({ scores, standard, size = 300, showStandard = true }) {
  const data = Object.entries(DIMENSION_LABELS).map(([key, name]) => ({
    dimension: name,
    player: scores?.[key] || 0,
    standard: standard?.[key] || 0,
  }));

  return (
    <div className={styles.container} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <PolarGrid
            stroke="rgba(0,0,0,0.06)"
            gridType="polygon"
          />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#888880', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: '#888880', fontSize: 10 }}
            axisLine={false}
          />
          {showStandard && (
            <Radar
              name="Standard"
              dataKey="standard"
              stroke="rgba(0,0,0,0.18)"
              fill="rgba(0,0,0,0.03)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}
          <Radar
            name="Your Score"
            dataKey="player"
            stroke="#6B34D6"
            fill="rgba(107,52,214,0.12)"
            strokeWidth={2}
            dot={{ fill: '#6B34D6', r: 4 }}
          />
          <Tooltip
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: 8,
              fontSize: 12,
              color: '#111110',
              boxShadow: '0 4px 14px rgba(0,0,0,0.07)',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
