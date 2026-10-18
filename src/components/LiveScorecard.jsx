import { motion, AnimatePresence } from 'framer-motion';
import styles from './LiveScorecard.module.css';

const DIMS = [
  { key: 'structure',     label: 'Structure' },
  { key: 'quantitative',  label: 'Quantitative' },
  { key: 'creativity',    label: 'Creativity' },
  { key: 'communication', label: 'Communication' },
  { key: 'speed',         label: 'Speed' },
];

function getBarColor(score) {
  if (score >= 7) return '#7B6FE8';
  if (score >= 5) return '#F59E0B';
  return '#EF4444';
}

export default function LiveScorecard({ scores, recentTurns }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>Live Performance</div>
      <div className={styles.bars}>
        {DIMS.map(({ key, label }) => {
          const score = scores?.[key] || 0;
          const pct = (score / 10) * 100;
          const color = getBarColor(score);
          return (
            <div key={key} className={styles.barRow}>
              <div className={styles.barLabel}>{label}</div>
              <div className={styles.barTrack}>
                <motion.div
                  className={styles.barFill}
                  style={{ '--bar-color': color }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <div className={styles.barScore} style={{ color: score > 0 ? color : 'var(--text-tertiary)' }}>
                {score > 0 ? score.toFixed(1) : '—'}
              </div>
            </div>
          );
        })}
      </div>

      {recentTurns && recentTurns.length > 0 && (
        <div className={styles.recentTurns}>
          <div className={styles.recentHeader}>Recent Turns</div>
          {recentTurns.slice(-3).map((turn, i) => {
            const avgScore = turn.scores
              ? Object.values(turn.scores).filter(v => v != null && v > 0)
              : [];
            const avg = avgScore.length > 0
              ? Math.round(avgScore.reduce((a, b) => a + b, 0) / avgScore.length * 10) / 10
              : null;
            const color = avg ? getBarColor(avg) : 'var(--text-tertiary)';
            return (
              <div key={i} className={styles.turnCard}>
                <div className={styles.turnInfo}>
                  <span className={styles.turnNum}>Turn {turn.turnNum || i + 1}</span>
                  <span className={styles.turnPhase}>{turn.phase || 'structure'}</span>
                </div>
                {avg && (
                  <span className={styles.turnScore} style={{ background: `${color}22`, color, borderColor: `${color}44` }}>
                    {avg}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
