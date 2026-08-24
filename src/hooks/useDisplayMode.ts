"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectDisplayMode,
  setDisplayMode,
  type DisplayMode,
} from "@/store/uiSlice";

function subscribe(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

const isDocumentFullscreen = () => Boolean(document.fullscreenElement);
const isServerFullscreen = () => false;

/**
 * Reads the current display mode and switches between fullscreen and URL view.
 *
 * `mode` is the display mode in force and `isFullscreen` is what the document
 * is actually doing; the two agree, because nothing sets the mode except a real
 * fullscreen transition. Every load starts in URL view — `hydrateUi` resets the
 * persisted value, since a fresh page can never already own the screen — so
 * fullscreen is only ever entered by the user asking for it.
 *
 * Leaving fullscreen by any route (Esc, F11, the OS) writes `browser` back to
 * the store, keeping the mode honest about what the window is doing.
 */
export function useDisplayMode() {
  const dispatch = useDispatch();
  const mode = useSelector(selectDisplayMode);
  const isFullscreen = useSyncExternalStore(
    subscribe,
    isDocumentFullscreen,
    isServerFullscreen,
  );

  useEffect(() => {
    const onChange = () =>
      dispatch(setDisplayMode(isDocumentFullscreen() ? "fullscreen" : "browser"));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [dispatch]);

  const apply = useCallback(
    async (next: DisplayMode) => {
      dispatch(setDisplayMode(next));
      if (next === "fullscreen") {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
      } else if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
    },
    [dispatch],
  );

  return { mode, isFullscreen, apply };
}
