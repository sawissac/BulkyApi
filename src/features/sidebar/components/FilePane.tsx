"use client";

import { useState } from "react";
import {
  Download,
  Upload,
  FolderUp,
  FolderDown,
  SquareTerminal,
} from "lucide-react";
import type { Theme } from "@/lib/themes";
import * as ui from "@/lib/ui";
import { useFileActions } from "@/hooks/useFileActions";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ConfirmDialog";
import CurlImportDialog from "./CurlImportDialog";

type Props = { T: Theme };

/**
 * Each action gets its own accent so the list reads as a set of color blocks
 * rather than five identical rows. All four are theme tokens — the previous
 * hardcoded violet was unreadable on light themes.
 */
const TONES = {
  save: "var(--app-success)",
  load: "var(--app-accent)",
  json: "var(--app-warn)",
  curl: "var(--method-patch)",
} as const;

/** Action list: one bordered card, single column. `overflow-hidden` clips
 *  the first/last tile to its radius; `divide-y` draws the row separators
 *  instead of each tile owning its own border. `bg-app-panel` backs it solid
 *  so the pane's dot-grid texture doesn't bleed through the card. */
const FILE_LIST =
  "flex flex-col overflow-hidden rounded-md border border-app-border bg-app-panel divide-y divide-app-border";

/**
 * Sidebar pane listing the collection file actions — save/import a script,
 * export/import the collection set, import a request from a curl command.
 *
 * @remarks
 * Status: stable — Type: pane
 *
 * State & behavior: the action callbacks live in {@link useFileActions} (shared
 * with the command palette); this pane only owns the two dialogs in front of
 * them — `pendingAction` gates a {@link ConfirmDialog} for every non-curl
 * action, `curlOpen` gates {@link CurlImportDialog}. Import from cURL skips the
 * confirm because its own dialog is the confirmation step.
 *
 * Variants: none — the five rows are fixed.
 *
 * Composition: a bordered `FILE_LIST` card of `ui.actionCard` tiles, each a
 * tooltip trigger; {@link ConfirmDialog} and {@link CurlImportDialog} mount on
 * demand.
 *
 * Accessibility: each tile is a button labelled by its visible title, with the
 * sub-line repeated as a tooltip.
 *
 * Test ids: none.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` tokens plus the
 * `ui.*` recipes.
 *
 * Edge cases: with no collection to import into, {@link useFileActions} loads
 * an imported script into the editor buffer only, without adding an item.
 *
 * Dependencies: `lucide-react`, `@/hooks/useFileActions`, `@/lib/ui`,
 * `@/components/ui/tooltip`, `@/components/ConfirmDialog`,
 * `./CurlImportDialog`.
 *
 * @example
 * ```tsx
 * <FilePane T={theme} />
 * ```
 */
export default function FilePane({}: Props) {
  const fileActions = useFileActions();
  const [pendingAction, setPendingAction] = useState<
    (typeof ACTIONS)[number] | null
  >(null);
  const [curlOpen, setCurlOpen] = useState(false);

  const ACTIONS = [
    {
      icon: Download,
      label: "Save Script",
      sub: "Export current script as .ts",
      tone: TONES.save,
      onClick: fileActions.saveScript,
    },
    {
      icon: Upload,
      label: "Import Script",
      sub: "Load a .ts or .js automation file",
      tone: TONES.load,
      onClick: fileActions.importScript,
    },
    {
      icon: FolderDown,
      label: "Export Collection",
      sub: "Save all collections as JSON",
      tone: TONES.json,
      onClick: fileActions.exportCollection,
    },
    {
      icon: FolderUp,
      label: "Import Collection",
      sub: "Load collections from JSON",
      tone: TONES.json,
      onClick: fileActions.importCollection,
    },
    {
      icon: SquareTerminal,
      label: "Import from cURL",
      sub: "Paste a curl command",
      tone: TONES.curl,
      onClick: () => setCurlOpen(true),
    },
  ];

  return (
    <div className="flex flex-col gap-1.5 p-2.5">
      <h2 className={`${ui.label} mb-1`}>File Actions</h2>

      <div className={FILE_LIST}>
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          const isCurl = a.label === "Import from cURL";
          return (
            <Tooltip key={a.label}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => (isCurl ? a.onClick() : setPendingAction(a))}
                  style={{ color: a.tone }}
                  className={`${ui.actionCard} w-full`}
                >
                  <span className={ui.actionCardIcon}>
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className={ui.actionCardTitle}>{a.label}</span>
                    <span className={ui.actionCardSub}>{a.sub}</span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{a.sub}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {pendingAction && (
        <ConfirmDialog
          title={pendingAction.label}
          message={pendingAction.sub}
          confirmLabel={pendingAction.label.split(" ")[0]}
          tone={pendingAction.tone}
          onConfirm={() => {
            pendingAction.onClick();
            setPendingAction(null);
          }}
          onClose={() => setPendingAction(null)}
        />
      )}

      {curlOpen && (
        <CurlImportDialog
          onImport={(command) => {
            fileActions.importCurl(command);
            setCurlOpen(false);
          }}
          onClose={() => setCurlOpen(false)}
        />
      )}
    </div>
  );
}
