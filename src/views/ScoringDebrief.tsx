/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SpiderChart from '../components/SpiderChart.jsx';
import CaseMindMap from '../components/CaseMindMap.tsx';
import RankBadge from '../components/RankBadge.jsx';
import { SCORE_STANDARD, calcFinalScore, calcEloChange, getRank, ACHIEVEMENTS } from '../data/scoring.js';
import { getElo, setElo, saveSession, incrementStreak, unlockAchievement } from '../utils/localStorage.js';
import { buildUserPath, saveMindMapAttempt } from '../data/mindmaps.js';
import { showAchievement } from '../components/AchievementToast.jsx';

const DIMS = [
  { key: 'structure',     label: 'Structure',      insight: 'MECE framework clarity' },
  { key: 'quantitative',  label: 'Quantitative',   insight: 'Math & data interpretation' },
  { key: 'creativity',    label: 'Creativity',     insight: 'Hypothesis generation depth' },
  { key: 'communication', label: 'Communication',  insight: 'Clarity & precision' },
  { key: 'speed',         label: 'Speed',          insight: 'Time management & pace' },
];

function getScoreTag(score: number) {
  if (score >= 8.5) return { label: 'Excellent',   color: '#0F9560' };
  if (score >= 7)   return { label: 'Good',         color: '#2055C7' };
  if (score >= 5)   return { label: 'Developing',   color: '#B87A00' };
  return                   { label: 'Needs Work',   color: '#C93030' };
}

function useEloCounter(targetElo: number, oldElo: number) {
  const [displayElo, setDisplayElo] = useState(oldElo);
  useEffect(() => {
    let start: number | null = null;
    const duration = 900;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayElo(Math.round(oldElo + (targetElo - oldElo) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    const timer = setTimeout(() => requestAnimationFrame(step), 700);
    return () => clearTimeout(timer);
  }, [targetElo, oldElo]);
  return displayElo;
}

function generateCoachFeedback(scores: Record<string, number>, _turns: unknown[]) {
  const vals = Object.values(scores).filter((v): v is number => typeof v === 'number' && v > 0);
  const mean = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 5;
  const entries = Object.entries(scores) as [string, number][];
  const best = entries.reduce((a, [k, v]) => v > (a[1] ?? 0) ? [k, v] as [string, number] : a, ['structure', 0] as [string, number]);
  const worst = entries.filter(([, v]) => v > 0).reduce((a, [k, v]) => v < (a[1] ?? 10) ? [k, v] as [string, number] : a, ['communication', 10] as [string, number]);
  const dimLabels: Record<string, string> = { structure: 'structure', quantitative: 'quantitative analysis', creativity: 'creative thinking', communication: 'communication', speed: 'pacing' };
  return {
    worked: mean >= 7
      ? `Your ${dimLabels[best[0]] ?? 'overall approach'} was notably strong — structured and hypothesis-driven.`
      : `You showed initial promise in framing the problem. Good bones, even where execution fell short.`,
    improve: `${dimLabels[worst[0]] ?? 'Quantitative precision'} needs sharpening. Use specific numbers and percentage impacts.`,
    drill: mean >= 7
      ? 'Run profitability trees with synthetic data — 3-minute timer to root cause before any exhibit.'
      : 'Practice top-down framework structure. Write 2–3 buckets explicitly before diving into any branch.',
  };
}

const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-base)',
    padding: '48px 24px',
  } as React.CSSProperties,
  container: {
    maxWidth: '1080px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '28px',
  },
  sectionTitle: {
    fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase' as const, color: 'var(--text-tertiary)',
    fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: '16px',
    display: 'flex', alignItems: 'center', gap: '10px',
  } as React.CSSProperties,
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--bg-border)',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: 'var(--shadow-card)',
  } as React.CSSProperties,
};

export default function ScoringDebrief({ result, caseData, onPlayAgain }: { result: any; caseData: any; onPlayAgain: () => void }) {
  const [expandedTurns, setExpandedTurns] = useState<Record<number, boolean>>({});

  const scores: Record<string, number> = result?.cumulativeScores ?? {};
  const finalScore = calcFinalScore(scores);
  const oldElo = getElo();
  const eloChange = calcEloChange(finalScore);
  const newElo = oldElo + eloChange;
  const oldRank = getRank(oldElo);
  const newRank = getRank(newElo);
  const rankUp = oldRank.label !== newRank.label;
  const displayElo = useEloCounter(newElo, oldElo);

  const turns: any[] = result?.turns ?? [];
  const caseId = caseData?.id ?? '';
  const userVisitedNodes = buildUserPath(caseId, turns) as string[];

  useEffect(() => {
    setElo(newElo);
    incrementStreak();
    saveSession({ scores, finalScore, completed: true, caseId });
    saveMindMapAttempt(caseId, userVisitedNodes, finalScore);
    for (const ach of ACHIEVEMENTS as any[]) {
      if (ach.condition(scores)) {
        const isNew = unlockAchievement(ach.id);
        if (isNew) showAchievement(ach);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coachFeedback = generateCoachFeedback(scores, turns);

  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* ── Result header ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-border)',
            borderRadius: '12px', padding: '36px 40px',
            boxShadow: 'var(--shadow-card)',
            flexWrap: 'wrap', gap: '24px',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Top accent bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: 'linear-gradient(90deg, #6B34D6, #2055C7, #0F9560)',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="mono" style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Case Complete</div>
            <div className="mono" style={{ fontSize: '52px', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {finalScore.toFixed(1)}<span style={{ fontSize: '20px', color: 'var(--text-tertiary)', fontWeight: 400 }}> / 10</span>
            </div>
            {rankUp ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700 }}>
                <span style={{ color: oldRank.color }}>{oldRank.label}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                <span style={{ color: newRank.color }}>{newRank.label}</span>
              </div>
            ) : (
              <RankBadge elo={newElo} size="md" />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className="mono" style={{ fontSize: '36px', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {displayElo.toLocaleString()}
              </span>
              <span className="mono" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>ELO</span>
            </div>
            <div className="mono" style={{
              fontSize: '14px', fontWeight: 500,
              color: eloChange >= 0 ? '#0F9560' : '#C93030',
              background: eloChange >= 0 ? '#E6F7F1' : '#FBEAEA',
              padding: '3px 10px', borderRadius: '5px',
            }}>
              {eloChange >= 0 ? '+' : ''}{eloChange} ELO
            </div>
            <div className="mono" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {turns.length} turns · {Math.floor((result?.elapsed ?? 0) / 60)}m {(result?.elapsed ?? 0) % 60}s
            </div>
          </div>
        </motion.div>

        {/* ── Mind Map ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={S.card}
        >
          <CaseMindMap
            caseId={caseId}
            userVisitedNodes={userVisitedNodes}
            currentScore={finalScore}
            revealed={true}
          />
        </motion.div>

        {/* ── Performance breakdown ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div style={S.sectionTitle}>
            <span style={{ width: '3px', height: '14px', background: '#6B34D6', borderRadius: '2px', display: 'inline-block' }} />
            Performance Breakdown
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <SpiderChart scores={scores} standard={SCORE_STANDARD} size={300} showStandard={true} />
              <div style={{ display: 'flex', gap: '16px' }}>
                {[{ c: '#6B34D6', l: 'You' }, { c: 'rgba(0,0,0,0.18)', l: 'Standard' }].map(({ c, l }) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '10px', height: '2px', background: c, borderRadius: '1px', display: 'inline-block' }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
              {DIMS.map(({ key, label, insight }) => {
                const s = scores[key] ?? 0;
                const tag = getScoreTag(s);
                return (
                  <div key={key} style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
                    borderRadius: '12px', padding: '16px',
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    boxShadow: 'var(--shadow-card)',
                  }}>
                    <div className="mono" style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{label}</div>
                    <div className="mono" style={{ fontSize: '28px', fontWeight: 500, lineHeight: 1, color: tag.color }}>
                      {s > 0 ? s.toFixed(1) : '—'}
                    </div>
                    <span className="mono" style={{
                      fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', padding: '2px 7px',
                      borderRadius: '5px', alignSelf: 'flex-start',
                      color: tag.color,
                      background: `${tag.color}12`,
                    }}>{tag.label}</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{insight}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ── Detail: turns + coach ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div style={S.sectionTitle}>
            <span style={{ width: '3px', height: '14px', background: '#6B34D6', borderRadius: '2px', display: 'inline-block' }} />
            Detailed Feedback
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Turn-by-turn */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="mono" style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', paddingBottom: '8px', borderBottom: '1px solid var(--bg-border)' }}>
                Turn-by-Turn
              </div>
              {turns.length === 0 && (
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', padding: '20px', textAlign: 'center' }}>No turns recorded</div>
              )}
              {turns.map((turn, i) => {
                const avg = turn.scores ? (Object.values(turn.scores) as number[]).filter(v => v != null && v > 0) : [];
                const avgScore = avg.length > 0 ? avg.reduce((a, b) => a + b, 0) / avg.length : null;
                const tag = avgScore ? getScoreTag(avgScore) : null;
                return (
                  <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', transition: 'background 150ms' }}
                      onClick={() => setExpandedTurns(prev => ({ ...prev, [i]: !prev[i] }))}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Turn {i + 1}</span>
                        <span className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{turn.phase ?? 'structure'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {tag && <span className="mono" style={{ fontSize: '13px', fontWeight: 500, color: tag.color }}>{avgScore?.toFixed(1)}</span>}
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{expandedTurns[i] ? '↑' : '↓'}</span>
                      </div>
                    </div>
                    {expandedTurns[i] && (
                      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {turn.question && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className="mono" style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)' }}>Alex asked:</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{turn.question}</span>
                          </div>
                        )}
                        {turn.response && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span className="mono" style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)' }}>Your response:</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{turn.response}</span>
                          </div>
                        )}
                        {turn.alexResponse?.score_rationale && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--accent-purple-light)', borderLeft: '3px solid #6B34D6', padding: '8px 10px', borderRadius: '0 6px 6px 0', lineHeight: 1.5 }}>
                            {turn.alexResponse.score_rationale}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Alex's verdict */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="mono" style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', paddingBottom: '8px', borderBottom: '1px solid var(--bg-border)' }}>
                {"Alex's Verdict"}
              </div>
              <div style={S.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: '#6B34D6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>AP</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Alex Park</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Senior Partner, .</div>
                  </div>
                </div>

                {[
                  { color: '#0F9560', bg: '#E6F7F1', label: 'What worked',       text: coachFeedback.worked  },
                  { color: '#B87A00', bg: '#FEF3DC', label: 'What to improve',   text: coachFeedback.improve },
                  { color: '#6B34D6', bg: '#F0EBFD', label: 'Your next drill',   text: coachFeedback.drill   },
                ].map(({ color, bg, label, text }) => (
                  <div key={label} style={{
                    background: bg, 
                    borderRadius: '8px', padding: '14px', marginBottom: '10px',
                  }}>
                    <div className="mono" style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color, marginBottom: '6px' }}>{label}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{text}</div>
                  </div>
                ))}

                {caseData?.modelAnswerHint && (
                  <details style={{ border: '1px solid var(--bg-border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <summary style={{
                      padding: '10px 14px', fontSize: '12px', fontWeight: 600,
                      color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none',
                    }}>
                      Model Answer (. Standard)
                    </summary>
                    <div style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7, borderTop: '1px solid var(--bg-border)' }}>
                      {caseData.modelAnswerHint}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Bottom bar ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '20px', borderTop: '1px solid var(--bg-border)' }}
        >
          <button
            onClick={onPlayAgain}
            style={{
              background: '#6B34D6',
              border: 'none', borderRadius: '8px', color: '#fff',
              fontSize: '14px', fontWeight: 600, padding: '14px 32px', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(107,52,214,0.2)',
              transition: '150ms ease',
            }}
          >
            Play Again
          </button>
          <button
            onClick={onPlayAgain}
            style={{
              background: 'none', border: '1px solid var(--bg-border-bright)', borderRadius: '8px',
              color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600,
              padding: '14px 24px', cursor: 'pointer', transition: '150ms ease',
            }}
          >
            Try a Trending Case
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '8px', padding: '12px 20px', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>CaseJourney Session</div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 500, color: '#6B34D6' }}>{finalScore.toFixed(1)}/10</div>
            <div className="mono" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>{newRank.label}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
