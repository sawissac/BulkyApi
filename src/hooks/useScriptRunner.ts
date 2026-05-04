"use client";

import { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { analyzeScript } from "@/lib/scriptAnalyzer";
import { runScript } from "@/lib/scriptRunner";
import { selectCode } from "@/store/editorSlice";
import { selectEnvVars, selectActiveEnv } from "@/store/collectionsSlice";
import {
  selectBuiltCalls,
  selectRunning,
  selectStepMode,
  setBuiltCalls,
  setRunning,
  setPaused,
  setExtractedVars,
  updateCallsAndLogs,
} from "@/store/runnerSlice";
import { selectActiveId } from "@/store/collectionsSlice";
import { selectCallTimeout } from "@/store/uiSlice";

export function useScriptRunner() {
  const dispatch = useDispatch();
  const code = useSelector(selectCode);
  const envVars = useSelector(selectEnvVars);
  const activeEnv = useSelector(selectActiveEnv);
  const builtCalls = useSelector(selectBuiltCalls);
  const running = useSelector(selectRunning);
  const activeId = useSelector(selectActiveId);
  const stepMode = useSelector(selectStepMode);
  const callTimeout = useSelector(selectCallTimeout);

  const stepResumeRef = useRef<(() => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const waitForNext = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      stepResumeRef.current = resolve;
      dispatch(setPaused(true));
    });
  }, [dispatch]);

  const onNext = useCallback(() => {
    if (stepResumeRef.current) {
      stepResumeRef.current();
      stepResumeRef.current = null;
      dispatch(setPaused(false));
    }
  }, [dispatch]);

  const onStop = useCallback(() => {
    abortControllerRef.current?.abort();
    // If paused in step mode, resume so the script can see the abort and exit
    if (stepResumeRef.current) {
      stepResumeRef.current();
      stepResumeRef.current = null;
      dispatch(setPaused(false));
    }
  }, [dispatch]);

  const onRun = useCallback(async () => {
    if (running) return;

    const runItemId = activeId;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    dispatch(setRunning(true));
    dispatch(
      setBuiltCalls(
        analyzeScript(code, envVars).map((c, i) => ({
          ...c,
          status: "pending" as const,
          cache: builtCalls[i]?.cache ?? false,
        })),
      ),
    );

    const callCache = Object.fromEntries(
      builtCalls
        .filter((c) => c.cache && c.response !== null)
        .map((c) => [
          `${c.method}::${c.url}`,
          {
            statusCode: c.statusCode,
            response: c.response,
            responseHeaders: c.responseHeaders,
            duration: c.duration,
            timestamp: c.timestamp,
          },
        ]),
    );

    const { extractedVars } = await runScript(
      code,
      { ...envVars, current: activeEnv?.name ?? "" },
      (calls, logs) =>
        dispatch(updateCallsAndLogs({ calls, logs, itemId: runItemId })),
      stepMode ? waitForNext : undefined,
      Object.keys(callCache).length > 0 ? callCache : undefined,
      callTimeout > 0 ? callTimeout : undefined,
      controller.signal,
    );

    stepResumeRef.current = null;
    abortControllerRef.current = null;
    if (Object.keys(extractedVars).length > 0)
      dispatch(setExtractedVars(extractedVars));
    dispatch(setRunning(false));
  }, [
    running,
    code,
    envVars,
    activeEnv,
    builtCalls,
    activeId,
    stepMode,
    callTimeout,
    waitForNext,
    dispatch,
  ]);

  return { onRun, onNext, onStop };
}
