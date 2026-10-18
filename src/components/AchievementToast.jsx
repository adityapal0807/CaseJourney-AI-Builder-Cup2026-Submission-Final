import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './AchievementToast.module.css';

let toastQueue = [];
let listeners = [];

export function showAchievement(achievement) {
  toastQueue.push(achievement);
  listeners.forEach(fn => fn([...toastQueue]));
}

export default function AchievementToast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (q) => setToasts([...q]);
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  }, []);

  const dismiss = (id) => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    setToasts([...toastQueue]);
  };

  return (
    <div className={styles.container}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={styles.toast}
            style={{ '--toast-color': toast.color }}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onAnimationComplete={() => {
              setTimeout(() => dismiss(toast.id), 4000);
            }}
          >
            <div className={styles.icon}>🏆</div>
            <div>
              <div className={styles.label}>Achievement Unlocked</div>
              <div className={styles.name}>{toast.label}</div>
            </div>
            <button className={styles.close} onClick={() => dismiss(toast.id)}>×</button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
