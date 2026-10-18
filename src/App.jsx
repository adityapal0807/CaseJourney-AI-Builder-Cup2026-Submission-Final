import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import HomeScreen from './views/HomeScreen.jsx';
import CaseBriefing from './views/CaseBriefing.jsx';
import LiveInterview from './views/LiveInterview.jsx';
import ScoringDebrief from './views/ScoringDebrief.jsx';
import AchievementToast from './components/AchievementToast.jsx';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
};

export default function App() {
  const [view, setView] = useState('home');
  const [selectedCase, setSelectedCase] = useState(null);
  const [sessionConfig, setSessionConfig] = useState({ difficulty: 'Associate', wildcard: true });
  const [sessionResult, setSessionResult] = useState(null);

  const goTo = (v) => setView(v);

  const handleSelectCase = (caseData) => {
    setSelectedCase(caseData);
    goTo('briefing');
  };

  const handleBeginInterview = (config) => {
    setSessionConfig(config);
    goTo('interview');
  };

  const handleInterviewComplete = (result) => {
    setSessionResult(result);
    goTo('debrief');
  };

  const handlePlayAgain = () => {
    setSessionResult(null);
    goTo('home');
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div key="home" {...pageVariants}>
            <HomeScreen onSelectCase={handleSelectCase} />
          </motion.div>
        )}
        {view === 'briefing' && (
          <motion.div key="briefing" {...pageVariants}>
            <CaseBriefing
              caseData={selectedCase}
              onBegin={handleBeginInterview}
              onBack={() => goTo('home')}
            />
          </motion.div>
        )}
        {view === 'interview' && (
          <motion.div key="interview" {...pageVariants}>
            <LiveInterview
              caseData={selectedCase}
              config={sessionConfig}
              onComplete={handleInterviewComplete}
            />
          </motion.div>
        )}
        {view === 'debrief' && (
          <motion.div key="debrief" {...pageVariants}>
            <ScoringDebrief
              result={sessionResult}
              caseData={selectedCase}
              onPlayAgain={handlePlayAgain}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AchievementToast />
    </>
  );
}
