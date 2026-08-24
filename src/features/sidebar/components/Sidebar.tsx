"use client";

import { useSelector } from "react-redux";
import type { Theme } from "@/lib/themes";
import { selectSidebarTab, type SidebarTab } from "@/store/uiSlice";
import CollPane from "./CollPane";
import EnvPane from "./EnvPane";
import VarsPane from "./VarsPane";
import FilePane from "./FilePane";

const PANE_LABELS: Record<SidebarTab, string> = {
  collections: "Tests",
  env: "Envs",
  vars: "Vars",
  file: "File",
};

/**
 * Body of the left pane: renders the pane the active section owns — collections,
 * environments, extracted variables, or file import/export. Section switching
 * lives in {@link ActivityRail}, not here, so this component only reads which
 * tab is selected; each pane supplies its own header.
 *
 * @remarks
 * Status: stable — Type: layout container
 *
 * State & behavior: holds no local state; the active tab comes from `uiSlice`.
 * Exactly one pane is mounted at a time, so a pane's own local state resets
 * when the user leaves and returns to it.
 *
 * Variants: one per `SidebarTab` — `collections`, `env`, `vars`, `file`.
 *
 * Composition: renders {@link CollPane}, {@link EnvPane}, {@link VarsPane} or
 * {@link FilePane}, each handed the active theme. Sits inside the resizable
 * pane group and fills it edge to edge — no title strip of its own.
 *
 * Accessibility: the pane body is the `tabpanel` for the rail's tablist and
 * carries `id="sidebar-pane"`, the target of each tab's `aria-controls`. Its
 * `aria-label` names the active section since no visible title does.
 *
 * Test ids: pane body `sidebar-pane`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: an unknown tab value cannot render a pane; the `aria-label` falls
 * back to the collections label so the tabpanel is never unnamed.
 *
 * Dependencies: `react-redux`.
 *
 * @example
 * ```tsx
 * <ResizablePanel defaultSize="18%" minSize="15%">
 *   <Sidebar T={T} />
 * </ResizablePanel>
 * ```
 *
 * @see {@link ActivityRail}
 */
export default function Sidebar({ T }: SidebarProps) {
  const tab = useSelector(selectSidebarTab);
  const label = PANE_LABELS[tab] ?? PANE_LABELS.collections;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-app-sidebar">
      <div
        id="sidebar-pane"
        role="tabpanel"
        aria-label={label}
        data-testid="sidebar-pane"
        className="flex-1 overflow-y-auto"
      >
        {tab === "collections" && <CollPane T={T} />}
        {tab === "env" && <EnvPane T={T} />}
        {tab === "vars" && <VarsPane T={T} />}
        {tab === "file" && <FilePane T={T} />}
      </div>
    </div>
  );
}

export type SidebarProps = {
  /** Active theme, forwarded to whichever pane is mounted. */
  T: Theme;
};
