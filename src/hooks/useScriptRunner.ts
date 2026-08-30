"use client";

import { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { analyzeScript } from "@/lib/scriptAnalyzer";
import { runScript, type SocketHandle } from "@/lib/scriptRunner";
import { composeScript } from "@/lib/composeScript";
import { selectCode } from "@/store/editorSlice";
import {
  selectEnvVars,
  selectActiveEnv,
  selectActiveHooks,
} from "@/store/collectionsSlice";
import {
  selectBuiltCalls,
  selectRunning,
  selectStepMode,
  setBuiltCalls,
  setRunning,
  setPaused,
  setExtractedVars,
  setAssertions,
  updateCallsAndLogs,
} from "@/store/runnerSlice";
import { selectActiveId } from "@/store/collectionsSlice";
import { selectCallTimeout } from "@/store/uiSlice";

export function useScriptRunner() {
  const dispatch = useDispatch();
  const code = useSelector(selectCode);
  const envVars = useSelector(selectEnvVars);
  const activeEnv = useSelector(selectActiveEnv);
  const hooks = useSelector(selectActiveHooks);
  const builtCalls = useSelector(selectBuiltCalls);
  const running = useSelector(selectRunning);
  const activeId = useSelector(selectActiveId);
  const stepMode = useSelector(selectStepMode);
  const callTimeout = useSelector(selectCallTimeout);

  const stepResumeRef = useRef<(() => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const socketRegistryRef = useRef<Map<number, SocketHandle>>(new Map());

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

    // A socket opened by the previous run can outlive that run's script
    // (nothing awaits it closing) — close any still open before starting a
    // fresh one, since there's no other UI affordance to reach it once its
    // run has finished.
    for (const handle of socketRegistryRef.current.values()) handle.close();
    socketRegistryRef.current = new Map();

    const runItemId = activeId;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Fold the active collection's pre-run / post-run hooks around the item
    // script — one source string for both the card preview and the run.
    const script = composeScript({
      preRun: hooks.preRun,
      code,
      postRun: hooks.postRun,
    });

    dispatch(setRunning(true));
    dispatch(
      setBuiltCalls(
        analyzeScript(script, envVars).map((c, i) => ({
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

    const { extractedVars, assertions } = await runScript(
      script,
      { ...envVars, current: activeEnv?.name ?? "" },
      (calls, logs) =>
        dispatch(updateCallsAndLogs({ calls, logs, itemId: runItemId })),
      stepMode ? waitForNext : undefined,
      Object.keys(callCache).length > 0 ? callCache : undefined,
      callTimeout > 0 ? callTimeout : undefined,
      controller.signal,
      socketRegistryRef.current,
    );

    stepResumeRef.current = null;
    abortControllerRef.current = null;
    if (Object.keys(extractedVars).length > 0)
      dispatch(setExtractedVars(extractedVars));
    if (assertions.length > 0) dispatch(setAssertions(assertions));
    dispatch(setRunning(false));
  }, [
    running,
    code,
    envVars,
    activeEnv,
    hooks,
    builtCalls,
    activeId,
    stepMode,
    callTimeout,
    waitForNext,
    dispatch,
  ]);

  const sendSocketMessage = useCallback((idx: number, text: string) => {
    socketRegistryRef.current.get(idx)?.send(text);
  }, []);

  const closeSocketConnection = useCallback((idx: number) => {
    socketRegistryRef.current.get(idx)?.close();
  }, []);

  return { onRun, onNext, onStop, sendSocketMessage, closeSocketConnection };
}
