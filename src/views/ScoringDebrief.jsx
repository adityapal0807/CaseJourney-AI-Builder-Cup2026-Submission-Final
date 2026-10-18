import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpiderChart from '../components/SpiderChart.jsx';
import MindMapPreview from '../components/MindMapPreview.jsx';
import RankBadge from '../components/RankBadge.jsx';
import { SCORE_STANDARD, calcFinalScore, calcEloChange, getRank, ACHIEVEMENTS } from '../data/scoring.js';
import { getElo, setElo, saveSession, incrementStreak, unlockAchievement, getAchievements } from '../utils/localStorage.js';
import { showAchievement } from '../components/AchievementToast.jsx';
import styles from './ScoringDebrief.module.css';

const DIMS = [
  { key: 'structure',     label: 'Structure' },
  { key: 'quantitative',  label: 'Quantitative' },
  { key: 'creativity',    label: 'Creativity' },
  { key: 'communication', label: 'Communication' },
  { key: 'speed',         label: 'Speed' },
];

function getScoreTag(score) {
  if (score >= 8.5) return { label: 'Excellent', color: '#22C55E' };
  if (score >= 7)   return { label: 'Good',      color: '#7B6FE8' };
  if (score >= 5)   return { label: 'Developing',color: '#F59E0B' };
  return                   { label: 'Needs Work', color: '#EF4444' };
}

function useEloCounter(targetElo, oldElo) {
  const [displayElo, setDisplayElo] = useState(oldElo);
  useEffect(() => {
    let start = null;
    const duration = 800;
    const from = oldElo;
    const to = targetElo;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayElo(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    const timer = setTimeout(() => requestAnimationFrame(step), 600);
    return () => clearTimeout(timer);
  }, [targetElo, oldElo]);
  return displayElo;
}

export default function ScoringDebrief({ result, caseData, onPlayAgain }) {
  const [expandedTurns, setExpandedTurns] = useState({});
  const [activeAchievements, setActiveAchievements] = useState([]);

  const scores = result?.cumulativeScores || {};
  const finalScore = calcFinalScore(scores);
  const oldElo = getElo();
  const eloChange = calcEloChange(finalScore);
  const newElo = oldElo + eloChange;
  const oldRank = getRank(oldElo);
  const newRank = getRank(newElo);
  const rankUp = oldRank.label !== newRank.label;

  const displayElo = useEloCounter(newElo, oldElo);

  // Save session and update ELO on mount
  useEffect(() => {
    setElo(newElo);
    incrementStreak();
    saveSession({ scores, finalScore, completed: true, caseId: caseData?.id });

    // Check achievements
    const unlocked = [];
    for (const ach of ACHIEVEMENTS) {
      if (ach.condition(scores)) {
        const isNew = unlockAchievement(ach.id);
        if (isNew) {
          showAchievement(ach);
          unlocked.push(ach);
        }
      }
    }
    setActiveAchievements(unlocked);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const turns = result?.turns || [];
  const scoredTurns = turns.filter(t => t.scores);

  const coachFeedback = generateCoachFeedback(scores, turns);

  const toggleTurn = (i) => {
    setExpandedTurns(prev => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Section 1: Result Header */}
        <motion.div
          className={styles.resultCard}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className={styles.resultLeft}>
            <div className={styles.caseComplete}>Case Complete</div>
            <div className={`${styles.finalScore} mono`}>{finalScore.toFixed(1)} / 10</div>
            {rankUp && (
              <div className={styles.rankUp}>
                <span style={{ color: oldRank.color }}>{oldRank.label}</span>
                <span className={styles.rankArrow}>→</span>
                <span style={{ color: newRank.color }}>{newRank.label}</span>
              </div>
            )}
            {!rankUp && <RankBadge elo={newElo} size="md" />}
          </div>

          <div className={styles.resultRight}>
            <div className={styles.eloBlock}>
              <div className={`${styles.eloDisplay} mono`}>{displayElo.toLocaleString()}</div>
              <div className={styles.eloLabel}>ELO</div>
            </div>
            <div className={styles.eloChange} style={{ color: eloChange >= 0 ? '#22C55E' : '#EF4444' }}>
              {eloChange >= 0 ? '↑' : '↓'} {Math.abs(eloChange)} ELO
            </div>
          </div>
        </motion.div>

        {/* Section 2: Spider Chart */}
        <motion.div
          className={styles.spiderSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className={styles.sectionTitle}>Performance Breakdown</h2>
          <div className={styles.spiderRow}>
            <div className={styles.spiderWrap}>
              <SpiderChart scores={scores} standard={SCORE_STANDARD} size={360} showStandard={true} />
              <div className={styles.spiderLegend}>
                <span className={styles.legendItem} style={{ '--c': '#7B6FE8' }}>Your Score</span>
                <span className={styles.legendItem} style={{ '--c': 'rgba(255,255,255,0.4)' }}>. Standard</span>
              </div>
            </div>

            <div className={styles.dimCards}>
              {DIMS.map(({ key, label }) => {
                const s = scores[key] || 0;
                const tag = getScoreTag(s);
                const dim = SCORE_INSIGHTS[key];
                return (
                  <div key={key} className={styles.dimCard}>
                    <div className={styles.dimLabel}>{label}</div>
                    <div className={`${styles.dimScore} mono`} style={{ color: tag.color }}>{s > 0 ? s.toFixed(1) : '—'}</div>
                    <span className={styles.dimTag} style={{ '--tag-color': tag.color }}>{tag.label}</span>
                    <div className={styles.dimInsight}>{dim?.insight || ''}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Section 3: Detailed Feedback */}
        <motion.div
          className={styles.detailSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className={styles.sectionTitle}>Detailed Feedback</h2>
          <div className={styles.detailGrid}>
            {/* Column 1: Turn by Turn */}
            <div className={styles.detailCol}>
              <div className={styles.colHeader}>Turn-by-Turn</div>
              <div className={styles.turnTimeline}>
                {turns.map((turn, i) => {
                  const avg = turn.scores
                    ? Object.values(turn.scores).filter(v => v != null && v > 0)
                    : [];
                  const avgScore = avg.length > 0 ? avg.reduce((a,b) => a+b,0) / avg.length : null;
                  const tag = avgScore ? getScoreTag(avgScore) : null;

                  return (
                    <div key={i} className={styles.turnItem}>
                      <div className={styles.turnHeader} onClick={() => toggleTurn(i)}>
                        <div className={styles.turnMeta}>
                          <span className={styles.turnNum}>Turn {i + 1}</span>
                          <span className={styles.turnPhase}>{turn.phase || 'structure'}</span>
                        </div>
                        <div className={styles.turnRight}>
                          {tag && (
                            <span className={styles.turnScore} style={{ '--c': tag.color }}>
                              {avgScore?.toFixed(1)}
                            </span>
                          )}
                          <span className={styles.turnChevron}>{expandedTurns[i] ? '↑' : '↓'}</span>
                        </div>
                      </div>

                      {expandedTurns[i] && (
                        <motion.div
                          className={styles.turnDetail}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {turn.question && (
                            <div className={styles.turnQuestion}>
                              <span className={styles.turnDetailLabel}>Alex asked:</span>
                              <span>{turn.question}</span>
                            </div>
                          )}
                          {turn.response && (
                            <div className={styles.turnResponse}>
                              <span className={styles.turnDetailLabel}>Your response:</span>
                              <span>{turn.response}</span>
                            </div>
                          )}
                          {turn.alexResponse?.score_rationale && (
                            <div className={styles.turnRationale}>
                              💬 {turn.alexResponse.score_rationale}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
                {turns.length === 0 && (
                  <div className={styles.emptyTurns}>No turns recorded</div>
                )}
              </div>
            </div>

            {/* Column 2: Mind Map */}
            <div className={styles.detailCol}>
              <div className={styles.colHeader}>Thinking Architecture</div>
              <MindMapPreview />
            </div>

            {/* Column 3: Coach Feedback */}
            <div className={styles.detailCol}>
              <div className={styles.colHeader}>Alex's Verdict</div>
              <div className={styles.coachCard}>
                <div className={styles.coachHeader}>
                  <div className={styles.coachAvatar}>AP</div>
                  <div>
                    <div className={styles.coachName}>Alex Park</div>
                    <div className={styles.coachTitle}>Senior Partner, .</div>
                  </div>
                </div>

                <div className={styles.feedbackBlock} style={{ '--fb-color': '#22C55E' }}>
                  <div className={styles.feedbackLabel}>What worked</div>
                  <div className={styles.feedbackText}>{coachFeedback.worked}</div>
                </div>

                <div className={styles.feedbackBlock} style={{ '--fb-color': '#F59E0B' }}>
                  <div className={styles.feedbackLabel}>What to improve</div>
                  <div className={styles.feedbackText}>{coachFeedback.improve}</div>
                </div>

                <div className={styles.feedbackBlock} style={{ '--fb-color': '#7B6FE8' }}>
                  <div className={styles.feedbackLabel}>Your next drill</div>
                  <div className={styles.feedbackText}>{coachFeedback.drill}</div>
                </div>

                {caseData?.modelAnswerHint && (
                  <details className={styles.modelAnswer}>
                    <summary className={styles.modelAnswerTitle}>Model Answer</summary>
                    <div className={styles.modelAnswerText}>{caseData.modelAnswerHint}</div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 4: Bottom Bar */}
        <motion.div
          className={styles.bottomBar}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button className={styles.playAgainBtn} onClick={onPlayAgain}>
            Play Again
          </button>
          <button className={styles.trendingBtn} onClick={onPlayAgain}>
            Try a Trending Case
          </button>
          <div className={styles.shareCard}>
            <div className={styles.shareTitle}>CaseJourney Session</div>
            <div className={`${styles.shareScore} mono`}>{finalScore.toFixed(1)}/10</div>
            <div className={styles.shareRank}>{newRank.label}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const SCORE_INSIGHTS = {
  structure:     { insight: 'Framework clarity and MECE thinking' },
  quantitative:  { insight: 'Math accuracy and data interpretation' },
  creativity:    { insight: 'Hypothesis generation and insight depth' },
  communication: { insight: 'Clarity, precision, and confidence' },
  speed:         { insight: 'Time management and pace' },
};

function generateCoachFeedback(scores, turns) {
  const avg = Object.values(scores).filter(v => v > 0);
  const mean = avg.length > 0 ? avg.reduce((a, b) => a + b, 0) / avg.length : 5;

  const best = Object.entries(scores).reduce((a, [k, v]) => v > (a[1] || 0) ? [k, v] : a, ['structure', 0]);
  const worst = Object.entries(scores).filter(([,v]) => v > 0).reduce((a, [k, v]) => v < (a[1] || 10) ? [k, v] : a, ['communication', 10]);

  const dimLabels = { structure: 'structure', quantitative: 'quantitative analysis', creativity: 'creative thinking', communication: 'communication', speed: 'pacing' };

  return {
    worked: mean >= 7
      ? `Your ${dimLabels[best[0]] || 'overall approach'} was notably strong — the thinking was structured and hypothesis-driven.`
      : `You showed initial promise in framing the problem. The approach had good bones even where execution fell short.`,
    improve: `${dimLabels[worst[0]] || 'Quantitative precision'} needs attention. Focus on using specific numbers and percentage impacts when making claims — vague directional statements won't fly in a final round.`,
    drill: mean >= 7
      ? 'Practice profitability trees with synthetic data — set a 3-minute timer to identify root cause before looking at any exhibit.'
      : 'Work on structuring frameworks top-down. Before answering, write out your 2–3 buckets and explicitly state what you\'re ruling in and out.',
  };
}
