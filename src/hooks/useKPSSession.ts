'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  KPSQuestionClient,
  KPSQuestionResponse,
  KPSIndicator,
  KPSQuestionType,
  KPS_CONFIG,
} from '@/types/kps';

interface SessionState {
  sessionId: string;
  currentStage: 1 | 2 | 3;
  stage2Path: 'tinggi' | 'rendah' | null;
  stimulus: { id: string; title: string; content: string } | null;
  questions: KPSQuestionClient[];
  timeLeftMs: number;
  isBreak: boolean;
  completedStages: number[];
}

interface UseKPSSessionReturn {
  state: SessionState;
  currentQuestionIdx: number;
  setCurrentQuestionIdx: (idx: number) => void;
  answers: Record<string, Record<string, unknown>>;
  setAnswer: (questionId: string, answer: Record<string, unknown>) => void;
  submitStage: () => Promise<void>;
  completeExam: () => Promise<void>;
  skipBreak: () => void;
  loading: boolean;
  error: string | null;
  stageResult: { correctCount: number; stageScore: number } | null;
}

export function useKPSSession(sessionId: string, initialData?: {
  currentStage?: 1 | 2 | 3;
  stage2Path?: 'tinggi' | 'rendah' | null;
  stimulus?: { id: string; title: string; content: string } | null;
  questions?: KPSQuestionClient[];
  timeLeftMs?: number;
}): UseKPSSessionReturn {
  const { user } = useAuth();
  const [state, setState] = useState<SessionState>({
    sessionId,
    currentStage: initialData?.currentStage || 1,
    stage2Path: initialData?.stage2Path || null,
    stimulus: initialData?.stimulus || null,
    questions: initialData?.questions || [],
    timeLeftMs: initialData?.timeLeftMs || KPS_CONFIG.totalDurationMinutes * 60 * 1000,
    isBreak: false,
    completedStages: [],
  });

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageResult, setStageResult] = useState<{ correctCount: number; stageScore: number } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Save to localStorage
  const saveToLocalStorage = useCallback(() => {
    const data = {
      state: {
        ...state,
        questions: [], // Don't save questions (too large)
      },
      currentQuestionIdx,
      answers,
      savedAt: Date.now(),
    };
    localStorage.setItem(`kps_session_${sessionId}`, JSON.stringify(data));
  }, [state, currentQuestionIdx, answers, sessionId]);

  // Restore from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`kps_session_${sessionId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.state) {
          setState((prev) => ({
            ...prev,
            currentStage: data.state.currentStage || prev.currentStage,
            stage2Path: data.state.stage2Path || prev.stage2Path,
            completedStages: data.state.completedStages || prev.completedStages,
            timeLeftMs: data.state.timeLeftMs || prev.timeLeftMs,
          }));
          setCurrentQuestionIdx(data.currentQuestionIdx || 0);
          setAnswers(data.answers || {});
        }
      } catch {
        // Ignore corrupted data
      }
    }
  }, [sessionId]);

  // Auto-save periodically
  useEffect(() => {
    const interval = setInterval(saveToLocalStorage, 30000);
    return () => clearInterval(interval);
  }, [saveToLocalStorage]);

  const setAnswer = useCallback((questionId: string, answer: Record<string, unknown>) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const getAuthHeader = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  const submitStage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStageResult(null);

    try {
      const headers = await getAuthHeader();

      // Build responses array
      const responses = state.questions.map((q) => {
        const answer = answers[q.id] || {};
        let timeSpentMs = 30000; // default 30s

        return {
          questionId: q.id,
          answer: {
            questionId: q.id,
            indicator: q.indicator,
            questionType: q.questionType,
            ...answer,
          },
          timeSpentMs,
        };
      });

      const res = await fetch(`/api/kps/sessions/${sessionId}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ stage: state.currentStage, responses }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengumpulkan tahap');
      }

      const data = await res.json();
      setStageResult({ correctCount: data.correctCount, stageScore: data.stageScore });

      if (data.completed) {
        // Stage 3 done — exam is complete
        setState((prev) => ({
          ...prev,
          completedStages: [...prev.completedStages, state.currentStage],
        }));
        return;
      }

      // Show break screen
      setState((prev) => ({
        ...prev,
        isBreak: true,
        completedStages: [...prev.completedStages, state.currentStage],
      }));

      // Store next stage data for after break
      sessionStorage.setItem(`kps_next_${sessionId}`, JSON.stringify({
        nextStage: data.nextStage,
        nextPath: data.nextPath,
        stimulus: data.stimulus,
        questions: data.questions,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [state, answers, sessionId, getAuthHeader]);

  const skipBreak = useCallback(() => {
    const nextData = sessionStorage.getItem(`kps_next_${sessionId}`);
    if (!nextData) return;

    const data = JSON.parse(nextData);
    sessionStorage.removeItem(`kps_next_${sessionId}`);

    setState((prev) => ({
      ...prev,
      currentStage: data.nextStage,
      stage2Path: data.nextPath || prev.stage2Path,
      stimulus: data.stimulus,
      questions: data.questions,
      isBreak: false,
    }));
    setCurrentQuestionIdx(0);
    setAnswers({});
  }, [sessionId]);

  const completeExam = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/kps/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyelesaikan ujian');
      }

      // Clear localStorage
      localStorage.removeItem(`kps_session_${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [sessionId, getAuthHeader]);

  return {
    state,
    currentQuestionIdx,
    setCurrentQuestionIdx,
    answers,
    setAnswer,
    submitStage,
    completeExam,
    skipBreak,
    loading,
    error,
    stageResult,
  };
}
