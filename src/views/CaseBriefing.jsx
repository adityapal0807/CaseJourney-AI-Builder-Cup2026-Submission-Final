import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './CaseBriefing.module.css';

export default function CaseBriefing({ caseData, onBegin, onBack }) {
  const [difficulty, setDifficulty] = useState('Associate');
  const [wildcard, setWildcard] = useState(true);

  if (!caseData) return null;

  const handleBegin = () => {
    onBegin({ difficulty, wildcard, caseData });
  };

  const handleKeyDown = (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      handleBegin();
    }
  };

  return (
    <div className={styles.page} onKeyDown={handleKeyDown} tabIndex={0}>
      <div className={styles.container}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <button className={styles.breadcrumbBtn} onClick={onBack}>Home</button>
          <span className={styles.breadcrumbSep}>→</span>
          <span className={styles.breadcrumbCurrent}>Case Setup</span>
        </div>

        {/* Partner Card */}
        <motion.div
          className={styles.partnerCard}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.partnerAvatar}>AP</div>
          <div className={styles.partnerInfo}>
            <div className={styles.partnerName}>Alex Park</div>
            <div className={styles.partnerTitle}>Senior Partner, . London</div>
          </div>
          <div className={styles.aiInterviewerBadge}>AI Interviewer</div>
        </motion.div>

        {/* Case Prompt */}
        <motion.div
          className={styles.promptCard}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className={styles.promptHeader}>
            <span className={styles.caseTag} style={{ '--tag-color': caseData.industryColor }}>
              {caseData.industry}
            </span>
            <span className={styles.caseTitle}>{caseData.title}</span>
          </div>
          <blockquote className={styles.prompt}>
            {caseData.opening}
          </blockquote>
        </motion.div>

        {/* News Brief (trending cases) */}
        {caseData.newsBrief && (
          <motion.div
            className={styles.newsCard}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.newsHeader}>
              <span>📰</span>
              <span>News Brief</span>
              {caseData.trendingLabel && (
                <span className={styles.newsBadge}>{caseData.trendingLabel}</span>
              )}
            </div>
            <p className={styles.newsText}>{caseData.newsBrief}</p>
          </motion.div>
        )}

        {/* Settings */}
        <motion.div
          className={styles.settingsRow}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className={styles.settingsGroup}>
            <div className={styles.settingsLabel}>Difficulty</div>
            <div className={styles.toggleChips}>
              {['Analyst', 'Associate', 'Manager'].map(d => (
                <button
                  key={d}
                  className={`${styles.chip} ${difficulty === d ? styles.chipActive : ''}`}
                  onClick={() => setDifficulty(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.settingsGroup}>
            <div className={styles.settingsLabel}>Wildcard Events</div>
            <button
              className={`${styles.toggle} ${wildcard ? styles.toggleOn : ''}`}
              onClick={() => setWildcard(!wildcard)}
            >
              <div className={styles.toggleThumb} />
              <span className={styles.toggleLabel}>{wildcard ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </motion.div>

        {/* Begin Button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button className={`${styles.beginBtn} glow-pulse-btn`} onClick={handleBegin}>
            <span>🎤</span>
            <span>Begin Interview</span>
          </button>
          <div className={styles.shortcutHint}>Press Space to begin</div>
        </motion.div>
      </div>
    </div>
  );
}
