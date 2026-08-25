"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { THEMES, themeVars } from "@/lib/themes";
import { analyzeScript } from "@/lib/scriptAnalyzer";
import { useScriptRunner } from "@/hooks/useScriptRunner";
import {
  selectTheme,
  selectTweaksOpen,
  selectViewByItemId,
  setResponseView,
  selectLayout,
} from "@/store/uiSlice";
import { selectCode, setCode } from "@/store/editorSlice";
import { selectEnvVars } from "@/store/collectionsSlice";
import {
  selectRunning,
  selectStepMode,
  selectPaused,
  syncAnalyzedCalls,
  switchToItem,
  setStepMode,
} from "@/store/runnerSlice";
import {
  selectActiveId,
  selectActiveItem,
  saveItemCode,
} from "@/store/collectionsSlice";
import ActivityRail from "@/features/sidebar/components/ActivityRail";
import Sidebar from "@/features/sidebar/components/Sidebar";
import CodeEditor from "@/features/code-editor/components/CodeEditor";
import ResponsePanel from "@/features/response-panel/components/ResponsePanel";
import TweaksPanel from "@/features/tweaks/components/TweaksPanel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

const LAYOUT_SIZES = {
  balanced: { side: "25%", editor: "50%", resp: "25%" },
  "editor-focus": { side: "18%", editor: "64%", resp: "18%" },
  "response-focus": { side: "18%", editor: "32%", resp: "50%" },
} as const;

const HANDLE =
  "w-3 bg-transparent text-app-border transition-colors duration-200 hover:text-app-border-accent " +
  "data-[resize-handle-active]:text-app-accent [&>div]:h-8 [&>div]:w-[3px] [&>div]:rounded-full [&>div]:bg-current";

const PANE = "h-full w-full overflow-hidden rounded-xl border border-app-border";

/**
 * Application shell: a fixed vertical rail on the left, then three resizable
 * panes — sidebar, script editor, response panel — filling the rest of the
 * viewport. It owns the wiring between the active collection item, the editor
 * buffer and the runner, and mounts the tweaks panel when it is open. This is
 * the only place that composes those pieces; individual panes are mounted
 * nowhere else.
 *
 * @remarks
 * Status: stable — Type: page shell
 *
 * State & behavior: no local state. Four effects do the work. The first mirrors
 * the active theme's variables onto `<html>` so portalled UI (dialogs, tweaks
 * panel) and document chrome (scrollbars) read the same tokens as the app root;
 * the inline `style` on the root applies them again so the very first paint is
 * already themed and does not flash. The second re-analyzes the script 300ms
 * after the code or environment settles, skipping analysis while a run is in
 * flight and on the render that follows an item switch — `isSwitchingItemRef`
 * carries that flag, since the code change there comes from the store, not the
 * user. The third loads an item's code and restores its stored call results
 * when `activeId` changes, and clears the runner when nothing is active. The
 * fourth writes edits back to the active item 400ms after typing stops.
 *
 * Variants: pane sizes follow the `layout` setting — `balanced`,
 * `editor-focus`, `response-focus`. Changing it remounts the panel group by
 * key, which is what resets panes a user has dragged.
 *
 * Composition: renders {@link ActivityRail}, {@link Sidebar},
 * {@link CodeEditor}, {@link ResponsePanel} and, when open,
 * {@link TweaksPanel}. Expects the Redux provider above it.
 *
 * Accessibility: the pane group is the page's `main` landmark; the rail
 * provides the `nav` landmark. Resize handles come from the resizable
 * primitives and are keyboard-operable.
 *
 * Test ids: none of its own — the rail, panes and tweaks panel carry theirs.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases:
 * - Unknown `layout` value falls back to `editor-focus` sizing.
 * - No active item → the runner is cleared and the editor keeps the last buffer.
 * - Both debounce timers are cleared on unmount, so a pending analyze or save
 *   cannot dispatch after teardown.
 *
 * Dependencies: `react-redux`, internal `useScriptRunner` hook, `analyzeScript`.
 *
 * @example
 * ```tsx
 * export default function Page() {
 *   return (
 *     <Providers>
 *       <BulkyApp />
 *     </Providers>
 *   );
 * }
 * ```
 *
 * @see {@link ActivityRail}
 */
export default function BulkyApp() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const layout = useSelector(selectLayout);
  const tweaksOpen = useSelector(selectTweaksOpen);
  const viewByItemId = useSelector(selectViewByItemId);
  const code = useSelector(selectCode);
  const envVars = useSelector(selectEnvVars);
  const running = useSelector(selectRunning);
  const activeId = useSelector(selectActiveId);
  const activeItem = useSelector(selectActiveItem);
  const stepMode = useSelector(selectStepMode);
  const paused = useSelector(selectPaused);

  const { onRun, onNext, onStop } = useScriptRunner();

  const T = THEMES[theme] || THEMES.ocean;
  const L = LAYOUT_SIZES[layout] ?? LAYOUT_SIZES["editor-focus"];

  useEffect(() => {
    const root = document.documentElement;
    const vars = themeVars(T);
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    root.style.colorScheme = T.isLight ? "light" : "dark";
  }, [T]);

  const isSwitchingItemRef = useRef(false);

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

  const prevActiveIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeId && activeId !== prevActiveIdRef.current) {
      prevActiveIdRef.current = activeId;
      if (activeItem) {
        isSwitchingItemRef.current = true;
        dispatch(setCode(activeItem.code));
        dispatch(
          switchToItem({
            itemId: activeId,
            analyzedCalls: analyzeScript(activeItem.code, envVars),
          }),
        );
        dispatch(setResponseView(viewByItemId[activeId] ?? "cards"));
      }
    } else if (!activeId) {
      prevActiveIdRef.current = null;
      dispatch(switchToItem({ itemId: null, analyzedCalls: [] }));
    }
  }, [activeId, activeItem, envVars, dispatch, viewByItemId]);

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
      style={themeVars(T) as React.CSSProperties}
      className="flex h-screen w-screen overflow-hidden bg-app-bg font-sans text-app-text"
    >
      <ActivityRail />

      <main className="min-h-0 min-w-0 flex-1 overflow-hidden p-2">
        <ResizablePanelGroup
          key={layout}
          orientation="horizontal"
          className="h-full"
        >
          <ResizablePanel defaultSize={L.side} minSize="15%" maxSize="40%">
            <div className={PANE}>
              <Sidebar T={T} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle className={HANDLE} />
          <ResizablePanel defaultSize={L.editor} minSize="25%">
            <div className={PANE}>
              <CodeEditor
                T={T}
                onRun={onRun}
                onNext={onNext}
                onStop={onStop}
                running={running}
                paused={paused}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle className={HANDLE} />
          <ResizablePanel defaultSize={L.resp} minSize="15%" maxSize="70%">
            <div className={PANE}>
              <ResponsePanel
                T={T}
                stepMode={stepMode}
                running={running}
                onToggleStep={() => dispatch(setStepMode(!stepMode))}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      {tweaksOpen && <TweaksPanel T={T} />}
    </div>
  );
}
