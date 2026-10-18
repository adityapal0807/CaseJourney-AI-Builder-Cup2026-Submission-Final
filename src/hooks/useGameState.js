import { useState, useCallback } from 'react';

const INITIAL_SCORES = {
  structure: 0,
  quantitative: 0,
  creativity: 0,
  communication: 0,
  speed: 0,
};

export function useGameState() {
  const [phase, setPhase] = useState('structure');
  const [turns, setTurns] = useState([]);
  const [cumulativeScores, setCumulativeScores] = useState({ ...INITIAL_SCORES });
  const [artifacts, setArtifacts] = useState([]);
  const [wildcardFired, setWildcardFired] = useState(false);
  const [wildcardData, setWildcardData] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [alexTyping, setAlexTyping] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const addTurn = useCallback((turn) => {
    setTurns(prev => [...prev, turn]);
  }, []);

  const updateScores = useCallback((newScores) => {
    setCumulativeScores(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(newScores)) {
        if (newScores[key] != null && newScores[key] > 0) {
          // Average with existing if we have one
          if (prev[key] > 0) {
            updated[key] = Math.round(((prev[key] + newScores[key]) / 2) * 10) / 10;
          } else {
            updated[key] = newScores[key];
          }
        }
      }
      return updated;
    });
  }, []);

  const addArtifact = useCallback((artifact) => {
    setArtifacts(prev => [...prev, artifact]);
  }, []);

  const fireWildcard = useCallback((data) => {
    setWildcardFired(true);
    setWildcardData(data);
  }, []);

  const dismissWildcard = useCallback(() => {
    setWildcardData(null);
  }, []);

  const reset = useCallback(() => {
    setPhase('structure');
    setTurns([]);
    setCumulativeScores({ ...INITIAL_SCORES });
    setArtifacts([]);
    setWildcardFired(false);
    setWildcardData(null);
    setIsListening(false);
    setIsStreaming(false);
    setCurrentTranscript('');
    setAlexTyping(false);
    setElapsedSeconds(0);
  }, []);

  return {
    phase, setPhase,
    turns, addTurn,
    cumulativeScores, updateScores,
    artifacts, addArtifact,
    wildcardFired, wildcardData, fireWildcard, dismissWildcard,
    isListening, setIsListening,
    isStreaming, setIsStreaming,
    currentTranscript, setCurrentTranscript,
    alexTyping, setAlexTyping,
    elapsedSeconds, setElapsedSeconds,
    reset,
  };
}
