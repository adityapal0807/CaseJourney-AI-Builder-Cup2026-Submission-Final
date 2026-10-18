import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FC,
} from "react";
import "./VoiceAgent.css";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

export interface TranscriptLine {
  role: "iv" | "cd" | "sys" | "user" | "agent";
  name?: string;
  time?: string;
  text: string;
  exhibit?: string;
  ts?: number;
}

export interface VoiceAgentProps {
  /** Interviewer display name */
  interviewerName?: string;
  /** Firm label shown in the header */
  firm?: string;
  /** Case title shown in the header */
  caseTitle?: string;
  /** Case type badge */
  caseType?: string;
  /** Elapsed seconds in session */
  elapsedSeconds?: number;
  /** Called when the user taps "End session" */
  onEnd?: () => void;

  // ── Speech hooks ──────────────────────────────────────────────────────────
  /** Called when candidate speech finishes to submit answer */
  onUserSpeechEnd?: (text: string) => void;
  /** Called when mic activates */
  onUserSpeechStart?: () => void;

  // ── State control ────────────────────────────────────────────────────────
  externalState?: AgentState;
  onStateChange?: (state: AgentState) => void;

  // ── Transcript ────────────────────────────────────────────────────────────
  transcript?: TranscriptLine[];

  // ── View Mode & Quality ──────────────────────────────────────────────────
  viewMode?: "split" | "studio";
  onToggleViewMode?: () => void;
  qualityScores?: Record<string, number>;
  quickReplies?: string[];

  // ── Text fallback submission ─────────────────────────────────────────────
  onTextSubmit?: (text: string) => void;
}

export interface AIOrbProps {
  state: AgentState;
  /** Diameter in px */
  size?: number;
  /** Whether to show the state label text inside the orb */
  showLabel?: boolean;
  /** Override the label text */
  label?: string;
  onClick?: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
═══════════════════════════════════════════════════════════════════════════ */

const STATE_META: Record<AgentState, { label: string; sub: string }> = {
  idle:      { label: "Ready",       sub: "Tap mic to begin your answer" },
  listening: { label: "Listening…",  sub: "Speak clearly at a natural pace"   },
  thinking:  { label: "Generating",  sub: "Analysing your response…" },
  speaking:  { label: "Speaking",    sub: "Listen carefully to the question"  },
};

const SCORE_DIMS = [
  { key: "structure",     label: "Structure", color: "#38bdf8" },
  { key: "communication", label: "Clarity",   color: "#60a5fa" },
  { key: "quantitative",  label: "Quant",     color: "#f59e0b" },
  { key: "creativity",    label: "Creativity",color: "#818cf8" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   AI ORB — 3D Glowing Animated Orb with exact loaderCircle animation
═══════════════════════════════════════════════════════════════════════════ */

export const AIOrb: FC<AIOrbProps> = ({
  state,
  size = 200,
  showLabel = true,
  label,
  onClick,
}) => {
  const letters = (label ?? STATE_META[state].label).split("");
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      className={`cc-ai-orb cc-ai-orb--${state}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label={onClick ? `${STATE_META[state].label} — tap to interact` : undefined}
      type={onClick ? "button" : undefined}
    >
      {/* ── Rotating glow ring with exact animations ── */}
      <span className="cc-ai-orb__ring" aria-hidden />

      {/* ── Soft radial wash for legible typography ── */}
      <span className="cc-ai-orb__wash" aria-hidden />

      {/* ── Inner content (bouncing letters & wave bars) ── */}
      {showLabel && (
        <span className="cc-ai-orb__inner" aria-live="polite">
          <span className="cc-ai-orb__word">
            {letters.map((ch, i) => (
              <span
                key={`${ch}-${i}`}
                className="cc-ai-orb__letter"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  fontSize: size < 160 ? "13px" : "clamp(14px, 4%, 18px)",
                }}
              >
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </span>

          {/* Waveform bars for listening in cyan */}
          {state === "listening" && (
            <span className="cc-ai-orb__wave" aria-hidden>
              {[0.0, 0.1, 0.22, 0.12, 0.3, 0.08, 0.2].map((d, i) => (
                <span
                  key={i}
                  className="cc-ai-orb__bar"
                  style={{ animationDelay: `${d}s` }}
                />
              ))}
            </span>
          )}
        </span>
      )}
    </Tag>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   UNIFIED VOICE AGENT COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export const VoiceAgent: FC<VoiceAgentProps> = ({
  interviewerName = "Alex Park",
  firm = "McKinsey",
  caseTitle,
  onEnd,
  onUserSpeechEnd,
  onUserSpeechStart,
  externalState,
  onStateChange,
  transcript = [],
  viewMode = "split",
  onToggleViewMode,
  qualityScores = {},
  quickReplies = ["Segment by city tier", "Quantify market share gap", "Compare entry channels"],
  onTextSubmit,
}) => {
  // ── States ────────────────────────────────────────────────────────────────
  const [internalState, setInternalState] = useState<AgentState>("idle");
  const [isMuted, setIsMuted] = useState(true);
  const [interimText, setInterimText] = useState("");
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");

  const state = externalState ?? internalState;
  const isControlled = externalState !== undefined;

  // ── Speech Refs ───────────────────────────────────────────────────────────
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedSpeechRef = useRef("");
  const isRecognitionActiveRef = useRef(false);

  // Transition helper
  const transition = useCallback(
    (next: AgentState) => {
      if (isControlled) {
        onStateChange?.(next);
      } else {
        setInternalState(next);
      }
    },
    [isControlled, onStateChange]
  );

  // ── Speech-to-Text (Candidate Voice Input) ────────────────────────────────
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current && isRecognitionActiveRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      isRecognitionActiveRef.current = false;
    }
    setInterimText("");
  }, []);

  const commitSpeech = useCallback(
    (textToCommit: string) => {
      const text = textToCommit.trim();
      if (!text) return;

      stopListening();
      transition("thinking");
      accumulatedSpeechRef.current = "";
      setInterimText("");

      if (onUserSpeechEnd) {
        onUserSpeechEnd(text);
      } else if (onTextSubmit) {
        onTextSubmit(text);
      }
    },
    [stopListening, transition, onUserSpeechEnd, onTextSubmit]
  );

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    stopListening();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    accumulatedSpeechRef.current = "";
    setInterimText("");

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        isRecognitionActiveRef.current = true;
        transition("listening");
        onUserSpeechStart?.();
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += t;
          } else {
            interim += t;
          }
        }

        if (finalChunk) {
          accumulatedSpeechRef.current = (
            accumulatedSpeechRef.current + " " + finalChunk
          ).trim();
        }

        setInterimText(interim || accumulatedSpeechRef.current);

        // 8s silence tolerance for interview-style responses with natural thinking pauses.
        // Always reads the latest accumulated text at fire time (avoids stale closure on 'interim').
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const fullText = accumulatedSpeechRef.current.trim();
          if (fullText.length > 5) {
            commitSpeech(fullText);
          }
        }, 8000);
      };

      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          console.warn("Speech recognition error:", e.error);
        }
        isRecognitionActiveRef.current = false;
      };

      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        if (!isMuted && state === "listening") {
          try {
            recognition.start();
            isRecognitionActiveRef.current = true;
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
      isRecognitionActiveRef.current = false;
    }
  }, [isMuted, state, stopListening, commitSpeech, transition, onUserSpeechStart]);

  const startListeningRef = useRef(startListening);
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // ── Text-to-Speech (Alex Park Voice Output) ───────────────────────────────
  const speakText = useCallback(
    (textToSpeak: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      try {
        window.speechSynthesis.cancel();
        const clean = textToSpeak.replace(/[*_#`]/g, "").trim();
        if (!clean) return;

        const doSpeak = () => {
          const utterance = new SpeechSynthesisUtterance(clean);
          utterance.rate = 1.0;
          utterance.pitch = 0.98;

          const voices = window.speechSynthesis.getVoices();
          const preferred = voices.find(
            (v) =>
              (v.name.includes("Google") ||
                v.name.includes("Samantha") ||
                v.name.includes("Daniel") ||
                v.name.includes("Natural") ||
                v.name.includes("Alex") ||
                v.name.includes("Karen") ||
                v.name.includes("en-US") ||
                v.name.includes("en-GB")) &&
              v.lang.startsWith("en")
          ) || voices.find(v => v.lang.startsWith("en"));
          if (preferred) utterance.voice = preferred;

          utterance.onstart = () => {
            transition("speaking");
          };

          utterance.onend = () => {
            // When Alex finishes speaking, seamlessly transition to listening so user knows it is their turn
            setIsMuted(false);
            transition("listening");
            startListeningRef.current?.();
          };

          utterance.onerror = (e) => {
            console.warn("Speech synthesis utterance error:", e);
            setIsMuted(false);
            transition("listening");
            startListeningRef.current?.();
          };

          window.speechSynthesis.speak(utterance);
        };

        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.onvoiceschanged = null;
            doSpeak();
          };
          // Fallback if event doesn't fire
          setTimeout(doSpeak, 150);
        } else {
          doSpeak();
        }
      } catch (err) {
        console.warn("Speech synthesis error:", err);
      }
    },
    [transition]
  );

  const stopAgentSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (state === "speaking") {
      transition(isMuted ? "idle" : "listening");
    }
  }, [state, isMuted, transition]);

  const replayLastAgentMessage = useCallback(() => {
    const lastAgentMsg = [...transcript]
      .reverse()
      .find((m) => m.role === "iv" || m.role === "agent");
    if (lastAgentMsg?.text) {
      speakText(lastAgentMsg.text);
    }
  }, [transcript, speakText]);

  // When a new agent message arrives, speak it aloud
  const lastMsgIdRef = useRef<string | null>(null);
  useEffect(() => {
    const lastMsg = transcript[transcript.length - 1];
    if (lastMsg && (lastMsg.role === "iv" || lastMsg.role === "agent")) {
      const msgKey = `${lastMsg.text.slice(0, 30)}_${transcript.length}`;
      if (lastMsgIdRef.current !== msgKey) {
        lastMsgIdRef.current = msgKey;
        speakText(lastMsg.text);
      }
    }
  }, [transcript, speakText]);



  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (nextMuted) {
        stopListening();
        if (state === "listening") transition("idle");
      } else {
        startListening();
      }
      return nextMuted;
    });
  }, [stopListening, startListening, state, transition]);

  const handlePrimaryAction = useCallback(() => {
    if (state === "speaking") {
      stopAgentSpeech();
      setIsMuted(false);
      startListening();
    } else if (state === "listening") {
      const text = (accumulatedSpeechRef.current + " " + interimText).trim();
      if (text) {
        commitSpeech(text);
      } else {
        handleToggleMute();
      }
    } else {
      setIsMuted(false);
      startListening();
    }
  }, [state, interimText, stopAgentSpeech, startListening, commitSpeech, handleToggleMute]);

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const initials = interviewerName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const recentLines = transcript.slice(-2);
  const orbSize = viewMode === "studio" ? 260 : 175;

  const getLineSpeaker = (line: TranscriptLine) => {
    if (line.role === "sys") return "System";
    if (line.role === "iv" || line.role === "agent") return interviewerName;
    return "You";
  };

  return (
    <div className="cc-unified-va">
      {/* ── 1. Integrated Header with Interviewer & Quality Scores ── */}
      <header className="cc-uva-header">
        <div className="cc-uva-top-row">
          <div className="cc-uva-host">
            <div className="cc-uva-avatar">{initials}</div>
            <div>
              <div className="cc-uva-name">{interviewerName}</div>
              <div className="cc-uva-role">{firm} &middot; Senior Partner AI</div>
            </div>
          </div>

          <div className="cc-uva-header-right">
            <div className="cc-uva-live-pill">
              <span className="cc-uva-live-dot" />
              <span>LIVE</span>
            </div>

            {onToggleViewMode && (
              <button
                className="cc-uva-expand-btn"
                onClick={onToggleViewMode}
                title={viewMode === "studio" ? "Switch to Split Canvas" : "Expand to Full Voice Studio"}
              >
                {viewMode === "studio" ? <Minimize2Icon size={14} /> : <Maximize2Icon size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Quality Dimensions in clean theme colors */}
        <div className="cc-uva-qbars">
          {SCORE_DIMS.map((dim) => {
            const val = qualityScores[dim.key] ?? 0;
            return (
              <div key={dim.key} className="cc-uva-qbar-row">
                <span className="cc-uva-qbar-name">{dim.label}</span>
                <div className="cc-uva-qbar-track">
                  <div
                    className="cc-uva-qbar-fill"
                    style={{
                      width: `${(val / 10) * 100}%`,
                      background: dim.color,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
                <span className="cc-uva-qbar-val" style={{ color: dim.color }}>
                  {val > 0 ? Math.round(val * 10) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      {/* ── 2. Unified Orb Stage ── */}
      <main className="cc-uva-stage">
        <div className="cc-uva-rings" aria-hidden>
          {[0, 700, 1400].map((delay) => (
            <span
              key={delay}
              className={`cc-uva-ring ${
                state !== "idle" ? `cc-uva-ring--${state}` : ""
              }`}
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>

        <AIOrb
          state={state}
          size={orbSize}
          onClick={handlePrimaryAction}
        />

        <p className="cc-uva-sub" aria-live="polite">
          {state === "speaking" ? (
            <span style={{ color: "#38bdf8", fontWeight: 600 }}>Alex is speaking &middot; Listen carefully</span>
          ) : state === "listening" ? (
            <span style={{ color: "#60a5fa", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8", animation: "ccPulseRing 1.2s infinite" }} />
              Speaking… press ⏹ when done
            </span>
          ) : (
            STATE_META[state].sub
          )}
        </p>

        {interimText && (
          <div className="cc-uva-interim">
            <span>"{interimText}"</span>
          </div>
        )}
      </main>

      {/* ── 3. Live Clear Transcript Strip with distinct bubbles ── */}
      {transcript.length > 0 && (
        <section className="cc-uva-transcript" aria-label="Recent dialogue">
          <div className="cc-uva-transcript-header">
            <span className="cc-uva-transcript-title">LIVE CONVERSATION</span>
            <button
              className="cc-uva-transcript-more"
              onClick={() => setShowFullTranscript(true)}
            >
              View Full History ({transcript.length})
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentLines.map((line, i) => {
              const isAlex = line.role === "iv" || line.role === "agent";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isAlex ? "flex-start" : "flex-end",
                    width: "100%",
                  }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: isAlex ? "#38bdf8" : "#93c5fd",
                      marginBottom: 2,
                    }}
                  >
                    {isAlex ? `Alex Park (${firm})` : "You (Candidate)"}
                  </span>
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: isAlex ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                      background: isAlex ? "rgba(56, 189, 248, 0.12)" : "rgba(30, 64, 175, 0.35)",
                      border: `1px solid ${isAlex ? "rgba(56, 189, 248, 0.25)" : "rgba(96, 165, 250, 0.3)"}`,
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: "rgba(255, 255, 255, 0.95)",
                      maxWidth: "92%",
                    }}
                  >
                    {line.text}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 4. Quick Replies & Text Fallback Input ── */}
      {showTextInput && (
        <div className="cc-uva-text-fallback">
          <input
            type="text"
            className="cc-uva-text-input"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && textInput.trim()) {
                commitSpeech(textInput);
                setTextInput("");
                setShowTextInput(false);
              }
            }}
            placeholder="Type answer or numbers..."
            autoFocus
          />
          <button
            className="cc-uva-text-send"
            onClick={() => {
              if (textInput.trim()) {
                commitSpeech(textInput);
                setTextInput("");
                setShowTextInput(false);
              }
            }}
          >
            Send
          </button>
        </div>
      )}

      {/* Quick reply chips in cool blue glass */}
      {quickReplies && quickReplies.length > 0 && !showTextInput && state !== "thinking" && (
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "0 14px 8px",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {quickReplies.slice(0, 2).map((chip, idx) => (
            <button
              key={idx}
              onClick={() => commitSpeech(chip)}
              style={{
                fontSize: 10.5,
                padding: "3px 10px",
                borderRadius: 14,
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.18)",
                color: "rgba(255, 255, 255, 0.8)",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* ── 5. Minimalist, Spacious Controls Dock ── */}
      <footer className="cc-uva-controls">
        {/* User Mic Mute / Unmute */}
        <button
          className={`cc-min-btn ${!isMuted ? "cc-min-btn--active" : ""}`}
          onClick={handleToggleMute}
          title={isMuted ? "Unmute your microphone" : "Mute your microphone"}
          aria-label={isMuted ? "Unmute your microphone" : "Mute your microphone"}
        >
          {isMuted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
        </button>

        {/* Primary Interactive Push-to-Talk / Finish-Speaking Button */}
        <button
          className={`cc-primary-btn ${
            state === "listening" ? "cc-primary-btn--listening" : ""
          }`}
          onClick={handlePrimaryAction}
          title={
            state === "listening"
              ? "Finished speaking? Tap to submit answer to Alex"
              : state === "speaking"
              ? "Tap to interrupt Alex and answer"
              : "Tap to speak your answer"
          }
          aria-label={
            state === "listening"
              ? "Stop speaking and submit to Alex"
              : state === "speaking"
              ? "Interrupt Alex"
              : "Start speaking"
          }
        >
          {state === "listening" ? (
            <StopIcon size={20} color="white" />
          ) : (
            <MicIcon size={24} color="white" />
          )}
          <span className="cc-primary-ripple" aria-hidden />
        </button>

        {/* Replay Alex Voice Button (Clearly labeled with speaker icon semantics) */}
        <button
          className="cc-min-btn"
          onClick={replayLastAgentMessage}
          title="Replay Alex's last question"
          aria-label="Replay Alex's last question"
        >
          <RotateCcwIcon size={20} />
        </button>

        {/* Type / Keyboard Toggle */}
        <button
          className={`cc-min-btn ${showTextInput ? "cc-min-btn--active" : ""}`}
          onClick={() => setShowTextInput((s) => !s)}
          title="Type your answer instead of speaking"
          aria-label="Type your answer instead of speaking"
        >
          <FileTextIcon size={20} />
        </button>

        {/* End Session Button */}
        <button
          className="cc-min-btn cc-min-btn--danger"
          onClick={() => {
            stopListening();
            stopAgentSpeech();
            onEnd?.();
          }}
          title="End interview session"
          aria-label="End interview session"
        >
          <PhoneOffIcon size={20} />
        </button>
      </footer>

      {/* ── Full Transcript Modal ── */}
      {showFullTranscript && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowFullTranscript(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 580,
              maxHeight: "85vh",
              background: "#0f172a",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              color: "#fff",
              boxShadow: "0 20px 50px rgba(0, 93, 255, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                Transcript &middot; {caseTitle ?? "Case Interview"}
              </h3>
              <button
                onClick={() => setShowFullTranscript(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: 22,
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>
            <div
              style={{
                padding: 20,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {transcript.map((line, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    background:
                      line.role === "iv" || line.role === "agent"
                        ? "rgba(56, 189, 248, 0.08)"
                        : line.role === "sys"
                        ? "rgba(245, 158, 11, 0.08)"
                        : "rgba(0, 93, 255, 0.12)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color:
                        line.role === "iv" || line.role === "agent"
                          ? "#38bdf8"
                          : line.role === "sys"
                          ? "#f59e0b"
                          : "#60a5fa",
                      marginBottom: 4,
                    }}
                  >
                    <span>{getLineSpeaker(line)}</span>
                    {line.time && <span>{line.time}</span>}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255, 255, 255, 0.85)" }}>
                    {line.text}
                  </div>
                  {line.exhibit && (
                    <div style={{ marginTop: 6, fontSize: 11, color: "#38bdf8" }}>
                      📊 {line.exhibit}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS — Sleek Minimalist SVGs
═══════════════════════════════════════════════════════════════════════════ */

interface IconProps { size?: number; color?: string; }

export const MicIcon: FC<IconProps> = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8"  y1="23" x2="16" y2="23"/>
  </svg>
);

export const MicOffIcon: FC<IconProps> = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8"  y1="23" x2="16" y2="23"/>
  </svg>
);

export const PhoneOffIcon: FC<IconProps> = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45
             12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2
             19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 9.68
             19.79 19.79 0 0 1 1.36 1.05 2 2 0 0 1 3.34-.91l3 .01
             a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.3 7.1"/>
    <line x1="23" y1="1" x2="1" y2="23"/>
  </svg>
);

export const StopIcon: FC<IconProps> = ({ size = 20, color = "white" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2.5"/>
  </svg>
);

export const RotateCcwIcon: FC<IconProps> = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <path d="M1 4v6h6"/>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
  </svg>
);

export const Maximize2Icon: FC<IconProps> = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <polyline points="15 3 21 3 21 9"/>
    <polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/>
    <line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);

export const Minimize2Icon: FC<IconProps> = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <polyline points="4 14 10 14 10 20"/>
    <polyline points="20 10 14 10 14 4"/>
    <line x1="14" y1="10" x2="21" y2="3"/>
    <line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);

export const FileTextIcon: FC<IconProps> = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

export default VoiceAgent;
