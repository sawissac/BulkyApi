"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SlidersHorizontal } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { analyzeScript } from "@/lib/scriptAnalyzer";
import { runScript } from "@/lib/scriptRunner";
import { selectTheme, selectTweaksOpen, setTweaksOpen } from "@/store/uiSlice";
import { selectCode } from "@/store/editorSlice";
import { selectEnvVars, selectActiveEnv } from "@/store/environmentSlice";
import {
  selectBuiltCalls,
  selectRunning,
  selectStepMode,
  selectPaused,
  setBuiltCalls,
  setRunning,
  setStepMode,
  setPaused,
  updateCallsAndLogs,
} from "@/store/runnerSlice";
import { selectActiveId, saveItemCode } from "@/store/collectionsSlice";
import Sidebar from "@/features/sidebar/components/Sidebar";
import CodeEditor from "@/features/code-editor/components/CodeEditor";
import ResponsePanel from "@/features/response-panel/components/ResponsePanel";
import TweaksPanel from "@/features/tweaks/components/TweaksPanel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export default function BulkyApp() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const tweaksOpen = useSelector(selectTweaksOpen);
  const code = useSelector(selectCode);
  const envVars = useSelector(selectEnvVars);
  const activeEnv = useSelector(selectActiveEnv);
  const builtCalls = useSelector(selectBuiltCalls);
  const running = useSelector(selectRunning);
  const activeId = useSelector(selectActiveId);
  const stepMode = useSelector(selectStepMode);
  const paused = useSelector(selectPaused);

  const T = THEMES[theme] || THEMES.ocean;
  const [sidebarSize, setSidebarSize] = useState(20);

  // Holds resolve fn for current step pause
  const stepResumeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!running) {
      dispatch(setBuiltCalls(analyzeScript(code, envVars)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, envVars]);

  // Sync code edits back to active collection item
  useEffect(() => {
    if (activeId) dispatch(saveItemCode({ itemId: activeId, code }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, activeId]);

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

  const onRun = useCallback(async () => {
    if (running) return;
    dispatch(setRunning(true));

    dispatch(
      setBuiltCalls(
        analyzeScript(code, envVars).map((c) => ({
          ...c,
          status: "pending" as const,
        })),
      ),
    );

    await runScript(
      code,
      envVars,
      (calls, logs) => dispatch(updateCallsAndLogs({ calls, logs })),
      stepMode ? waitForNext : undefined,
    );

    // If step mode ended with a pending resume (script error mid-step), clear it
    stepResumeRef.current = null;
    dispatch(setRunning(false));
  }, [running, code, envVars, dispatch, stepMode, waitForNext]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        background: T.bg,
        color: T.text,
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px",
          height: 44,
          background: T.bgSidebar,
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: T.cyan,
            boxShadow: `0 0 8px ${T.cyan}`,
            animation: "glow 2s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: T.textBright,
          }}
        >
          Bulky API
        </span>
        <div style={{ height: 14, width: 1, background: T.border }} />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: T.textDim,
            padding: "2px 8px",
            borderRadius: 4,
            border: `1px solid ${T.border}`,
            background: T.bgHover,
          }}
        >
          {activeEnv?.name}
        </span>
        <div style={{ flex: 1 }} />
        {running && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 9999,
              background: T.cyanFaint,
              border: `1px solid ${T.borderAccent}`,
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: paused ? T.warn : T.cyan,
                animation: paused ? "none" : "pulse 0.7s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: paused ? T.warn : T.cyanDim,
              }}
            >
              {paused ? "PAUSED" : "RUNNING"}
            </span>
          </div>
        )}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: T.textDim,
          }}
        >
          {builtCalls.length} calls
        </span>
        <button
          onClick={() => dispatch(setTweaksOpen(!tweaksOpen))}
          style={{
            background: T.bgHover,
            border: `1px solid ${tweaksOpen ? T.borderAccent : T.border}`,
            borderRadius: 6,
            padding: "4px 8px",
            color: tweaksOpen ? T.cyan : T.textDim,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            transition: "all 0.15s",
          }}
        >
          <SlidersHorizontal size={12} />
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.07em",
            }}
          >
            Tweaks
          </span>
        </button>
      </div>

      {/* 3-pane layout */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        <ResizablePanelGroup
          orientation="horizontal"
          style={{ height: "100%" }}
        >
          <ResizablePanel
            defaultSize={100}
            minSize={300}
            maxSize={500}
            onResize={(s) => setSidebarSize(s.asPercentage)}
          >
            <Sidebar T={T} narrow={sidebarSize < 18} />
          </ResizablePanel>
          <ResizableHandle
            withHandle
            style={{ background: T.border, width: 1 }}
            className="[&>div]:bg-current [&>div]:h-8 [&>div]:w-[3px] [&>div]:rounded-full"
          />
          <ResizablePanel defaultSize={1000}>
            <CodeEditor
              T={T}
              onRun={onRun}
              onNext={onNext}
              running={running}
              stepMode={stepMode}
              paused={paused}
              onToggleStep={() => dispatch(setStepMode(!stepMode))}
            />
          </ResizablePanel>
          <ResizableHandle
            withHandle
            style={{ background: T.border, width: 1 }}
            className="[&>div]:bg-current [&>div]:h-8 [&>div]:w-[3px] [&>div]:rounded-full"
          />
          <ResizablePanel defaultSize={100} minSize={300} maxSize={500}>
            <ResponsePanel T={T} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {tweaksOpen && <TweaksPanel T={T} />}
    </div>
  );
}
