import { useState, useRef, useCallback, useEffect } from 'react';

const SILENCE_DELAY = 2000; // ms of silence before auto-submit

export function useVoice({ onTranscript, onFinalTranscript, onAmplitude }) {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | listening | processing | responding
  const [interimText, setInterimText] = useState('');
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animFrameRef = useRef(null);
  const accumulatedRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t;
        } else {
          interim += t;
        }
      }

      if (finalText) {
        accumulatedRef.current += ' ' + finalText;
        onTranscript?.(accumulatedRef.current.trim());
      }

      setInterimText(interim);
      onTranscript?.(accumulatedRef.current.trim() + (interim ? ' ' + interim : ''));

      // Reset silence timer on speech
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (accumulatedRef.current.trim()) {
          const finalTranscript = accumulatedRef.current.trim();
          accumulatedRef.current = '';
          setInterimText('');
          onFinalTranscript?.(finalTranscript);
          stopListening();
        }
      }, SILENCE_DELAY);
    };

    recognition.onerror = (e) => {
      if (e.error !== 'aborted') {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
        setStatus('idle');
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      stopAmplitude();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAmplitude = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      const tick = () => {
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        onAmplitude?.(avg / 128); // normalize 0–1
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Amplitude viz not available, proceed without it
    }
  }, [onAmplitude]);

  const stopAmplitude = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    onAmplitude?.(0);
  }, [onAmplitude]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) return;
    accumulatedRef.current = '';
    setInterimText('');
    setIsListening(true);
    setStatus('listening');
    recognitionRef.current.start();
    await startAmplitude();
  }, [startAmplitude]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    stopAmplitude();
    setIsListening(false);
    setStatus('processing');
  }, [stopAmplitude]);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      const transcript = accumulatedRef.current.trim();
      if (transcript) {
        accumulatedRef.current = '';
        setInterimText('');
        onFinalTranscript?.(transcript);
      }
      stopListening();
    } else {
      await startListening();
    }
  }, [isListening, stopListening, startListening, onFinalTranscript]);

  return {
    isListening,
    status,
    interimText,
    supported,
    toggleListening,
    startListening,
    stopListening,
    setStatus,
  };
}
