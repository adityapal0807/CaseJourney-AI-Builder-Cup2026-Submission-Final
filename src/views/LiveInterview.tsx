/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../hooks/useGameState.js';
import { useClaude } from '../hooks/useClaude.js';

import WildcardOverlay from '../components/WildcardOverlay.jsx';
import ArtifactPanel from '../components/ArtifactPanel.jsx';
import VoiceAgent, { type AgentState } from '../components/interview/VoiceAgent.tsx';
import './LiveInterview.css';

// ─── Types ──────────────────────────────────────────────────────
type ContextCard = { label: string; value: string; state: 'confirmed' | 'hypothesis' };
type FocusData = { question: string; tips: string[] };
type PillarState = 'locked' | 'active' | 'done' | 'pending';
type MessageItem = { role: 'iv' | 'cd' | 'sys'; name: string; time: string; text: string; exhibit?: string };
type BadgeData = { label: string; name: string } | null;

type GameState = {
  phase: string; setPhase: (p: string) => void;
  turns: any[]; addTurn: (t: unknown) => void;
  cumulativeScores: Record<string, number>; updateScores: (s: Record<string, number>) => void;
  artifacts: unknown[]; addArtifact: (a: unknown) => void;
  wildcardFired: boolean; wildcardData: unknown; fireWildcard: (d: unknown) => void; dismissWildcard: () => void;
  isListening: boolean; setIsListening: (v: boolean) => void;
  isStreaming: boolean; setIsStreaming: (v: boolean) => void;
  currentTranscript: string; setCurrentTranscript: (v: string) => void;
  alexTyping: boolean; setAlexTyping: (v: boolean) => void;
  elapsedSeconds: number; setElapsedSeconds: (v: number) => void;
  reset: () => void;
};

// ─── Constants ──────────────────────────────────────────────────
const STAGES = ['Problem Framing', 'Framework', 'Analysis', 'Synthesis', 'Recommendation'];

/** Convert config.timeLimit string → seconds */
function getMaxDuration(timeLimit?: string): number {
  if (timeLimit === '15') return 15 * 60;   // 900s
  if (timeLimit === '25') return 25 * 60;   // 1500s
  if (timeLimit === 'unlimited') return 99 * 60; // effectively no limit
  return 25 * 60; // default 25 min
}

const SCORE_DIMS = [
  { key: 'structure', label: 'Structure', color: '#0e8f5a' },
  { key: 'communication', label: 'Clarity', color: '#1d52bf' },
  { key: 'quantitative', label: 'Quant', color: '#b07600' },
  { key: 'creativity', label: 'Creativity', color: '#6530ce' },
  { key: 'speed', label: 'Speed', color: '#3a3a36' },
];

function scoreColor(n: number) {
  if (n >= 7) return '#0e8f5a';
  if (n >= 5) return '#b07600';
  return '#c42b2b';
}

function formatTimer(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTime(ms: number) {
  if (!ms && ms !== 0) return '';
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────────────────
export default function LiveInterview({ caseData, config, onComplete }: { caseData: any; config: any; onComplete: (r: unknown) => void }) {
  const gs = useGameState() as GameState;
  const { callClaude } = useClaude() as { callClaude: (opts: unknown) => void };

  // Session state
  const [conversationHistory, setConversationHistory] = useState<unknown[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [endRequested, setEndRequested] = useState(false);
  const [appMode, setAppMode] = useState<'live' | 'review'>('live');
  const [rightTab, setRightTab] = useState<'artifacts' | 'facts' | 'score'>('artifacts');
  const [viewMode, setViewMode] = useState<'split' | 'studio'>('split');
  const [agentState, setAgentState] = useState<AgentState>('idle');

  // Canvas state — progressive reveal
  const [currentStage, setCurrentStage] = useState(0);
  const [showFramework, setShowFramework] = useState(false);
  const [frameworkPillars, setFrameworkPillars] = useState<Array<{ name: string; desc: string }>>([]);
  const [pillarStates, setPillarStates] = useState<PillarState[]>([]);
  const [activePillarSubs, setActivePillarSubs] = useState<string[]>([]);
  const [contextCards, setContextCards] = useState<ContextCard[]>([]);
  const [focusData, setFocusData] = useState<FocusData | null>(null);
  const [badge, setBadge] = useState<BadgeData>(null);
  const [exhibitCards, setExhibitCards] = useState<Array<{ id: string; title: string; unlocked: boolean }>>([
    { id: 'A', title: 'Exhibit A', unlocked: false },
    { id: 'B', title: 'Exhibit B', unlocked: false },
  ]);

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());
  const txRef = useRef<HTMLDivElement>(null);
  // Always-fresh ref for gs — prevents stale closure in timer/completeInterview
  const gsRef = useRef(gs);
  useEffect(() => { gsRef.current = gs; });
  // Also a ref for completeInterview to avoid stale closure in timer
  const completeInterviewRef = useRef<() => void>(() => {});

  // Compute max duration from the session config (respects 15 / 25 / unlimited selection)
  const maxDuration = getMaxDuration(config?.timeLimit);

  // Timer — reads from ref so it always sees the latest turns/scores
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      gsRef.current.setElapsedSeconds(elapsed);
      if (elapsed >= maxDuration) completeInterviewRef.current();
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (txRef.current) txRef.current.scrollTop = txRef.current.scrollHeight;
  }, [messages, gs.alexTyping]);

  // Start interview: Alex Park immediately introduces the case
  useEffect(() => {
    if (!hasStarted && caseData) {
      setHasStarted(true);
      const openingText = caseData.opening || "Welcome to the case interview. Whenever you're ready, please take a moment to lay out your structure.";
      
      // Set Alex's spoken intro directly
      setMessages([{
        role: 'iv',
        name: 'Alex Park',
        time: '0:00',
        text: openingText,
      }]);
      setConversationHistory([
        { role: 'assistant', content: JSON.stringify({ message: openingText }) }
      ]);
      setAgentState('speaking');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData]);

  // handleVoiceFinal — called exclusively by VoiceAgent's onUserSpeechEnd.
  // The legacy useVoice hook has been removed to prevent double-firing.
  const handleVoiceFinal = useCallback((transcript: string) => {
    if (!transcript.trim()) return;
    gs.setCurrentTranscript(transcript);
    sendToClaude(transcript);
    gs.setCurrentTranscript('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs]);

  // Process canvas updates from AI
  const processCanvasUpdates = useCallback((updates: Array<{ type: string; data: Record<string, unknown> }>) => {
    for (const update of updates) {
      const d = update.data;
      switch (update.type) {
        case 'unlock_framework': {
          setShowFramework(true);
          const names = (d.pillar_names as string[]) ?? [];
          const pillars = names.map((n: string) => ({ name: n, desc: '' }));
          setFrameworkPillars(pillars);
          setPillarStates(pillars.map((_: unknown, i: number) => i === 0 ? 'active' as const : 'pending' as const));
          if (d.sub_branches) setActivePillarSubs(d.sub_branches as string[]);
          if (currentStage < 1) setCurrentStage(1);
          break;
        }
        case 'activate_pillar': {
          const idx = (d.pillar_index as number) ?? 0;
          setPillarStates(prev => prev.map((s, i) => i === idx ? 'active' as const : s));
          if (d.sub_branches) setActivePillarSubs(d.sub_branches as string[]);
          break;
        }
        case 'complete_pillar': {
          const idx = (d.pillar_index as number) ?? 0;
          setPillarStates(prev => prev.map((s, i) => i === idx ? 'done' as const : s));
          break;
        }
        case 'add_context': {
          const card: ContextCard = {
            label: (d.label as string) ?? '',
            value: (d.value as string) ?? '',
            state: (d.state as 'confirmed' | 'hypothesis') ?? 'confirmed',
          };
          setContextCards(prev => [...prev, card]);
          break;
        }
        case 'add_exhibit': {
          const eid = (d.exhibit_id as string) ?? 'A';
          setExhibitCards(prev => prev.map(e => e.id === eid ? { ...e, unlocked: true, title: (d.title as string) ?? e.title } : e));
          setRightTab('artifacts');
          break;
        }
        case 'set_focus': {
          setFocusData({
            question: (d.question as string) ?? '',
            tips: (d.tips as string[]) ?? [],
          });
          break;
        }
        case 'advance_stage': {
          const idx = (d.stage_index as number) ?? 0;
          if (idx > currentStage) setCurrentStage(idx);
          break;
        }
        case 'award_badge': {
          setBadge({ label: (d.label as string) ?? '', name: (d.name as string) ?? '' });
          break;
        }
      }
    }
  }, [currentStage]);

  // Send to AI
  const sendToClaude = useCallback((userMessage: string, isOpening = false) => {
    if (gs.isStreaming) return;
    gs.setIsStreaming(true);
    gs.setAlexTyping(true);
    setAgentState('thinking');

    callClaude({
      caseId: caseData.id,
      difficulty: config.difficulty,
      conversationHistory,
      userMessage,
      onChunk: () => {},
      onComplete: (parsed: any, rawText: string) => {
        gs.setAlexTyping(false);
        gs.setIsStreaming(false);
        setAgentState('speaking');

        const newHistory = [
          ...conversationHistory,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: rawText },
        ];
        setConversationHistory(newHistory);

        // Build messages
        const elapsed = Date.now() - startTimeRef.current;
        const timeStr = formatTime(elapsed);

        if (!isOpening) {
          setMessages(prev => [...prev, { role: 'cd', name: 'You', time: timeStr, text: userMessage }]);
        }
        setMessages(prev => [...prev, {
          role: 'iv', name: 'Alex Park', time: timeStr, text: parsed.message,
          exhibit: parsed.artifact ? 'Exhibit shared — see Artifacts panel' : undefined,
        }]);

        // Game state
        const turn = {
          question: parsed.message,
          response: isOpening ? null : userMessage,
          scores: parsed.scores,
          timestamp: elapsed,
          phase: gs.phase,
          turnNum: gs.turns.length + 1,
          alexResponse: parsed,
        };
        gs.addTurn(turn);

        if (parsed.artifact) {
          gs.addArtifact(parsed.artifact);
        }
        if (parsed.scores) gs.updateScores(parsed.scores);

        // Process canvas updates
        if (parsed.canvas_updates && Array.isArray(parsed.canvas_updates)) {
          processCanvasUpdates(parsed.canvas_updates);
        }

        if (parsed.phase_transition) {
          if (parsed.phase_transition === 'complete') {
            setTimeout(() => completeInterview(), 1200);
          } else {
            gs.setPhase(parsed.phase_transition);
            if (parsed.phase_transition === 'deep_dive' && currentStage < 2) setCurrentStage(2);
            if (parsed.phase_transition === 'synthesis' && currentStage < 3) setCurrentStage(3);
          }
        }
        if (parsed.wildcard && !gs.wildcardFired && config.wildcard) {
          gs.fireWildcard(parsed.wildcard);
        }
      },
      onError: (err: string) => {
        gs.setAlexTyping(false);
        gs.setIsStreaming(false);
        setAgentState('idle');
        setMessages(prev => [...prev, { role: 'sys', name: 'System', time: '', text: `API Error: ${err}` }]);
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs, callClaude, caseData, config, conversationHistory, processCanvasUpdates, currentStage]);

  const handleTextSubmit = () => {
    if (!input.trim() || gs.isStreaming) return;
    const text = input;
    setInput('');
    sendToClaude(text);
  };

  const completeInterview = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Use gsRef to get the latest turns/scores — avoids stale closure when called from timer
    const latestGs = gsRef.current;
    onComplete({
      turns: latestGs.turns,
      cumulativeScores: latestGs.cumulativeScores,
      artifacts: latestGs.artifacts,
      elapsed: latestGs.elapsedSeconds,
      caseId: caseData.id,
    });
  }, [caseData, onComplete]);

  // Keep completeInterviewRef in sync
  useEffect(() => { completeInterviewRef.current = completeInterview; }, [completeInterview]);

  const quickReplies = ['Segment by city tier', 'Quantify market share gap', 'Compare entry channels'];
  const remaining = Math.max(0, maxDuration - gs.elapsedSeconds);
  const isLive = appMode === 'live';
  const isReview = appMode === 'review';

  // Helper: total score
  const scoreVals = Object.values(gs.cumulativeScores).filter(v => v > 0);
  const totalScore = scoreVals.length > 0 ? Math.round((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length) * 10) : 0;

  // Get active pillar index
  const activePillarIdx = pillarStates.findIndex(s => s === 'active');

  return (
    <div className="hci-root">
      <WildcardOverlay wildcard={gs.wildcardData} onDismiss={gs.dismissWildcard} />

      {/* ── TOP BAR ── */}
      <div className="hci-topbar">
        <div className="hci-tb-left">
          <div className="hci-tb-dot" />
          <span className="hci-tb-name">{caseData?.title}</span>
          <span className="hci-tb-badge" style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)' }}>
            {caseData?.type?.toUpperCase() ?? 'CASE'}
          </span>
          <span className="hci-tb-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}>
            {config?.difficulty?.toUpperCase() ?? 'ASSOCIATE'} &middot; RANKED
          </span>
        </div>

        <div className="hci-tb-stages">
          {STAGES.map((s, i) => (
            <div key={i} className="hci-stg-item">
              <div className="hci-stg-dot" style={{ background: i < currentStage ? '#0e8f5a' : i === currentStage ? '#1d52bf' : '#b0afa8' }} />
              <span className="hci-stg-lbl" style={{ color: i < currentStage ? '#0e8f5a' : i === currentStage ? '#1d52bf' : '#b0afa8' }}>{s}</span>
              {i < STAGES.length - 1 && <div className="hci-stg-line" style={{ background: i < currentStage ? '#0e8f5a' : 'var(--bg-border-bright)' }} />}
            </div>
          ))}
        </div>

        <div className="hci-tb-right">
          <div className="hci-view-toggle">
            <button
              className={`hci-mode-btn ${viewMode === 'split' ? 'on' : ''}`}
              onClick={() => setViewMode('split')}
              title="Split Canvas layout"
            >
              <span>📐</span> Canvas
            </button>
            <button
              className={`hci-mode-btn ${viewMode === 'studio' ? 'on' : ''}`}
              onClick={() => setViewMode('studio')}
              title="Full Voice Studio stage"
            >
              <span>🎙️</span> Voice Studio
            </button>
          </div>
          <div className="hci-mode-toggle">
            <button className={`hci-mode-btn ${isLive ? 'on' : ''}`} onClick={() => setAppMode('live')}>LIVE</button>
            <button className={`hci-mode-btn ${isReview ? 'on' : ''}`} onClick={() => setAppMode('review')}>REVIEW</button>
          </div>
          <div className={`hci-timer ${remaining < 60 ? 'danger' : ''}`}>
            <span className="hci-timer-icon">&#9201;</span>
            {formatTimer(remaining)}
          </div>
          {totalScore > 0 && (
            <div className="hci-score-pill">
              <span className="hci-score-num" style={{ color: scoreColor(totalScore / 10) }}>{totalScore}</span>
              <span className="hci-score-denom">/100</span>
            </div>
          )}
          {hasStarted && (
            <button className="hci-pause-btn" onClick={() => setEndRequested(true)}>End</button>
          )}
        </div>
      </div>

      {/* ── REVIEW BANNER ── */}
      {isReview && (
        <div className="hci-review-banner">
          <span>Post-session review — full canvas revealed</span>
          <span style={{ marginLeft: 'auto', opacity: 0.7 }}>Switch to Live to continue</span>
        </div>
      )}

      {/* ── STUDIO MODE VS SPLIT CANVAS MODE ── */}
      {viewMode === 'studio' ? (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <VoiceAgent
            interviewerName="Alex Park"
            firm={caseData?.company_style ?? "McKinsey"}
            caseTitle={caseData?.title}
            caseType={caseData?.type}
            elapsedSeconds={gs.elapsedSeconds}
            externalState={agentState}
            onStateChange={setAgentState}
            transcript={messages}
            onUserSpeechEnd={handleVoiceFinal}
            onEnd={() => setEndRequested(true)}
            viewMode="studio"
            onToggleViewMode={() => setViewMode('split')}
            onTextSubmit={(txt) => sendToClaude(txt)}
          />
        </div>
      ) : (
        <div className="hci-body">

          {/* ── LEFT PANEL — Unified Voice Agent Component ── */}
          <div className="hci-left">
            <VoiceAgent
              interviewerName="Alex Park"
              firm={caseData?.company_style ?? "McKinsey"}
              caseTitle={caseData?.title}
              caseType={caseData?.type}
              elapsedSeconds={gs.elapsedSeconds}
              externalState={agentState}
              onStateChange={setAgentState}
              transcript={messages}
              onUserSpeechEnd={handleVoiceFinal}
              onEnd={() => setEndRequested(true)}
              viewMode="split"
              onToggleViewMode={() => setViewMode('studio')}
              onTextSubmit={(txt) => sendToClaude(txt)}
              qualityScores={gs.cumulativeScores}
              quickReplies={quickReplies}
            />
          </div>

        {/* ── CENTRE PANEL — Case Canvas ── */}
        <div className="hci-centre">
          {/* Blank state */}
          {!hasStarted && (
            <div className="hci-blank-state">
              <div className="hci-blank-icon">{'🗂'}</div>
              <div className="hci-blank-title">Canvas will appear here</div>
              <div className="hci-blank-sub">Your problem statement, framework, and context cards build progressively as you work through the case. Nothing is pre-shown.</div>
            </div>
          )}

          {/* Problem Statement — appears after first AI response */}
          {hasStarted && (
            <motion.div className="hci-prob-pin" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="hci-prob-header">
                <span className="hci-prob-eyebrow">PROBLEM STATEMENT</span>
                <span className="hci-prob-badge">PINNED</span>
              </div>
              <div className="hci-prob-body">
                <p className="hci-prob-text">{caseData?.opening}</p>
              </div>
            </motion.div>
          )}

          {/* Framework Zone */}
          {hasStarted && (
            <div className="hci-fw-zone">
              <div className="hci-zone-header">
                <span className="hci-zone-eyebrow">FRAMEWORK</span>
                <span className="hci-zone-badge" style={{ background: 'var(--accent-purple-light)', color: 'var(--accent-purple)' }}>
                  {caseData?.type ?? 'Case'}
                </span>
              </div>

              {!showFramework ? (
                <div className="hci-fw-locked">
                  <div style={{ fontSize: 22, opacity: 0.4 }}>{'🧩'}</div>
                  <div className="hci-fw-locked-lbl">Framework canvas locked</div>
                  <div className="hci-fw-locked-hint">Propose your structure to the interviewer to unlock</div>
                </div>
              ) : (
                <motion.div className="hci-fw-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="hci-fw-root">{caseData?.type ?? 'Case'} Framework</div>
                  <div className="hci-fw-pillars">
                    {frameworkPillars.map((p, i) => {
                      const state = pillarStates[i] ?? 'pending';
                      const stateStyles: Record<PillarState, { bg: string; dot: string; lbl: string; lblColor: string }> = {
                        done: { bg: '#e4f6ed', dot: '#0e8f5a', lbl: 'Done', lblColor: '#0e8f5a' },
                        active: { bg: '#e8eefb', dot: '#1d52bf', lbl: 'Active', lblColor: '#1d52bf' },
                        pending: { bg: '#f2f0eb', dot: '#b0afa8', lbl: 'Pending', lblColor: '#b0afa8' },
                        locked: { bg: '#f2f0eb', dot: '#b0afa8', lbl: 'Locked', lblColor: '#b0afa8' },
                      };
                      const s = stateStyles[state];
                      return (
                        <div key={i} className="hci-fw-pillar" style={{ background: s.bg }}>
                          <div className="hci-fw-pillar-status">
                            <div className="hci-fw-pillar-dot" style={{ background: s.dot }} />
                            <span style={{ color: s.lblColor }}>{s.lbl.toUpperCase()}</span>
                          </div>
                          <div className="hci-fw-pillar-name">{p.name}</div>
                          <div className="hci-fw-pillar-desc">{p.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                  {activePillarIdx >= 0 && (
                    <div className="hci-fw-subs">
                      <div className="hci-fw-subs-label">ACTIVE BRANCH — {frameworkPillars[activePillarIdx]?.name}</div>
                      <div className="hci-fw-sub-chips">
                        {activePillarSubs.map((s, i) => (
                          <span key={i} className="hci-fw-sub-chip">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* Context Cards */}
          <AnimatePresence>
            {contextCards.length > 0 && (
              <div className="hci-ctx-zone">
                <div className="hci-zone-header">
                  <span className="hci-zone-eyebrow">CONTEXT ESTABLISHED</span>
                  <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text-tertiary)' }}>
                    {contextCards.length} confirmed
                  </span>
                </div>
                <div className="hci-ctx-grid">
                  {contextCards.map((card, i) => (
                    <motion.div
                      key={i}
                      className={`hci-ctx-card ${card.state}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <div className={`hci-ctx-icon ${card.state}`}>
                        {card.state === 'confirmed' ? '✓' : '~'}
                      </div>
                      <div className="hci-ctx-body">
                        <div className={`hci-ctx-label ${card.state}`}>{card.label}</div>
                        <div className="hci-ctx-value">{card.value}</div>
                      </div>
                      <div className={`hci-ctx-badge ${card.state}`}>
                        {card.state === 'confirmed' ? 'Confirmed' : 'Hypothesis'}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Current Focus */}
          <AnimatePresence>
            {focusData && (
              <motion.div className="hci-focus-zone" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="hci-focus-card">
                  <div className="hci-focus-eyebrow">CURRENT FOCUS &middot; Alex just asked</div>
                  <div className="hci-focus-question">{focusData.question}</div>
                  <div className="hci-focus-tips">
                    {focusData.tips.map((tip, i) => (
                      <span key={i} className="hci-focus-tip">{'💡'} {tip}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Waiting hint */}
          {hasStarted && !showFramework && messages.length > 0 && (
            <div className="hci-waiting-hint">
              {'💡'} Waiting for you to propose a framework structure...
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="hci-right">
          <div className="hci-rtabs">
            {(['artifacts', 'facts', 'score'] as const).map(tab => (
              <button key={tab} className={`hci-rtab ${rightTab === tab ? 'on' : ''}`} onClick={() => setRightTab(tab)}>
                {tab === 'artifacts' ? 'Artifacts' : tab === 'facts' ? 'Case Facts' : 'Score'}
              </button>
            ))}
          </div>
          <div className="hci-rbody">
            {/* Artifacts Tab */}
            {rightTab === 'artifacts' && (
              <>
                {gs.artifacts.length > 0 ? (
                  <ArtifactPanel artifacts={gs.artifacts} currentArtifact={gs.artifacts[gs.artifacts.length - 1]} />
                ) : (
                  exhibitCards.map((ex) => (
                    <div key={ex.id} className={`hci-art-locked ${ex.unlocked ? 'unlocked' : ''}`}>
                      <div style={{ fontSize: 18, opacity: 0.4 }}>{ex.unlocked ? '📊' : '🔒'}</div>
                      <div className="hci-art-locked-lbl">{ex.title}</div>
                      <div className="hci-art-locked-when">{ex.unlocked ? 'Revealed' : 'Unlocks when interviewer shares data'}</div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Case Facts Tab */}
            {rightTab === 'facts' && (
              <div className="hci-facts">
                <div className="hci-sec-label">Case Facts</div>
                {[
                  { label: 'Case type', val: caseData?.type ?? '—' },
                  { label: 'Duration', val: caseData?.duration ?? '5 min' },
                  { label: 'Difficulty', val: config?.difficulty ?? 'Associate' },
                  { label: 'Mode', val: caseData?.mode ?? 'Full Wildcard' },
                ].map((f, i) => (
                  <div key={i} className="hci-fact-row">
                    <span className="hci-fact-label">{f.label}</span>
                    <span className="hci-fact-value">{f.val}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Score Tab */}
            {rightTab === 'score' && (
              <div className="hci-score-tab">
                {!hasStarted ? (
                  <div className="hci-score-empty">Score appears after first response</div>
                ) : (
                  <>
                    <div className="hci-sec-label">LIVE SCORE</div>
                    <div className="hci-score-big">
                      <span className="hci-score-big-num" style={{ color: scoreColor(totalScore / 10) }}>{totalScore}</span>
                      <span className="hci-score-big-denom">/100</span>
                    </div>
                    {SCORE_DIMS.map(dim => {
                      const val = gs.cumulativeScores[dim.key] ?? 0;
                      return (
                        <div key={dim.key} className="hci-sc-bar-row">
                          <span className="hci-sc-bar-lbl">{dim.label}</span>
                          <div className="hci-sc-bar-track">
                            <motion.div className="hci-sc-bar-fill" style={{ background: dim.color }} animate={{ width: `${(val / 10) * 100}%` }} transition={{ duration: 0.5 }} />
                          </div>
                          <span className="hci-sc-bar-val" style={{ color: dim.color }}>{val > 0 ? Math.round(val * 10) : '—'}</span>
                        </div>
                      );
                    })}
                    {badge && (
                      <div className="hci-badge-card">
                        <span style={{ fontSize: 18 }}>{'🏆'}</span>
                        <div>
                          <div className="hci-badge-lbl">{badge.label}</div>
                          <div className="hci-badge-name">{badge.name}</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* ── BOTTOM BAR ── */}
      <div className="hci-bbar">
        <div className="hci-bbar-stat">
          <div className="hci-bbar-dot" style={{ background: hasStarted ? '#0e8f5a' : '#b0afa8' }} />
          {!hasStarted ? 'Not started' : gs.elapsedSeconds >= maxDuration ? 'Session complete' : 'Session active'}
        </div>
        <div className="hci-bbar-stat">Firm: <strong>.-style</strong></div>
        <div className="hci-bbar-stat">Difficulty: <strong>{config?.difficulty ?? 'Associate'}</strong></div>
        <div className="hci-bbar-stat" style={{ marginLeft: 'auto' }}>
          {isLive ? 'Shift+Enter for newline' : 'Review mode — read only'}
        </div>
      </div>

      {/* ── END MODAL ── */}
      <AnimatePresence>
        {endRequested && (
          <motion.div className="hci-end-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="hci-end-card" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>
              <div className="hci-end-title">End Interview?</div>
              <div className="hci-end-sub">Your session will be scored based on turns completed.</div>
              <div className="hci-end-btns">
                <button className="hci-end-cancel" onClick={() => setEndRequested(false)}>Continue</button>
                <button className="hci-end-confirm" onClick={completeInterview}>End & Score</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
