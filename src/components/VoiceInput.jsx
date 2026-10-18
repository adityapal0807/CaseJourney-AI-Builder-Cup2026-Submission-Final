import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './VoiceInput.module.css';

export default function VoiceInput({
  isListening,
  status,
  interimText,
  supported,
  onToggle,
  disabled,
}) {
  const [amplitude, setAmplitude] = useState(0);
  const amplitudeRef = useRef(0);

  const statusLabels = {
    idle:       'Tap to speak',
    listening:  'Listening...',
    processing: 'Processing...',
    responding: 'Alex is responding...',
  };

  return (
    <div className={styles.container}>
      <div className={styles.micArea}>
        {/* Pulse rings when listening */}
        {isListening && (
          <>
            <div className={`${styles.ring} ${styles.ring1}`} />
            <div className={`${styles.ring} ${styles.ring2}`} />
            <div className={`${styles.ring} ${styles.ring3}`} />
          </>
        )}

        <button
          className={`${styles.micBtn} ${isListening ? styles.listening : ''} ${disabled ? styles.disabled : ''}`}
          onClick={onToggle}
          disabled={disabled || !supported}
          title={supported ? statusLabels[status] : 'Voice not supported in this browser'}
        >
          {status === 'processing' || status === 'responding' ? (
            <span className={styles.processingDots}>
              <span className={`${styles.dot} typing-dot`} />
              <span className={`${styles.dot} typing-dot`} />
              <span className={`${styles.dot} typing-dot`} />
            </span>
          ) : (
            <MicIcon active={isListening} />
          )}
        </button>
      </div>

      <div className={styles.statusLabel}>
        {!supported ? 'Voice unavailable' : statusLabels[status] || 'Tap to speak'}
      </div>

      {interimText && (
        <div className={styles.transcript}>
          <span className={styles.transcriptText}>{interimText}</span>
        </div>
      )}
    </div>
  );
}

function MicIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="12" rx="3" fill={active ? '#7B6FE8' : '#8B8A8E'} />
      <path d="M5 11a7 7 0 0014 0" stroke={active ? '#7B6FE8' : '#8B8A8E'} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="22" stroke={active ? '#7B6FE8' : '#8B8A8E'} strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="22" x2="15" y2="22" stroke={active ? '#7B6FE8' : '#8B8A8E'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
