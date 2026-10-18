import { getRank } from '../data/scoring.js';
import styles from './RankBadge.module.css';

export default function RankBadge({ elo, size = 'md' }) {
  const rank = getRank(elo);
  const sizeClass = styles[size] || styles.md;

  return (
    <span
      className={`${styles.badge} ${sizeClass}`}
      style={{ '--badge-color': rank.color }}
    >
      {rank.label}
    </span>
  );
}
