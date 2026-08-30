"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Download,
  Upload,
  BarChart2,
  Copy,
  FolderUp,
  FolderDown,
  SquareTerminal,
} from "lucide-react";
import type { Theme } from "@/lib/themes";
import * as ui from "@/lib/ui";
import { selectCode, setCode } from "@/store/editorSlice";
import {
  selectCollections,
  selectActiveId,
  addItem,
  importCollections,
} from "@/store/collectionsSlice";
import { setSidebarTab } from "@/store/uiSlice";
import { downloadBlob, pickFile, readFileText } from "@/lib/fileUtils";
import { parseCurl, curlToScript } from "@/lib/curlParser";
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
 *  instead of each tile owning its own border. */
const FILE_LIST =
  "flex flex-col overflow-hidden rounded-md border border-app-border divide-y divide-app-border";

export default function FilePane({}: Props) {
  const dispatch = useDispatch();
  const code = useSelector(selectCode);
  const collections = useSelector(selectCollections);
  const activeId = useSelector(selectActiveId);
  const [pendingAction, setPendingAction] = useState<(typeof ACTIONS)[number] | null>(null);
  const [curlOpen, setCurlOpen] = useState(false);

  const targetCollectionId = (() => {
    if (activeId) {
      const owner = collections.find((c) =>
        c.items.some((i) => i.id === activeId),
      );
      if (owner) return owner.id;
    }
    return collections[0]?.id ?? null;
  })();

  const onSaveScript = () => {
    const activeName = activeId
      ? collections.flatMap((c) => c.items).find((i) => i.id === activeId)?.name
      : "script";
    const safe = (activeName || "script")
      .replace(/[^\w\-]+/g, "_")
      .toLowerCase();
    downloadBlob(`${safe}.ts`, code, "text/typescript");
  };

  const onImportScript = async () => {
    const file = await pickFile(
      ".ts,.js,.txt,text/typescript,text/javascript,text/plain",
    );
    if (!file) return;
    const text = await readFileText(file);
    dispatch(setCode(text));
    if (targetCollectionId) {
      dispatch(
        addItem({
          collectionId: targetCollectionId,
          name: file.name.replace(/\.[^.]+$/, ""),
          method: "GET",
          code: text,
        }),
      );
      dispatch(setSidebarTab("collections"));
    }
  };

  const onExportCollection = () => {
    const json = JSON.stringify({ collections }, null, 2);
    downloadBlob(
      `bulky-collections-${Date.now()}.json`,
      json,
      "application/json",
    );
  };

  const onImportCollection = async () => {
    const file = await pickFile(".json,application/json");
    if (!file) return;
    try {
      const text = await readFileText(file);
      const json = JSON.parse(text);
      // Restore collections
      const imported = json.collections
        ? json.collections
        : Array.isArray(json)
          ? json
          : [json];

      // Handle legacy format with top-level environments
      if (json.environments?.length) {
        for (const col of imported) {
          if (!col.environments || col.environments.length === 0) {
            col.environments = JSON.parse(JSON.stringify(json.environments));
            col.envIdx = json.envIdx || 0;
          }
        }
      }

      dispatch(importCollections(imported));
      dispatch(setSidebarTab("collections"));
    } catch {
      alert("Failed to parse collection JSON.");
    }
  };

  const onImportCurl = (input: string) => {
    const parsed = parseCurl(input);
    if (!parsed) {
      alert("Could not parse curl command.");
      return;
    }
    const script = curlToScript(parsed);
    if (targetCollectionId) {
      const u = new URL(parsed.url);
      const name = `${parsed.method} ${u.pathname || u.host}`.slice(0, 40);
      dispatch(
        addItem({
          collectionId: targetCollectionId,
          name,
          method: parsed.method,
          code: script,
        }),
      );
      dispatch(setSidebarTab("collections"));
    } else {
      dispatch(setCode(script));
    }
  };

  const ACTIONS = [
    {
      icon: Download,
      label: "Save Script",
      sub: "Export current script as .ts",
      tone: TONES.save,
      onClick: onSaveScript,
    },
    {
      icon: Upload,
      label: "Import Script",
      sub: "Load a .ts or .js automation file",
      tone: TONES.load,
      onClick: onImportScript,
    },
    {
      icon: FolderDown,
      label: "Export Collection",
      sub: "Save all collections as JSON",
      tone: TONES.json,
      onClick: onExportCollection,
    },
    {
      icon: FolderUp,
      label: "Import Collection",
      sub: "Load collections from JSON",
      tone: TONES.json,
      onClick: onImportCollection,
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
            onImportCurl(command);
            setCurlOpen(false);
          }}
          onClose={() => setCurlOpen(false)}
        />
      )}
    </div>
  );
}
