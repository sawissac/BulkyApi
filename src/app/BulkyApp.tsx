"use client";

import { useEffect, useCallback, useState } from "react";
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
  setBuiltCalls,
  setRunning,
  updateCallsAndLogs,
} from "@/store/runnerSlice";
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

  const T = THEMES[theme] || THEMES.ocean;
  const [sidebarSize, setSidebarSize] = useState(20);

  // Re-analyze on code/env change (not during a run)
  useEffect(() => {
    if (!running) {
      dispatch(setBuiltCalls(analyzeScript(code, envVars)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, envVars]);

  const onRun = useCallback(async () => {
    if (running) return;
    dispatch(setRunning(true));

    // Mark all as pending
    dispatch(
      setBuiltCalls(
        analyzeScript(code, envVars).map((c) => ({
          ...c,
          status: "pending" as const,
        })),
      ),
    );

    await runScript(code, envVars, (calls, logs) => {
      dispatch(updateCallsAndLogs({ calls, logs }));
    });

    dispatch(setRunning(false));
  }, [running, code, envVars, dispatch]);

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
                background: T.cyan,
                animation: "pulse 0.7s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: T.cyanDim,
              }}
            >
              RUNNING
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
            defaultSize={200}
            minSize={100}
            maxSize={300}
            onResize={(s) => setSidebarSize(s.asPercentage)}
          >
            <Sidebar T={T} narrow={sidebarSize < 18} />
          </ResizablePanel>
          <ResizableHandle
            withHandle
            style={{ background: T.border, width: 1 }}
            className="[&>div]:bg-current [&>div]:h-8 [&>div]:w-[3px] [&>div]:rounded-full"
          />
          <ResizablePanel defaultSize={50} minSize={25}>
            <CodeEditor T={T} onRun={onRun} running={running} />
          </ResizablePanel>
          <ResizableHandle
            withHandle
            style={{ background: T.border, width: 1 }}
            className="[&>div]:bg-current [&>div]:h-8 [&>div]:w-[3px] [&>div]:rounded-full"
          />
          <ResizablePanel defaultSize={200} minSize={100} maxSize={300}>
            <ResponsePanel T={T} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {tweaksOpen && <TweaksPanel T={T} />}
    </div>
  );
}
