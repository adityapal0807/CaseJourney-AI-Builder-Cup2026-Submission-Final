import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import SpiderChart from '../components/SpiderChart.jsx';
import RankBadge from '../components/RankBadge.jsx';
import { CASES, TRENDING_NEWS } from '../data/cases.js';
import { SCORE_STANDARD } from '../data/scoring.js';
import { getElo, getStats, getLastFiveAverageScores, getAchievements } from '../utils/localStorage.js';
import styles from './HomeScreen.module.css';

const DEMO_ACHIEVEMENTS = ['MECE Machine', 'Wildcard Tamer', 'Speed Demon'];
const ACHIEVEMENT_COLORS = ['#7B6FE8', '#F59E0B', '#EF4444', '#22C55E', '#3B82F6'];

export default function HomeScreen({ onSelectCase }) {
  const elo = getElo();
  const stats = getStats();
  const avgScores = getLastFiveAverageScores();
  const achievements = getAchievements();
  const tickerRef = useRef(null);

  // Double the news items for seamless loop
  const tickerItems = [...TRENDING_NEWS, ...TRENDING_NEWS];

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* LEFT: Player Stats */}
        <motion.div
          className={styles.leftPanel}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className={styles.card}>
            {/* Rank Badge */}
            <div className={styles.rankTop}>
              <RankBadge elo={elo} size="xl" />
            </div>

            {/* ELO */}
            <div className={styles.eloRow}>
              <span className={`${styles.eloNum} mono`}>{elo.toLocaleString()} ELO</span>
              <span className={styles.eloDelta}>+18</span>
            </div>

            {/* Spider Chart */}
            <div className={styles.chartWrap}>
              <SpiderChart scores={avgScores} standard={SCORE_STANDARD} size={220} showStandard={true} />
            </div>
            <div className={styles.chartLabel}>Last 5 sessions avg</div>

            {/* Stats Row */}
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{stats.winRate}%</div>
                <div className={styles.statLabel}>Win Rate</div>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <div className={styles.statValue}>{stats.casesPlayed}</div>
                <div className={styles.statLabel}>Cases</div>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <div className={styles.statValue}>
                  {stats.streak}
                  {stats.streak >= 3 && <span className={styles.fire}> 🔥</span>}
                </div>
                <div className={styles.statLabel}>Streak</div>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <div className={styles.statValue}>#{stats.globalRank}</div>
                <div className={styles.statLabel}>Global</div>
              </div>
            </div>

            {/* Badges */}
            <div className={styles.badgesRow}>
              {DEMO_ACHIEVEMENTS.map((badge, i) => (
                <span
                  key={badge}
                  className={styles.badge}
                  style={{ '--badge-color': ACHIEVEMENT_COLORS[i % ACHIEVEMENT_COLORS.length] }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* RIGHT: Case Selection */}
        <motion.div
          className={styles.rightPanel}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Choose Your Case</h2>
            <div className={styles.titleUnderline} />
          </div>

          <div className={styles.caseGrid}>
            {CASES.map((c, i) => (
              <motion.div
                key={c.id}
                className={styles.caseCard}
                onClick={() => onSelectCase(c)}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.15 }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.2 + i * 0.08 } }}
              >
                {c.trending && (
                  <div className={styles.trendingBadge}>
                    <span className={styles.trendingDot} />
                    TRENDING
                  </div>
                )}

                <div className={styles.cardTop}>
                  <span className={styles.industryTag} style={{ '--tag-color': c.industryColor }}>
                    {c.industry}
                  </span>
                  <span className={styles.diffBadge} style={{ color: c.difficultyColor, borderColor: `${c.difficultyColor}44`, background: `${c.difficultyColor}11` }}>
                    {c.difficulty}
                  </span>
                </div>

                <h3 className={styles.caseTitle}>{c.title}</h3>
                <p className={styles.caseSynopsis}>{c.synopsis}</p>

                <div className={styles.cardFooter}>
                  <span className={styles.metaChip}>{c.duration}</span>
                  <span className={styles.metaChip}>{c.type}</span>
                  <span className={styles.metaChip}>{c.mode}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trending Ticker */}
          <div className={styles.tickerWrap}>
            <span className={styles.tickerLabel}>Trending</span>
            <div className={styles.tickerTrack}>
              <div className={styles.tickerInner} ref={tickerRef}>
                {tickerItems.map((item, i) => (
                  <span key={i} className={styles.tickerItem}>
                    <span>{item.icon}</span>
                    <span>{item.topic}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Blitz */}
          <motion.button
            className={styles.blitzBtn}
            onClick={() => onSelectCase(CASES[0])}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>⚡</span>
            <span>Market Sizing Blitz — 10 min</span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
