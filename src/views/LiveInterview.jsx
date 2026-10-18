import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState } from '../hooks/useGameState.js';
import { useClaude } from '../hooks/useClaude.js';
import { useVoice } from '../hooks/useVoice.js';
import ChatTranscript from '../components/ChatTranscript.jsx';
import ArtifactPanel from '../components/ArtifactPanel.jsx';
import LiveScorecard from '../components/LiveScorecard.jsx';
import VoiceInput from '../components/VoiceInput.jsx';
import WildcardOverlay from '../components/WildcardOverlay.jsx';
import styles from './LiveInterview.module.css';

const PHASE_LABELS = {
  structure: { label: 'STRUCTURE', color: '#7B6FE8' },
  deep_dive:  { label: 'DEEP DIVE', color: '#3B82F6' },
  synthesis:  { label: 'SYNTHESIS', color: '#22C55E' },
  complete:   { label: 'COMPLETE',  color: '#F59E0B' },
};

export default function LiveInterview({ caseData, config, onComplete }) {
  const gs = useGameState();
  const { callClaude } = useClaude();

  const [conversationHistory, setConversationHistory] = useState([]);
  const [streamingText, setStreamingText] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [showDataRequest, setShowDataRequest] = useState(false);
  const [dataRequestText, setDataRequestText] = useState('');
  const [currentArtifact, setCurrentArtifact] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [endRequested, setEndRequested] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      gs.setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start interview with opening question
  useEffect(() => {
    if (!hasStarted && caseData) {
      setHasStarted(true);
      sendToClaude(caseData.opening, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData]);

  const sendToClaude = useCallback((userMessage, isOpening = false) => {
    if (gs.isStreaming) return;
    gs.setIsStreaming(true);
    gs.setAlexTyping(true);
    setStreamingText('');

    let accumulated = '';

    callClaude({
      caseId: caseData.id,
      difficulty: config.difficulty,
      conversationHistory,
      userMessage,
      onChunk: (chunk, full) => {
        accumulated = full;
        // Show partial text while streaming (only visible portion)
        const jsonMatch = full.match(/^\s*\{/);
        if (!jsonMatch) {
          setStreamingText(full);
        } else {
          // Try to extract message from partial JSON
          const msgMatch = full.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          if (msgMatch) setStreamingText(msgMatch[1].replace(/\\n/g, '\n'));
        }
      },
      onComplete: (parsed, rawText) => {
        gs.setAlexTyping(false);
        gs.setIsStreaming(false);
        setStreamingText('');

        const newHistory = [
          ...conversationHistory,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: rawText },
        ];
        setConversationHistory(newHistory);

        // Add turn
        const turn = {
          question: parsed.message,
          response: isOpening ? null : userMessage,
          scores: parsed.scores,
          timestamp: Date.now() - startTimeRef.current,
          phase: gs.phase,
          turnNum: gs.turns.length + 1,
          alexResponse: parsed,
        };
        gs.addTurn(turn);

        // Handle artifact
        if (parsed.artifact) {
          setCurrentArtifact(parsed.artifact);
          gs.addArtifact(parsed.artifact);
        }

        // Handle scores
        if (parsed.scores) {
          gs.updateScores(parsed.scores);
        }

        // Handle phase transition
        if (parsed.phase_transition) {
          if (parsed.phase_transition === 'complete') {
            // End interview
            setTimeout(() => completeInterview(), 1200);
          } else {
            gs.setPhase(parsed.phase_transition);
          }
        }

        // Handle wildcard
        if (parsed.wildcard && !gs.wildcardFired && config.wildcard) {
          gs.fireWildcard(parsed.wildcard);
        }
      },
      onError: (err) => {
        gs.setAlexTyping(false);
        gs.setIsStreaming(false);
        setStreamingText('');
        console.error('Claude error:', err);
        // Add error turn so user sees something
        gs.addTurn({
          question: `[API Error: ${err}. Check your VITE_ANTHROPIC_API_KEY in .env]`,
          response: null,
          timestamp: Date.now() - startTimeRef.current,
          phase: gs.phase,
          turnNum: gs.turns.length + 1,
        });
      },
    });
  }, [gs, callClaude, caseData, config, conversationHistory]);

  const handleVoiceFinal = useCallback((transcript) => {
    if (!transcript.trim()) return;
    gs.setCurrentTranscript(transcript);
    sendToClaude(transcript);
    gs.setCurrentTranscript('');
  }, [sendToClaude, gs]);

  const { isListening, status, interimText, supported, toggleListening, setStatus } = useVoice({
    onTranscript: (t) => gs.setCurrentTranscript(t),
    onFinalTranscript: handleVoiceFinal,
  });

  // Sync status with streaming state
  useEffect(() => {
    if (gs.isStreaming) setStatus('responding');
    else if (!isListening) setStatus('idle');
  }, [gs.isStreaming, isListening, setStatus]);

  const handleTextSubmit = () => {
    if (!currentInput.trim() || gs.isStreaming) return;
    const text = currentInput;
    setCurrentInput('');
    sendToClaude(text);
  };

  const handleDataRequest = () => {
    if (!dataRequestText.trim()) return;
    sendToClaude(`[DATA REQUEST] ${dataRequestText}`);
    setDataRequestText('');
    setShowDataRequest(false);
  };

  const completeInterview = useCallback(() => {
    clearInterval(timerRef.current);
    onComplete({
      turns: gs.turns,
      cumulativeScores: gs.cumulativeScores,
      artifacts: gs.artifacts,
      elapsed: gs.elapsedSeconds,
      caseId: caseData.id,
    });
  }, [gs, caseData, onComplete]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const phase = gs.phase;
  const phaseInfo = PHASE_LABELS[phase] || PHASE_LABELS.structure;

  return (
    <div className={styles.page}>
      {/* Wildcard Overlay */}
      <WildcardOverlay
        wildcard={gs.wildcardData}
        onDismiss={gs.dismissWildcard}
      />

      {/* Zone A: Left Sidebar — Chat */}
      <div className={styles.leftSidebar}>
        <div className={styles.partnerHeader}>
          <div className={styles.avatar}>AP</div>
          <div>
            <div className={styles.partnerName}>Alex Park</div>
            <div className={styles.partnerStatus}>
              <span className={styles.statusDot} />
              Interviewing now
            </div>
          </div>
        </div>

        <ChatTranscript
          turns={gs.turns}
          alexTyping={gs.alexTyping}
          streamingText={streamingText}
        />

        {/* Text Input fallback */}
        <div className={styles.textInputArea}>
          <input
            className={styles.textInput}
            value={currentInput}
            onChange={e => setCurrentInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
            placeholder="Type your response..."
            disabled={gs.isStreaming}
          />
          <button
            className={styles.sendBtn}
            onClick={handleTextSubmit}
            disabled={gs.isStreaming || !currentInput.trim()}
          >
            →
          </button>
        </div>
      </div>

      {/* Zone B: Centre — Artifacts + Top Bar */}
      <div className={styles.centrePanel}>
        {/* Top Bar */}
        <div className={styles.topBar}>
          <span className={styles.caseTitle}>{caseData?.title}</span>

          <AnimatePresence mode="wait">
            <motion.span
              key={phase}
              className={styles.phasePill}
              style={{ '--phase-color': phaseInfo.color }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {phaseInfo.label}
            </motion.span>
          </AnimatePresence>

          <div className={styles.timerGroup}>
            <span className={`${styles.timer} mono`}>{formatTime(gs.elapsedSeconds)}</span>
            <button className={styles.endBtn} onClick={() => setEndRequested(true)}>End</button>
          </div>
        </div>

        {/* Artifact Display */}
        <div className={styles.artifactArea}>
          {currentArtifact ? (
            <ArtifactPanel artifacts={gs.artifacts} currentArtifact={currentArtifact} />
          ) : (
            <div className={styles.artifactEmpty}>
              <div className={styles.artifactEmptyIcon}>📊</div>
              <div className={styles.artifactEmptyText}>Exhibits will appear here when Alex reveals them</div>
            </div>
          )}
        </div>

        {/* Ask for Data */}
        <div className={styles.dataRequestArea}>
          {showDataRequest ? (
            <div className={styles.dataRequestInput}>
              <input
                className={styles.dataInput}
                value={dataRequestText}
                onChange={e => setDataRequestText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDataRequest()}
                placeholder="Request specific data or exhibit..."
                autoFocus
              />
              <button className={styles.dataSubmitBtn} onClick={handleDataRequest}>Request</button>
              <button className={styles.dataCancelBtn} onClick={() => setShowDataRequest(false)}>Cancel</button>
            </div>
          ) : (
            <button className={styles.askDataBtn} onClick={() => setShowDataRequest(true)}>
              + Ask for Data
            </button>
          )}
        </div>
      </div>

      {/* Zone C: Right — Scorecard + Voice */}
      <div className={styles.rightSidebar}>
        <LiveScorecard
          scores={gs.cumulativeScores}
          recentTurns={gs.turns.slice(-3)}
        />

        <VoiceInput
          isListening={isListening}
          status={gs.isStreaming ? 'responding' : status}
          interimText={interimText}
          supported={supported}
          onToggle={toggleListening}
          disabled={gs.isStreaming}
        />
      </div>

      {/* End Confirmation */}
      <AnimatePresence>
        {endRequested && (
          <motion.div
            className={styles.endModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.endCard}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <div className={styles.endTitle}>End Interview?</div>
              <div className={styles.endSub}>Your session will be scored based on turns completed.</div>
              <div className={styles.endBtns}>
                <button className={styles.endCancel} onClick={() => setEndRequested(false)}>Continue</button>
                <button className={styles.endConfirm} onClick={completeInterview}>End & Score</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
