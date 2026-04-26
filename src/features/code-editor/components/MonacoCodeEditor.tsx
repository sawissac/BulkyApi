"use client";

import { useEffect, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditorNS, languages, Position } from "monaco-editor";
import type { Theme } from "@/lib/themes";

export type EditorInstance = MonacoEditorNS.IStandaloneCodeEditor;

type Props = {
  value: string;
  onChange: (v: string) => void;
  envVars: Record<string, string>;
  T: Theme;
  onRun: () => void;
  onMount?: (editor: EditorInstance) => void;
};

export default function MonacoCodeEditor({
  value,
  onChange,
  envVars,
  T,
  onRun,
  onMount,
}: Props) {
  const [monaco, setMonaco] = useState<Monaco | null>(null);
  const envVarsRef = useRef(envVars);

  useEffect(() => {
    envVarsRef.current = envVars;
  }, [envVars]);

  // Define theme once Monaco is ready, re-define when theme colors change
  useEffect(() => {
    if (!monaco) return;
    monaco.editor.defineTheme("bulky", {
      base: T.isLight ? "vs" : "vs-dark",
      inherit: true,
      rules: T.isLight ? [
        { token: "comment", foreground: "94a3b8", fontStyle: "italic" },
        { token: "keyword", foreground: "0284c7" },
        { token: "string", foreground: "059669" },
        { token: "number", foreground: "ea580c" },
        { token: "regexp", foreground: "dc2626" },
        { token: "type", foreground: "7c3aed" },
        { token: "variable", foreground: "0f172a" },
        { token: "identifier", foreground: "0f172a" },
        { token: "delimiter", foreground: "64748b" },
      ] : [
        { token: "comment", foreground: "4a5568", fontStyle: "italic" },
        { token: "keyword", foreground: "67e8f9" },
        { token: "string", foreground: "86efac" },
        { token: "number", foreground: "fdba74" },
        { token: "regexp", foreground: "fca5a5" },
        { token: "type", foreground: "c4b5fd" },
        { token: "variable", foreground: "e2e8f0" },
        { token: "identifier", foreground: "e2e8f0" },
        { token: "delimiter", foreground: "64748b" },
      ],
      colors: {
        "editor.background": T.editorBg,
        "editor.foreground": T.textBright,
        "editorLineNumber.foreground": T.lineNum,
        "editorLineNumber.activeForeground": T.cyan,
        "editor.selectionBackground": `${T.cyan}22`,
        "editor.inactiveSelectionBackground": `${T.cyan}11`,
        "editor.lineHighlightBackground": T.isLight ? "#00000008" : "#ffffff05",
        "editor.lineHighlightBorder": "#00000000",
        "editorCursor.foreground": T.cyan,
        "editorGutter.background": T.gutterBg,
        "editorWidget.background": T.bgPanel,
        "editorWidget.border": T.border,
        "editorSuggestWidget.background": T.bgPanel,
        "editorSuggestWidget.border": T.border,
        "editorSuggestWidget.selectedBackground": T.bgSelected,
        "editorSuggestWidget.highlightForeground": T.cyan,
        "editorSuggestWidget.focusHighlightForeground": T.cyan,
        "list.hoverBackground": T.bgHover,
        "list.activeSelectionBackground": T.bgSelected,
        "scrollbarSlider.background": `${T.cyan}18`,
        "scrollbarSlider.hoverBackground": `${T.cyan}30`,
        "editor.findMatchBackground": `${T.cyan}30`,
        "editor.findMatchHighlightBackground": `${T.cyan}18`,
      },
    });
    monaco.editor.setTheme("bulky");
  }, [monaco, T]);

  // Env var + api.* completions — registered once, read envVars via ref
  useEffect(() => {
    if (!monaco) return;

    const apiSnippets = [
      { label: "api.get", insert: "api.get('${1:url}')" },
      { label: "api.post", insert: "api.post('${1:url}', { $2 })" },
      { label: "api.put", insert: "api.put('${1:url}', { $2 })" },
      { label: "api.patch", insert: "api.patch('${1:url}', { $2 })" },
      { label: "api.delete", insert: "api.delete('${1:url}')" },
      { label: "api.options", insert: "api.options('${1:url}')" },
      { label: "api.server.get", insert: "api.server.get('${1:url}')" },
      { label: "api.server.post", insert: "api.server.post('${1:url}', { $2 })" },
      { label: "api.server.put", insert: "api.server.put('${1:url}', { $2 })" },
      { label: "api.server.patch", insert: "api.server.patch('${1:url}', { $2 })" },
      { label: "api.server.delete", insert: "api.server.delete('${1:url}')" },
      { label: "api.server.options", insert: "api.server.options('${1:url}')" },
    ];

    const disp = monaco.languages.registerCompletionItemProvider("javascript", {
      triggerCharacters: [".", "{"],
      provideCompletionItems(model: MonacoEditorNS.ITextModel, position: Position) {
        const line = model.getLineContent(position.lineNumber);
        const before = line.substring(0, position.column - 1);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column,
          endColumn: position.column,
        };
        const suggestions: languages.CompletionItem[] = [];

        if (before.endsWith("env.")) {
          for (const [k, v] of Object.entries(envVarsRef.current)) {
            suggestions.push({
              label: k,
              kind: monaco.languages.CompletionItemKind.Variable,
              detail: v ? `"${v}"` : "(empty)",
              insertText: k,
              range,
            } as languages.CompletionItem);
          }
        }

        if (before.endsWith("{{")) {
          for (const [k, v] of Object.entries(envVarsRef.current)) {
            suggestions.push({
              label: k,
              kind: monaco.languages.CompletionItemKind.Variable,
              detail: v ? `"${v}"` : "(empty)",
              insertText: `${k}}}`,
              range,
            } as languages.CompletionItem);
          }
        }

        if (before.endsWith("api.")) {
          for (const s of apiSnippets) {
            if (s.label.startsWith("api.server.")) continue;
            const method = s.label.split(".")[1].toUpperCase();
            suggestions.push({
              label: s.label,
              kind: monaco.languages.CompletionItemKind.Function,
              detail: `HTTP ${method}`,
              insertText: s.insert.replace("api.", ""),
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            } as languages.CompletionItem);
          }
        }

        if (before.endsWith("api.server.")) {
          for (const s of apiSnippets) {
            if (!s.label.startsWith("api.server.")) continue;
            const method = s.label.split(".")[2].toUpperCase();
            suggestions.push({
              label: s.label,
              kind: monaco.languages.CompletionItemKind.Function,
              detail: `Server HTTP ${method}`,
              insertText: s.insert.replace("api.server.", ""),
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
            } as languages.CompletionItem);
          }
        }

        return { suggestions };
      },
    });

    return () => disp.dispose();
  }, [monaco]);

  return (
    <Editor
      height="100%"
      defaultLanguage="javascript"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      theme="bulky"
      options={{
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "off",
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "line",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        formatOnPaste: true,
        tabSize: 2,
        insertSpaces: true,
        snippetSuggestions: "top",
        suggest: { snippetsPreventQuickSuggestions: false },
        quickSuggestions: { other: true, comments: false, strings: true },
        fixedOverflowWidgets: true,
      }}
      beforeMount={(m) => setMonaco(m)}
      onMount={(editor, monacoInstance) => {
        editor.addCommand(
          monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
          onRun,
        );
        onMount?.(editor);
      }}
    />
  );
}
