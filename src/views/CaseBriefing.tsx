/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { motion } from 'framer-motion';

const S = `
  .cb-page {
    min-height: 100vh;
    background: #f7f6f3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
  }

  /* ── TOP NAV ── */
  .cb-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 52px;
    background: #ffffff;
    border-bottom: 1px solid rgba(0,0,0,0.08);
    flex-shrink: 0;
  }
  .cb-nav-left { display: flex; align-items: center; gap: 8px; }
  .cb-back-btn {
    display: flex; align-items: center; gap: 5px;
    font-size: 13px; color: #6b7280; cursor: pointer;
    background: none; border: none; padding: 0;
    font-family: inherit;
  }
  .cb-back-btn:hover { color: #111; }
  .cb-back-arrow { font-size: 14px; }
  .cb-nav-right { display: flex; align-items: center; gap: 10px; }
  .cb-elo {
    font-size: 13px; font-weight: 600; color: #111;
  }
  .cb-elo span { color: #6b7280; font-weight: 400; margin-right: 3px; }
  .cb-rank-badge {
    font-size: 11px; font-weight: 700; padding: 3px 10px;
    border-radius: 20px; background: #ede8fb; color: #6530ce;
    letter-spacing: 0.03em;
  }
  .cb-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: #6530ce; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
  }

  /* ── BODY ── */
  .cb-body {
    display: grid;
    grid-template-columns: 320px 1fr;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* ── LEFT SIDEBAR ── */
  .cb-left {
    background: #ffffff;
    border-right: 1px solid rgba(0,0,0,0.08);
    overflow-y: auto;
    padding: 20px 20px 32px;
  }
  .cb-left::-webkit-scrollbar { width: 3px; }
  .cb-left::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }

  .cb-case-tags { display: flex; align-items: center; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
  .cb-tag {
    font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 4px;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .cb-tag-retail { background: #fde8e8; color: #c42b2b; }
  .cb-tag-market { background: #ede8fb; color: #6530ce; }
  .cb-tag-trending {
    display: flex; align-items: center; gap: 4px;
    background: transparent; color: #6b7280;
    font-size: 11px; font-weight: 600; text-transform: none; letter-spacing: 0;
    padding: 0;
  }
  .cb-tag-trending::before { content: '•'; font-size: 14px; }

  .cb-case-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .cb-case-icon {
    width: 44px; height: 44px; border-radius: 10px;
    background: #1a1a2e; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 800; flex-shrink: 0;
  }
  .cb-case-name { font-size: 16px; font-weight: 700; color: #111; line-height: 1.2; }
  .cb-case-meta { font-size: 12px; color: #6b7280; margin-top: 2px; }

  .cb-case-title { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 8px; }
  .cb-case-desc { font-size: 13px; color: #374151; line-height: 1.6; margin-bottom: 16px; }

  .cb-stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 20px; }
  .cb-stat { display: flex; flex-direction: column; gap: 2px; }
  .cb-stat-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
  .cb-stat-val { font-size: 13px; font-weight: 700; color: #111; }
  .cb-stat-val.blue { color: #1d52bf; }
  .cb-stat-val.green { color: #0e8f5a; }

  .cb-divider { height: 1px; background: rgba(0,0,0,0.07); margin: 16px 0; }

  .cb-section-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 10px;
  }

  /* brief preview */
  .cb-brief-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .cb-preview-btn {
    font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 6px;
    border: 1px solid rgba(0,0,0,0.15); background: #fff; color: #374151;
    cursor: pointer; font-family: inherit;
  }
  .cb-preview-btn:hover { background: #f3f4f6; }
  .cb-brief-lines { display: flex; flex-direction: column; gap: 5px; margin-bottom: 8px; }
  .cb-brief-line { height: 9px; border-radius: 4px; background: #e5e7eb; }
  .cb-brief-unlock { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 4px; }

  /* suggested framework */
  .cb-fw-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .cb-fw-chip {
    padding: 5px 11px; border-radius: 6px; font-size: 12px; font-weight: 600;
    border: 1px solid rgba(0,0,0,0.12); background: #f3f4f6; color: #374151;
  }
  .cb-fw-chip.active { background: #ede8fb; border-color: rgba(101,48,206,.3); color: #6530ce; }

  /* prep path */
  .cb-prep-items { display: flex; flex-direction: column; gap: 7px; }
  .cb-prep-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #374151; }
  .cb-prep-dot { width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; }
  .cb-prep-dot.done { background: #0e8f5a; color: #fff; }
  .cb-prep-dot.pending { background: #e5e7eb; color: transparent; border: 1.5px solid #d1d5db; }

  /* peer performance */
  .cb-peer-list { display: flex; flex-direction: column; gap: 0; }
  .cb-peer-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: 8px;
    transition: background 0.1s;
  }
  .cb-peer-row:hover { background: #f9fafb; }
  .cb-peer-row.you { background: #f5f3ff; }
  .cb-peer-av {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700; flex-shrink: 0;
  }
  .cb-peer-info { flex: 1; }
  .cb-peer-name { font-size: 12px; font-weight: 600; color: #111; }
  .cb-peer-meta { font-size: 10px; color: #9ca3af; }
  .cb-peer-score { font-size: 14px; font-weight: 700; }
  .cb-peer-score.high { color: #0e8f5a; }
  .cb-peer-score.mid  { color: #b07600; }
  .cb-peer-score.you-score { color: #6530ce; }

  /* ── RIGHT CONTENT ── */
  .cb-right {
    overflow-y: auto;
    padding: 28px 32px 40px;
  }
  .cb-right::-webkit-scrollbar { width: 4px; }
  .cb-right::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }

  .cb-config-title { font-size: 24px; font-weight: 700; color: #111; margin-bottom: 4px; letter-spacing: -0.4px; }
  .cb-config-sub { font-size: 14px; color: #6b7280; margin-bottom: 28px; }

  .cb-config-section { margin-bottom: 26px; }
  .cb-config-section-label { font-size: 13px; font-weight: 700; color: #111; margin-bottom: 12px; }

  /* interview mode */
  .cb-mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .cb-mode-card {
    padding: 14px 16px; border-radius: 10px; border: 1.5px solid rgba(0,0,0,0.1);
    background: #fff; cursor: pointer; transition: all 0.15s;
    display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;
  }
  .cb-mode-card:hover { border-color: rgba(0,0,0,0.2); }
  .cb-mode-card.selected { border-color: #6530ce; background: #faf8ff; }
  .cb-mode-title { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 3px; }
  .cb-mode-card.selected .cb-mode-title { color: #6530ce; }
  .cb-mode-desc { font-size: 11px; color: #6b7280; line-height: 1.5; }
  .cb-mode-card.selected .cb-mode-desc { color: #8b5cf6; }
  .cb-mode-radio { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid #d1d5db; flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; justify-content: center; }
  .cb-mode-card.selected .cb-mode-radio { border-color: #6530ce; background: #6530ce; }
  .cb-mode-card.selected .cb-mode-radio::after { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #fff; }

  /* time limit */
  .cb-time-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .cb-time-card {
    padding: 14px 16px; border-radius: 10px; border: 1.5px solid rgba(0,0,0,0.1);
    background: #fff; cursor: pointer; transition: all 0.15s;
  }
  .cb-time-card:hover { border-color: rgba(0,0,0,0.2); }
  .cb-time-card.selected { border-color: #1d52bf; background: #f0f4ff; }
  .cb-time-val { font-size: 20px; font-weight: 800; color: #111; letter-spacing: -0.5px; margin-bottom: 3px; }
  .cb-time-card.selected .cb-time-val { color: #1d52bf; }
  .cb-time-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; margin-bottom: 3px; }
  .cb-time-card.selected .cb-time-tag { color: #1d52bf; }
  .cb-time-desc { font-size: 11px; color: #6b7280; }
  .cb-time-blitz { display: flex; align-items: center; gap: 4px; }

  /* difficulty */
  .cb-diff-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .cb-diff-card {
    padding: 14px 16px; border-radius: 10px; border: 1.5px solid rgba(0,0,0,0.1);
    background: #fff; cursor: pointer; transition: all 0.15s;
  }
  .cb-diff-card:hover { border-color: rgba(0,0,0,0.2); }
  .cb-diff-card.selected-as-is { border-color: #b07600; background: #fffbf0; }
  .cb-diff-card.selected-easier { border-color: #0e8f5a; background: #f0faf5; }
  .cb-diff-card.selected-harder { border-color: #c42b2b; background: #fff8f8; }
  .cb-diff-title { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 3px; }
  .cb-diff-card.selected-as-is .cb-diff-title { color: #b07600; }
  .cb-diff-card.selected-easier .cb-diff-title { color: #0e8f5a; }
  .cb-diff-card.selected-harder .cb-diff-title { color: #c42b2b; }
  .cb-diff-desc { font-size: 11px; color: #6b7280; }

  /* XP summary */
  .cb-xp-card {
    border-radius: 12px; border: 1px solid rgba(101,48,206,.2);
    background: linear-gradient(135deg, #faf8ff 0%, #f0f4ff 100%);
    padding: 16px 20px; display: flex; align-items: center;
    justify-content: space-between; margin-bottom: 16px;
  }
  .cb-xp-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 4px; }
  .cb-xp-val { font-size: 28px; font-weight: 800; color: #6530ce; letter-spacing: -0.5px; }
  .cb-xp-sub { font-size: 11px; color: #8b5cf6; margin-top: 2px; }
  .cb-elo-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 4px; text-align: right; }
  .cb-elo-val { font-size: 20px; font-weight: 800; color: #0e8f5a; text-align: right; }
  .cb-elo-sub { font-size: 11px; color: #6b7280; text-align: right; margin-top: 2px; }

  /* CTA */
  .cb-cta-row { display: flex; gap: 10px; margin-bottom: 16px; }
  .cb-start-btn {
    flex: 1; padding: 15px 20px; border-radius: 12px;
    background: #6530ce; color: #fff; border: none;
    font-size: 15px; font-weight: 700; cursor: pointer;
    font-family: inherit; transition: opacity 0.15s; letter-spacing: 0.01em;
  }
  .cb-start-btn:hover { opacity: 0.9; }
  .cb-save-btn {
    padding: 15px 20px; border-radius: 12px;
    background: #fff; color: #374151; border: 1.5px solid rgba(0,0,0,0.12);
    font-size: 14px; font-weight: 600; cursor: pointer;
    font-family: inherit; transition: background 0.15s; white-space: nowrap;
  }
  .cb-save-btn:hover { background: #f9fafb; }

  /* before you begin */
  .cb-tips { display: flex; flex-direction: column; gap: 5px; }
  .cb-tip { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6b7280; }
  .cb-tip::before { content: '→'; font-size: 11px; color: #9ca3af; flex-shrink: 0; }
  .cb-tips-hdr { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 7px; }
`;

const PEER_COLORS = [
  { bg: "#fde8e8", color: "#c42b2b" },
  { bg: "#e8eefb", color: "#1d52bf" },
  { bg: "#e4f6ed", color: "#0e8f5a" },
  { bg: "#f0eeea", color: "#3a3a36" },
];

export default function CaseBriefing({
  caseData,
  onBegin,
  onBack,
}: {
  caseData: any;
  onBegin: (c: unknown) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<'ranked' | 'practice'>('ranked');
  const [timeLimit, setTimeLimit] = useState<'25' | '15' | 'unlimited'>('25');
  const [difficulty, setDifficulty] = useState<'easier' | 'as-is' | 'harder'>('as-is');
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!caseData) return null;

  const xpBase = caseData.xpReward ?? 320;
  const xpFinal = mode === 'practice'
    ? Math.round(xpBase * 0.5)
    : difficulty === 'harder'
      ? Math.round(xpBase * 1.4)
      : xpBase;

  const eloMin = mode === 'ranked' ? 18 : 0;
  const eloMax = mode === 'ranked' ? (difficulty === 'harder' ? 44 : 34) : 0;

  const timeLabel = timeLimit === '25' ? '25 min' : timeLimit === '15' ? '15 min' : 'No limit';

  const handleBegin = () => {
    onBegin({ mode, timeLimit, difficulty, caseData });
  };

  const isEv =
    (caseData.title || caseData.name || '').toLowerCase().includes('ev') ||
    (caseData.industry || '').toLowerCase().includes('energy') ||
    (caseData.tags || []).includes('ev') ||
    (caseData.title || caseData.name || '').toLowerCase().includes('gurgaon');

  const title = caseData.title ?? caseData.name ?? (isEv ? "EV Charging Infrastructure in Gurgaon" : "Case Interview");
  const companyName = caseData.companyName ?? (isEv ? "Govt of Haryana" : (caseData.name || "ClientCo").split(' ')[0]);
  const companySub = caseData.companySub ?? (isEv ? "Chief Minister's Office · Energy & Public Infrastructure" : `${caseData.industry ?? 'Strategic'} Advisory`);
  const industry = caseData.industry ?? (isEv ? "Energy" : "Strategy");
  const caseType = caseData.caseType ?? caseData.type ?? (isEv ? "Guesstimate" : "Market Entry");
  const description = caseData.description ?? caseData.problem_statement ?? caseData.synopsis ?? caseData.opening ?? "";
  const opening = caseData.opening ?? caseData.problem_statement ?? description;
  const difficultyLabel = caseData.difficultyLabel ?? caseData.difficulty ?? "Associate";

  const peerData = caseData.peerPerformance ?? [
    { initials: "SC", name: "Sarah C.", meta: "22m · Partner", score: 94 },
    { initials: "ML", name: "Marcus L.", meta: "24m · Principal", score: 88 },
    { initials: "Ts", name: "Top scorer", meta: "19m · Partner", score: 97 },
    { initials: "Ya", name: "Your avg", meta: "26m · Associate II", score: 71, isYou: true },
  ];

  const framework = caseData.suggestedFramework ?? (
    isEv
      ? ["Demand-Side Fleet Sizing", "Supply-Side Station Capacity", "Grid & Capex Math", "CM Recommendation"]
      : ["Market Attractiveness", "Competitive Dynamics", "Entry Strategy"]
  );
  const prepPath = caseData.prepPath ?? (
    isEv
      ? [
          { label: "Guesstimate & Market Sizing spine", done: true },
          { label: "EV Fleet & Infrastructure math", done: true },
          { label: "Haryana EV policy review", done: false },
        ]
      : [
          { label: "Core framework review", done: true },
          { label: "Industry context briefing", done: true },
          { label: "Quantitative stress-test", done: false },
        ]
  );

  return (
    <>
      <style>{S}</style>
      <div className="cb-page">

        {/* NAV */}
        <div className="cb-nav">
          <div className="cb-nav-left">
            <button className="cb-back-btn" onClick={onBack}>
              <span className="cb-back-arrow">←</span> Back to Cases
            </button>
          </div>
          <div className="cb-nav-right">
            <div className="cb-elo">
              <span>ELO</span>{caseData.elo ?? 1280}
            </div>
            <div className="cb-rank-badge">ASSOCIATE II</div>
            <div className="cb-avatar">
              {(caseData.userName ?? "Y")[0].toUpperCase()}
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="cb-body">

          {/* ── LEFT SIDEBAR ── */}
          <div className="cb-left">

            {/* tags */}
            <div className="cb-case-tags">
              <div className="cb-tag" style={{ background: "rgba(56, 189, 248, 0.12)", color: "#0284c7" }}>{industry}</div>
              <div className="cb-tag cb-tag-market">{caseType}</div>
              {caseData.trending && <div className="cb-tag cb-tag-trending">Trending</div>}
            </div>

            {/* case header */}
            <div className="cb-case-header">
              <div className="cb-case-icon" style={{ background: isEv ? "#0284c7" : "#1a1a2e" }}>
                {isEv ? "⚡" : (companyName[0] || "C")}
              </div>
              <div>
                <div className="cb-case-name">{companyName}</div>
                <div className="cb-case-meta">{companySub}</div>
              </div>
            </div>

            <div className="cb-case-title">{title}</div>
            <div className="cb-case-desc">{description}</div>

            {/* stats */}
            <div className="cb-stats-row">
              <div className="cb-stat">
                <div className="cb-stat-label">Difficulty</div>
                <div className="cb-stat-val blue">{difficultyLabel}</div>
              </div>
              <div className="cb-stat">
                <div className="cb-stat-label">XP Reward</div>
                <div className="cb-stat-val green">+{xpFinal} XP</div>
              </div>
              <div className="cb-stat">
                <div className="cb-stat-label">Attempts</div>
                <div className="cb-stat-val">{caseData.attempts ?? 980}</div>
              </div>
            </div>

            <div className="cb-divider" />

            {/* brief preview */}
            <div className="cb-brief-hdr">
              <div className="cb-section-label" style={{ margin: 0 }}>Case Brief Preview</div>
              <button className="cb-preview-btn" onClick={() => setPreviewOpen(v => !v)}>
                {previewOpen ? "Hide" : "Preview"}
              </button>
            </div>
            {!previewOpen ? (
              <>
                <div className="cb-brief-lines">
                  {[80, 100, 65, 90, 50, 75].map((w, i) => (
                    <div key={i} className="cb-brief-line" style={{ width: `${w}%` }} />
                  ))}
                </div>
                <div className="cb-brief-unlock">Click Preview to unlock · Full brief reveals on interview start</div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: 8 }}>
                {opening}
              </div>
            )}

            <div className="cb-divider" />

            {/* suggested framework */}
            <div className="cb-section-label">Suggested Framework</div>
            <div className="cb-fw-chips">
              {framework.map((f: string, i: number) => (
                <div key={i} className={`cb-fw-chip ${i === 0 ? "active" : ""}`}>
                  {i + 1}. {f}
                </div>
              ))}
            </div>

            <div className="cb-divider" />

            {/* prep path */}
            <div className="cb-section-label">Your Prep Path</div>
            <div className="cb-prep-items">
              {prepPath.map((p: any, i: number) => (
                <div key={i} className="cb-prep-item">
                  <div className={`cb-prep-dot ${p.done ? "done" : "pending"}`}>
                    {p.done && "✓"}
                  </div>
                  {p.label}
                </div>
              ))}
            </div>

            <div className="cb-divider" />

            {/* peer performance */}
            <div className="cb-section-label">Peer Performance</div>
            <div className="cb-peer-list">
              {peerData.map((p: any, i: number) => {
                const c = PEER_COLORS[i % PEER_COLORS.length];
                const scoreClass = p.score >= 90 ? "high" : p.isYou ? "you-score" : "mid";
                return (
                  <div key={i} className={`cb-peer-row ${p.isYou ? "you" : ""}`}>
                    <div className="cb-peer-av" style={{ background: c.bg, color: c.color }}>
                      {p.initials}
                    </div>
                    <div className="cb-peer-info">
                      <div className="cb-peer-name">{p.name}</div>
                      <div className="cb-peer-meta">{p.meta}</div>
                    </div>
                    <div className={`cb-peer-score ${scoreClass}`}>{p.score}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT CONFIG ── */}
          <div className="cb-right">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}>
              <div className="cb-config-title">Configure Your Interview</div>
              <div className="cb-config-sub">Customise the interview to match your current prep level and goals.</div>

              {/* Interview Mode */}
              <div className="cb-config-section">
                <div className="cb-config-section-label">Interview Mode</div>
                <div className="cb-mode-grid">
                  {([
                    { id: "ranked", title: "Ranked", desc: "Affects your ELO rating · Full XP · Leaderboard eligible" },
                    { id: "practice", title: "Practice", desc: "No ELO change · Half XP · Safe to explore" },
                  ] as const).map(m => (
                    <div key={m.id} className={`cb-mode-card ${mode === m.id ? "selected" : ""}`}
                      onClick={() => setMode(m.id)}>
                      <div>
                        <div className="cb-mode-title">{m.title}</div>
                        <div className="cb-mode-desc">{m.desc}</div>
                      </div>
                      <div className="cb-mode-radio" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Limit */}
              <div className="cb-config-section">
                <div className="cb-config-section-label">Time Limit</div>
                <div className="cb-time-grid">
                  <div className={`cb-time-card ${timeLimit === "25" ? "selected" : ""}`}
                    onClick={() => setTimeLimit("25")}>
                    <div className="cb-time-val">25 min</div>
                    <div className="cb-time-tag">Standard</div>
                    <div className="cb-time-desc">. standard timing</div>
                  </div>
                  <div className={`cb-time-card ${timeLimit === "15" ? "selected" : ""}`}
                    onClick={() => setTimeLimit("15")}>
                    <div className="cb-time-val">15 min</div>
                    <div className="cb-time-tag cb-time-blitz">⚡ Blitz</div>
                    <div className="cb-time-desc">Blitz mode — speed bonus XP</div>
                  </div>
                  <div className={`cb-time-card ${timeLimit === "unlimited" ? "selected" : ""}`}
                    onClick={() => setTimeLimit("unlimited")}>
                    <div className="cb-time-val">No limit</div>
                    <div className="cb-time-tag">∞ Unlimited</div>
                    <div className="cb-time-desc">Relaxed — learn, no rush</div>
                  </div>
                </div>
              </div>

              {/* Difficulty */}
              <div className="cb-config-section">
                <div className="cb-config-section-label">Difficulty</div>
                <div className="cb-diff-grid">
                  <div className={`cb-diff-card ${difficulty === "easier" ? "selected-easier" : ""}`}
                    onClick={() => setDifficulty("easier")}>
                    <div className="cb-diff-title">Easier</div>
                    <div className="cb-diff-desc">Less pushback · More hints</div>
                  </div>
                  <div className={`cb-diff-card ${difficulty === "as-is" ? "selected-as-is" : ""}`}
                    onClick={() => setDifficulty("as-is")}>
                    <div className="cb-diff-title">As-is</div>
                    <div className="cb-diff-desc">Original difficulty · . standard</div>
                  </div>
                  <div className={`cb-diff-card ${difficulty === "harder" ? "selected-harder" : ""}`}
                    onClick={() => setDifficulty("harder")}>
                    <div className="cb-diff-title">Harder</div>
                    <div className="cb-diff-desc">+40% XP · Maximum pushback</div>
                  </div>
                </div>
              </div>

              {/* XP Summary */}
              <div className="cb-xp-card">
                <div>
                  <div className="cb-xp-label">Your XP for this session</div>
                  <div className="cb-xp-val">+{xpFinal} XP</div>
                  <div className="cb-xp-sub">
                    {mode === "ranked" ? "Ranked mode" : "Practice mode"} · {timeLabel}
                  </div>
                </div>
                <div>
                  <div className="cb-elo-label">ELO Impact</div>
                  {mode === "ranked" ? (
                    <>
                      <div className="cb-elo-val">+{eloMin} to +{eloMax}</div>
                      <div className="cb-elo-sub">based on performance</div>
                    </>
                  ) : (
                    <>
                      <div className="cb-elo-val" style={{ color: "#9ca3af" }}>No change</div>
                      <div className="cb-elo-sub">practice mode</div>
                    </>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="cb-cta-row">
                <button className="cb-start-btn" onClick={handleBegin}>
                  Start Interview · {timeLabel}
                </button>
                <button className="cb-save-btn" onClick={() => alert("Setup saved!")}>
                  Save setup
                </button>
              </div>

              {/* Before you begin */}
              <div>
                <div className="cb-tips-hdr">
                  <span>💡</span> Before you begin
                </div>
                <div className="cb-tips">
                  <div className="cb-tip">Keep a blank notepad ready — structured notes are rated</div>
                  <div className="cb-tip">Speak your reasoning aloud — the AI tracks clarity</div>
                  <div className="cb-tip">Ask for data when you need it — it's expected</div>
                  <div className="cb-tip">You can pause once for up to 2 minutes</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}