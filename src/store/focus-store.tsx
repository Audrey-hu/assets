import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ID, TimeCategory } from "@/lib/types";

export interface FocusTarget {
  label: string;
  hobbyId?: ID;
  journeyId?: ID;
  stageId?: ID;
  courseId?: ID;
  title?: string;
  timeCategory?: TimeCategory;
}

export interface PendingSummary {
  target: FocusTarget;
  startedAt: Date;
  endedAt: Date;
  durationMin: number;
  pauseMin: number;
  /** true when the timer was cancelled rather than completed */
  interrupted?: boolean;
}

export const FOCUS_PRESETS = [25, 45, 60] as const;

interface FocusContextValue {
  active: boolean;
  running: boolean;
  target: FocusTarget | null;
  plannedMinutes: number | null;
  elapsedSec: number;
  pauseSec: number;
  remainingSec: number | null;
  sheetOpen: boolean;
  pendingSummary: PendingSummary | null;
  startFocus: (target: FocusTarget, plannedMinutes: number | null) => void;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  cancel: () => void;
  openSheet: () => void;
  closeSheet: () => void;
  dismissSummary: () => void;
  reset: () => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export function FocusProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<FocusTarget | null>(null);
  const [plannedMinutes, setPlannedMinutes] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pauseSec, setPauseSec] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingSummary, setPendingSummary] = useState<PendingSummary | null>(null);

  const startedAtRef = useRef<Date | null>(null);
  const pauseStartedRef = useRef<number | null>(null);
  const accumulatedPauseRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const startedAt = startedAtRef.current;
      if (!startedAt) return;
      const wall = (Date.now() - startedAt.getTime()) / 1000;
      const currentPause =
        pauseStartedRef.current !== null ? (Date.now() - pauseStartedRef.current) / 1000 : 0;
      const totalPause = accumulatedPauseRef.current + currentPause;
      setPauseSec(Math.floor(totalPause));
      setElapsedSec(Math.max(0, Math.floor(wall - totalPause)));
    };
    tick();
    const handle = window.setInterval(tick, 250);
    return () => window.clearInterval(handle);
  }, [running]);

  const startFocus = useCallback((nextTarget: FocusTarget, minutes: number | null) => {
    startedAtRef.current = new Date();
    pauseStartedRef.current = null;
    accumulatedPauseRef.current = 0;
    setTarget(nextTarget);
    setPlannedMinutes(minutes);
    setElapsedSec(0);
    setPauseSec(0);
    setPendingSummary(null);
    setRunning(true);
    setSheetOpen(true);
  }, []);

  const pause = useCallback(() => {
    if (!running) return;
    pauseStartedRef.current = Date.now();
    setRunning(false);
  }, [running]);

  const resume = useCallback(() => {
    if (running || !target) return;
    if (pauseStartedRef.current !== null) {
      accumulatedPauseRef.current += (Date.now() - pauseStartedRef.current) / 1000;
      pauseStartedRef.current = null;
    }
    setRunning(true);
  }, [running, target]);

  const finalize = useCallback(
    (interrupted: boolean) => {
      const startedAt = startedAtRef.current ?? new Date();
      const endedAt = new Date();
      const wall = (endedAt.getTime() - startedAt.getTime()) / 1000;
      const currentPause =
        pauseStartedRef.current !== null ? (endedAt.getTime() - pauseStartedRef.current) / 1000 : 0;
      const totalPause = accumulatedPauseRef.current + currentPause;
      const effective = Math.max(0, wall - totalPause);
      setRunning(false);
      pauseStartedRef.current = null;
      if (!target) return;
      setPendingSummary({
        target,
        startedAt,
        endedAt,
        durationMin: Math.max(effective >= 30 ? Math.round(effective / 60) : 1, Math.round(effective / 60)),
        pauseMin: Math.round(totalPause / 60),
        interrupted,
      });
      setSheetOpen(true);
    },
    [target],
  );

  const finish = useCallback(() => finalize(false), [finalize]);
  const cancel = useCallback(() => {
    startedAtRef.current = null;
    pauseStartedRef.current = null;
    accumulatedPauseRef.current = 0;
    setRunning(false);
    setTarget(null);
    setPlannedMinutes(null);
    setElapsedSec(0);
    setPauseSec(0);
    setSheetOpen(false);
  }, []);

  const reset = useCallback(() => {
    setPendingSummary(null);
    setTarget(null);
    setPlannedMinutes(null);
    setElapsedSec(0);
    setPauseSec(0);
    setSheetOpen(false);
    startedAtRef.current = null;
    pauseStartedRef.current = null;
    accumulatedPauseRef.current = 0;
  }, []);

  const remainingSec = plannedMinutes !== null ? Math.max(0, plannedMinutes * 60 - elapsedSec) : null;

  /* Auto-complete a planned session when the countdown reaches zero. */
  useEffect(() => {
    if (running && remainingSec === 0) finalize(false);
  }, [running, remainingSec, finalize]);

  const value = useMemo<FocusContextValue>(
    () => ({
      active: Boolean(target) && pendingSummary === null,
      running,
      target,
      plannedMinutes,
      elapsedSec,
      pauseSec,
      remainingSec,
      sheetOpen,
      pendingSummary,
      startFocus,
      pause,
      resume,
      finish,
      cancel,
      openSheet: () => setSheetOpen(true),
      closeSheet: () => setSheetOpen(false),
      dismissSummary: () => setPendingSummary(null),
      reset,
    }),
    [
      target,
      running,
      plannedMinutes,
      elapsedSec,
      pauseSec,
      remainingSec,
      sheetOpen,
      pendingSummary,
      startFocus,
      pause,
      resume,
      finish,
      cancel,
      reset,
    ],
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used inside FocusProvider");
  return ctx;
}
