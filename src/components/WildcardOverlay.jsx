import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './WildcardOverlay.module.css';

const WILDCARD_TIME = 90;

export default function WildcardOverlay({ wildcard, onDismiss }) {
  const [timeLeft, setTimeLeft] = useState(WILDCARD_TIME);
  const [flashing, setFlashing] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!wildcard) return;
    setTimeLeft(WILDCARD_TIME);
    setFlashing(true);

    const flashTimer = setTimeout(() => setFlashing(false), 600);

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onDismiss?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(flashTimer);
      clearInterval(intervalRef.current);
    };
  }, [wildcard, onDismiss]);

  return (
    <AnimatePresence>
      {wildcard && (
        <>
          {/* Amber flash frame */}
          {flashing && (
            <motion.div
              className={styles.flashFrame}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}

          {/* Overlay */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className={styles.card}
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
            >
              <div className={styles.header}>
                <div className={styles.iconWrap}>⚡</div>
                <div>
                  <div className={styles.tag}>WILDCARD INTERRUPT</div>
                  <div className={styles.tagSub}>{wildcard.type?.replace('_', ' ').toUpperCase()}</div>
                </div>
                <div className={styles.timerWrap}>
                  <div
                    className={`${styles.timer} ${timeLeft <= 20 ? styles.timerRed : ''}`}
                  >
                    {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                  </div>
                  <div className={styles.timerLabel}>remaining</div>
                </div>
              </div>

              <div className={styles.message}>{wildcard.message}</div>

              <div className={styles.footer}>
                <div className={styles.hint}>Respond verbally or type below. Timer auto-dismisses this card.</div>
                <button className={styles.dismissBtn} onClick={onDismiss}>
                  Submit Response
                </button>
              </div>

              {/* Timer bar */}
              <div className={styles.timerBarTrack}>
                <motion.div
                  className={styles.timerBarFill}
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / WILDCARD_TIME) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
