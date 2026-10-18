import { useCallback } from 'react';

export function useClaude() {
  const callClaude = useCallback(async ({
    caseId,
    difficulty,
    conversationHistory,
    userMessage,
    onChunk,
    onComplete,
    onError,
  }) => {
    try {
      // Show typing indicator immediately
      onChunk?.('', '...');

      const response = await fetch('/api/interview/sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId: caseId ? String(caseId) : 'legacy-1',
          difficulty: difficulty ? String(difficulty) : 'Associate',
          conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
          userMessage: String(userMessage ?? ''),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server returned status ${response.status}`);
      }

      const result = await response.json();
      onComplete?.(result, result.rawText);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  return { callClaude };
}
