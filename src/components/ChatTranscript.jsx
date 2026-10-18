import { useRef, useEffect } from 'react';
import styles from './ChatTranscript.module.css';

function TypingIndicator() {
  return (
    <div className={styles.typing}>
      <span className={`${styles.dot} typing-dot`} />
      <span className={`${styles.dot} typing-dot`} />
      <span className={`${styles.dot} typing-dot`} />
    </div>
  );
}

export default function ChatTranscript({ turns, alexTyping, streamingText }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, alexTyping, streamingText]);

  return (
    <div className={styles.container}>
      {turns.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>💬</div>
          <div className={styles.emptyText}>The interview will appear here</div>
        </div>
      )}

      {turns.map((turn, i) => (
        <div key={i} className={styles.turnGroup}>
          {turn.question && (
            <div className={styles.alexBubble}>
              <div className={styles.alexAvatar}>AP</div>
              <div>
                <div className={styles.bubbleContent}>{turn.question}</div>
                <div className={styles.timestamp}>{formatTime(turn.timestamp)}</div>
              </div>
            </div>
          )}
          {turn.response && (
            <div className={styles.userBubble}>
              <div>
                <div className={styles.bubbleContent}>{turn.response}</div>
                <div className={`${styles.timestamp} ${styles.timestampRight}`}>{formatTime(turn.timestamp)}</div>
              </div>
            </div>
          )}
        </div>
      ))}

      {streamingText && (
        <div className={styles.alexBubble}>
          <div className={styles.alexAvatar}>AP</div>
          <div className={styles.bubbleContent}>{streamingText}</div>
        </div>
      )}

      {alexTyping && !streamingText && (
        <div className={styles.alexBubble}>
          <div className={styles.alexAvatar}>AP</div>
          <TypingIndicator />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function formatTime(ms) {
  if (!ms && ms !== 0) return '';
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
