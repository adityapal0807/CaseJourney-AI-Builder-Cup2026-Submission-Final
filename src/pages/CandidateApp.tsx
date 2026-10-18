import { useState, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";

const HomeScreen = lazy(() => import("@/views/HomeScreen.tsx"));
const CaseBriefing = lazy(() => import("@/views/CaseBriefing.tsx"));
const LiveInterview = lazy(() => import("@/views/LiveInterview.tsx"));
const MindFlow = lazy(() => import("@/views/MindFlow.tsx"));
const ScoringDebrief = lazy(() => import("@/views/ScoringDebrief.tsx"));
const AchievementToast = lazy(() => import("@/components/AchievementToast.tsx"));

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" as const } },
};

type View = "home" | "briefing" | "interview" | "mindflow" | "debrief";

export default function CandidateApp() {
  const [view, setView] = useState<View>("home");
  const [selectedCase, setSelectedCase] = useState<unknown>(null);
  const [sessionConfig, setSessionConfig] = useState<unknown>({ difficulty: "Associate", wildcard: true });
  const [sessionResult, setSessionResult] = useState<unknown>(null);

  const handleSelectCase = (caseData: unknown) => {
    setSelectedCase(caseData);
    setView("briefing");
  };
  const handleBeginInterview = (config: unknown) => {
    setSessionConfig(config);
    setView("interview");
  };
  const handleInterviewComplete = (result: unknown) => {
    setSessionResult(result);
    setView("mindflow");
  };
  const handlePlayAgain = () => {
    setSessionResult(null);
    setView("home");
  };

  return (
    <Suspense fallback={null}>
      <AnimatePresence mode="wait">
        {view === "home" && (
          <motion.div key="home" {...pageVariants}>
            <HomeScreen onSelectCase={handleSelectCase} />
          </motion.div>
        )}
        {view === "briefing" && (
          <motion.div key="briefing" {...pageVariants}>
            <CaseBriefing caseData={selectedCase} onBegin={handleBeginInterview} onBack={() => setView("home")} />
          </motion.div>
        )}
        {view === "interview" && (
          <motion.div key="interview" {...pageVariants}>
            <LiveInterview caseData={selectedCase} config={sessionConfig} onComplete={handleInterviewComplete} />
          </motion.div>
        )}
        {view === "mindflow" && (
          <motion.div key="mindflow" {...pageVariants} style={{ height: "100vh" }}>
            <MindFlow
              result={sessionResult}
              caseData={selectedCase}
              onViewDebrief={() => setView("debrief")}
              onNextCase={handlePlayAgain}
            />
          </motion.div>
        )}
        {view === "debrief" && (
          <motion.div key="debrief" {...pageVariants}>
            <ScoringDebrief result={sessionResult} caseData={selectedCase} onPlayAgain={handlePlayAgain} />
          </motion.div>
        )}
      </AnimatePresence>
      <AchievementToast />
    </Suspense>
  );
}
