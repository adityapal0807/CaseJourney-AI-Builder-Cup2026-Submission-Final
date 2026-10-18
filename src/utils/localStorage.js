const STORAGE_KEYS = {
  SESSIONS:    'casejourney_sessions',
  ELO:         'casejourney_elo',
  STREAK:      'casejourney_streak',
  LAST_PLAYED: 'casejourney_last_played',
  ACHIEVEMENTS:'casejourney_achievements',
};

export function getSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]');
  } catch { return []; }
}

export function saveSession(session) {
  const sessions = getSessions();
  sessions.push({ ...session, timestamp: Date.now() });
  // Keep last 50
  if (sessions.length > 50) sessions.splice(0, sessions.length - 50);
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}

export function getElo() {
  return parseInt(localStorage.getItem(STORAGE_KEYS.ELO) || '1240', 10);
}

export function setElo(elo) {
  localStorage.setItem(STORAGE_KEYS.ELO, String(elo));
}

export function getStreak() {
  return parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '5', 10);
}

export function incrementStreak() {
  const streak = getStreak() + 1;
  localStorage.setItem(STORAGE_KEYS.STREAK, String(streak));
  localStorage.setItem(STORAGE_KEYS.LAST_PLAYED, String(Date.now()));
  return streak;
}

export function getAchievements() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS) || '[]');
  } catch { return []; }
}

export function unlockAchievement(id) {
  const achievements = getAchievements();
  if (!achievements.includes(id)) {
    achievements.push(id);
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
    return true; // newly unlocked
  }
  return false;
}

export function getLastFiveAverageScores() {
  const sessions = getSessions();
  const last5 = sessions.slice(-5);
  if (last5.length === 0) {
    return { structure: 7.2, quantitative: 6.8, creativity: 7.5, communication: 8.1, speed: 6.5 };
  }
  const keys = ['structure', 'quantitative', 'creativity', 'communication', 'speed'];
  const result = {};
  for (const key of keys) {
    const vals = last5.map(s => s.scores?.[key]).filter(v => v != null && v > 0);
    result[key] = vals.length > 0
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      : 7.0;
  }
  return result;
}

export function getStats() {
  const sessions = getSessions();
  const completed = sessions.filter(s => s.completed);
  const wins = completed.filter(s => (s.finalScore || 0) >= 7).length;
  return {
    casesPlayed: completed.length,
    winRate: completed.length > 0 ? Math.round((wins / completed.length) * 100) : 71,
    streak: getStreak(),
    elo: getElo(),
    globalRank: Math.max(1, 200 - Math.floor((getElo() - 1000) / 5)),
  };
}
