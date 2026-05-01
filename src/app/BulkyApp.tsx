"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SlidersHorizontal, Maximize2, Minimize2 } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";
import { THEMES } from "@/lib/themes";
import { analyzeScript } from "@/lib/scriptAnalyzer";
import { useScriptRunner } from "@/hooks/useScriptRunner";
import { selectTheme, selectTweaksOpen, setTweaksOpen, selectViewByItemId, setResponseView } from "@/store/uiSlice";
import { selectCode, setCode } from "@/store/editorSlice";
import { selectEnvVars, selectActiveEnv } from "@/store/environmentSlice";
import {
  selectBuiltCalls,
  selectRunning,
  selectStepMode,
  selectPaused,
  syncAnalyzedCalls,
  switchToItem,
  setStepMode,
} from "@/store/runnerSlice";
import { selectActiveId, selectActiveItem, saveItemCode } from "@/store/collectionsSlice";
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
  const viewByItemId = useSelector(selectViewByItemId);
  const code = useSelector(selectCode);
  const envVars = useSelector(selectEnvVars);
  const activeEnv = useSelector(selectActiveEnv);
  const builtCalls = useSelector(selectBuiltCalls);
  const running = useSelector(selectRunning);
  const activeId = useSelector(selectActiveId);
  const activeItem = useSelector(selectActiveItem);
  const stepMode = useSelector(selectStepMode);
  const paused = useSelector(selectPaused);

  const { onRun, onNext, onStop } = useScriptRunner();
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  const T = THEMES[theme] || THEMES.ocean;
  const [sidebarSize, setSidebarSize] = useState(20);

  // Flag: skip syncAnalyzedCalls when code change comes from an item switch
  const isSwitchingItemRef = useRef(false);

  // Debounce analyze on code/env change (skip during run or item switch)
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const switching = isSwitchingItemRef.current;
    isSwitchingItemRef.current = false;
    if (running || switching) return;
    clearTimeout(analyzeTimerRef.current ?? undefined);
    analyzeTimerRef.current = setTimeout(() => {
      dispatch(syncAnalyzedCalls(analyzeScript(code, envVars)));
    }, 300);
    return () => clearTimeout(analyzeTimerRef.current ?? undefined);
  }, [code, envVars, running, dispatch]);

  // When activeId switches: load the item's code and restore its stored call results
  const prevActiveIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeId && activeId !== prevActiveIdRef.current) {
      prevActiveIdRef.current = activeId;
      if (activeItem) {
        isSwitchingItemRef.current = true;
        dispatch(setCode(activeItem.code));
        dispatch(switchToItem({
          itemId: activeId,
          analyzedCalls: analyzeScript(activeItem.code, envVars),
        }));
        dispatch(setResponseView(viewByItemId[activeId] ?? 'cards'));
      }
    } else if (!activeId) {
      prevActiveIdRef.current = null;
      dispatch(switchToItem({ itemId: null, analyzedCalls: [] }));
    }
  }, [activeId, activeItem, envVars, dispatch, viewByItemId]);

  // Debounce syncing code edits back to active collection item
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!activeId) return;
    clearTimeout(saveTimerRef.current ?? undefined);
    saveTimerRef.current = setTimeout(() => {
      dispatch(saveItemCode({ itemId: activeId, code }));
    }, 400);
    return () => clearTimeout(saveTimerRef.current ?? undefined);
  }, [code, activeId, dispatch]);

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
        <img
          src="/favicon.svg"
          alt="Bulky API"
          width={22}
          height={22}
          style={{ flexShrink: 0, borderRadius: 5 }}
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
          {activeEnv?.name ?? '—'}
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
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          style={{
            background: T.bgHover,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            padding: "4px 8px",
            color: T.textDim,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            transition: "all 0.15s",
          }}
        >
          {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
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
          <ResizablePanel defaultSize={1500} minSize={500}>
            <CodeEditor
              T={T}
              onRun={onRun}
              onNext={onNext}
              onStop={onStop}
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
