# Graph Report - BulkyApi  (2026-08-25)

## Corpus Check
- 78 files · ~43,703 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 664 nodes · 1100 edges · 94 communities (31 shown, 63 thin omitted)
- Extraction: 96% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `14c636f7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Response Panel Components & Props|Response Panel Components & Props]]
- [[_COMMUNITY_Layout & Display Modes|Layout & Display Modes]]
- [[_COMMUNITY_App Bootstrap & Providers|App Bootstrap & Providers]]
- [[_COMMUNITY_Error Boundary & Mock Fixtures|Error Boundary & Mock Fixtures]]
- [[_COMMUNITY_Sidebar Dialogs & Panes|Sidebar Dialogs & Panes]]
- [[_COMMUNITY_Code Editor & Method Detail|Code Editor & Method Detail]]
- [[_COMMUNITY_Sidebar & Curl Parsing|Sidebar & Curl Parsing]]
- [[_COMMUNITY_Response Panel Tab Set|Response Panel Tab Set]]
- [[_COMMUNITY_Code Editor State Wiring|Code Editor State Wiring]]
- [[_COMMUNITY_Redux Store Architecture|Redux Store Architecture]]
- [[_COMMUNITY_SSE Response Parsing|SSE Response Parsing]]
- [[_COMMUNITY_File Import & Curl Parsing|File Import & Curl Parsing]]
- [[_COMMUNITY_Project Docs & Dependencies|Project Docs & Dependencies]]
- [[_COMMUNITY_Persistence & Improvement Notes|Persistence & Improvement Notes]]
- [[_COMMUNITY_BulkyApp Debounce & Improvements|BulkyApp Debounce & Improvements]]
- [[_COMMUNITY_State Hydration Flow|State Hydration Flow]]
- [[_COMMUNITY_UI Primitives & Mock Gallery|UI Primitives & Mock Gallery]]
- [[_COMMUNITY_Script Runner Hook|Script Runner Hook]]
- [[_COMMUNITY_Activity Rail & Display Mode Hooks|Activity Rail & Display Mode Hooks]]
- [[_COMMUNITY_Redux Reducers & Mock Store|Redux Reducers & Mock Store]]
- [[_COMMUNITY_Proxy Route & Security Notes|Proxy Route & Security Notes]]
- [[_COMMUNITY_Service Worker Shell Cache|Service Worker Shell Cache]]
- [[_COMMUNITY_Call Sync & Item Switching|Call Sync & Item Switching]]
- [[_COMMUNITY_Home Page Entry|Home Page Entry]]
- [[_COMMUNITY_removeItem Cross-Slice Cleanup|removeItem Cross-Slice Cleanup]]
- [[_COMMUNITY_Brand Marks|Brand Marks]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PWA Manifest|PWA Manifest]]
- [[_COMMUNITY_SSE Event Components|SSE Event Components]]
- [[_COMMUNITY_Button Group Separator|Button Group Separator]]
- [[_COMMUNITY_Runner Slice Pruning|Runner Slice Pruning]]
- [[_COMMUNITY_Keyboard Shortcuts|Keyboard Shortcuts]]
- [[_COMMUNITY_Next.js Type Reference|Next.js Type Reference]]
- [[_COMMUNITY_PostCSS Config Note|PostCSS Config Note]]
- [[_COMMUNITY_Test Case Concept|Test Case Concept]]
- [[_COMMUNITY_Boom Debug Marker|Boom Debug Marker]]
- [[_COMMUNITY_Button Group Text|Button Group Text]]
- [[_COMMUNITY_Resizable Panel|Resizable Panel]]
- [[_COMMUNITY_Resizable Handle|Resizable Handle]]
- [[_COMMUNITY_Tooltip Provider|Tooltip Provider]]
- [[_COMMUNITY_ClassName Merge Util|ClassName Merge Util]]
- [[_COMMUNITY_Cached Entry Type|Cached Entry Type]]
- [[_COMMUNITY_Call Options Type|Call Options Type]]
- [[_COMMUNITY_Call Status Type|Call Status Type]]
- [[_COMMUNITY_Label Style Recipe|Label Style Recipe]]
- [[_COMMUNITY_Meta Style Recipe|Meta Style Recipe]]
- [[_COMMUNITY_Icon Button Recipe|Icon Button Recipe]]
- [[_COMMUNITY_Danger Icon Button Recipe|Danger Icon Button Recipe]]
- [[_COMMUNITY_Reveal Style Recipe|Reveal Style Recipe]]
- [[_COMMUNITY_Dim Style Recipe|Dim Style Recipe]]
- [[_COMMUNITY_Input Style Recipe|Input Style Recipe]]
- [[_COMMUNITY_Row Style Recipe|Row Style Recipe]]
- [[_COMMUNITY_Row Select Recipe|Row Select Recipe]]
- [[_COMMUNITY_Action Card Recipe|Action Card Recipe]]
- [[_COMMUNITY_Action Card Icon Recipe|Action Card Icon Recipe]]
- [[_COMMUNITY_Action Card Title Recipe|Action Card Title Recipe]]
- [[_COMMUNITY_Action Card Subtitle Recipe|Action Card Subtitle Recipe]]
- [[_COMMUNITY_Sample Code Constant|Sample Code Constant]]
- [[_COMMUNITY_Docs Code Constant|Docs Code Constant]]
- [[_COMMUNITY_Initial Environments|Initial Environments]]
- [[_COMMUNITY_Theme Key Type|Theme Key Type]]
- [[_COMMUNITY_Themes Registry|Themes Registry]]
- [[_COMMUNITY_Method Color (Light)|Method Color (Light)]]
- [[_COMMUNITY_Push Recent Util|Push Recent Util]]
- [[_COMMUNITY_Chrome MCP Usage Gate|Chrome MCP Usage Gate]]
- [[_COMMUNITY_PNPM Build Allowlist|PNPM Build Allowlist]]
- [[_COMMUNITY_Bulky API SOP|Bulky API SOP]]
- [[_COMMUNITY_Interface Layout Spec|Interface Layout Spec]]
- [[_COMMUNITY_Running a Script Spec|Running a Script Spec]]
- [[_COMMUNITY_Inspecting Results Spec|Inspecting Results Spec]]
- [[_COMMUNITY_Test Cases Spec|Test Cases Spec]]
- [[_COMMUNITY_Env & Variables Spec|Env & Variables Spec]]
- [[_COMMUNITY_File Actions Spec|File Actions Spec]]
- [[_COMMUNITY_Theming & Layout Spec|Theming & Layout Spec]]
- [[_COMMUNITY_Error Handling Spec|Error Handling Spec]]
- [[_COMMUNITY_Best Practices Spec|Best Practices Spec]]
- [[_COMMUNITY_Tailwind Migration Note|Tailwind Migration Note]]
- [[_COMMUNITY_ResizablePanel Typing Note|ResizablePanel Typing Note]]
- [[_COMMUNITY_Folder Optimization Checklist|Folder Optimization Checklist]]
- [[_COMMUNITY_Tool Button Style|Tool Button Style]]
- [[_COMMUNITY_Action Button Style|Action Button Style]]
- [[_COMMUNITY_Tool Label Style|Tool Label Style]]
- [[_COMMUNITY_Group Box Style|Group Box Style]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]

## God Nodes (most connected - your core abstractions)
1. `Theme` - 22 edges
2. `CodeEditor` - 21 edges
3. `cn()` - 19 edges
4. `MocksComponentsPage` - 19 edges
5. `BulkyApp` - 16 edges
6. `CallCard` - 15 edges
7. `TooltipContent()` - 14 edges
8. `data-testid registry` - 14 edges
9. `Tooltip()` - 13 edges
10. `TooltipTrigger()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `React Component JSDoc Convention` --rationale_for--> `MocksComponentsPage`  [INFERRED]
  CLAUDE.md → src/app/mocks/components/page.tsx
- `React Component JSDoc Convention` --rationale_for--> `BulkyApp`  [INFERRED]
  CLAUDE.md → src/app/BulkyApp.tsx
- `Move timeout config to TweaksPanel` --rationale_for--> `TweaksPanel`  [EXTRACTED]
  docs/Improvement_v_1_0_0.md → src/features/tweaks/components/TweaksPanel.tsx
- `Abort running script` --rationale_for--> `CodeEditor`  [EXTRACTED]
  docs/Improvement_v_1_0_0.md → src/features/code-editor/components/CodeEditor.tsx
- `Project Layout (src/ tree)` --references--> `BulkyApp`  [EXTRACTED]
  README.md → src/app/BulkyApp.tsx

## Hyperedges (group relationships)
- **PWA App-Shell Caching Setup** — swjs_service_worker, manifest_manifest, nextconfig_nextconfig [INFERRED 0.85]
- **Component Gallery Fixture Pipeline** — mockdata_mock_calls, mockstore_createmockstore, mocks_components_page_mockscomponentspage [INFERRED 0.85]
- **Fixed Z-200 Modal Overlay Pattern** — curlimportdialog_curlimportdialog, displaymodedialog_displaymodedialog, newcollectiondialog_newcollectiondialog, newenvironmentdialog_newenvironmentdialog, importcollectiondialog_importcollectiondialog, tweakspanel_tweakspanel [INFERRED 0.85]
- **Sidebar Section-Switching Architecture** — activityrail_activityrail, sidebar_sidebar, collpane_collpane, envpane_envpane, varspane_varspane, filepane_filepane [INFERRED 0.85]
- **ApiCall Multi-View Rendering** — apidocs_apidocs, apiwaterfall_apiwaterfall, authtab_authtab, callcard_callcard, types_apicall [INFERRED 0.85]
- **Response Inspector Tab Set** — headtab_headtab, payloadtab_payloadtab, resptab_resptab, statustab_statustab [INFERRED 0.85]
- **Fixed Overlay Dialog Pattern** — confirmdialog_confirmdialog, exampledialog_exampledialog, displaymodedialog_displaymodedialog [INFERRED 0.85]
- **Theme Prop-Drilling Pattern** — jsontreeviewer_jnode, kvrow_kvrow, codeeditor_codeeditor, exampledialog_exampledialog, monacocodeeditor_monacocodeeditor, apidocs_apidocs, apiwaterfall_apiwaterfall, authtab_authtab, callcard_callcard [INFERRED 0.85]
- **Shared api.* Script DSL Convention** — curlparser_curltoscript, scriptanalyzer_analyzescript, scriptrunner_api, sampledata_example_scripts [INFERRED 0.95]
- **State Persistence and Hydration Flow** — index_store, persist_schedulesave, collectionsslice_hydratecollections, editorslice_hydrateeditor, runnerslice_hydraterunner, uislice_hydrateui [INFERRED 0.85]
- **Cross-Slice Cleanup on Item Removal** — collectionsslice_removeitem, runnerslice_removeitemcleanup, uislice_removeitemcleanup [EXTRACTED 1.00]
- **Debounced Analyze-and-Save Pattern in BulkyApp** — bulkyapp_bulkyapp, improvement_debounce_saveitemcode, improvement_debounce_syncanalyzedcalls [EXTRACTED 1.00]
- **Code Formatting Pipeline (Prettier + Monaco Fallback)** — codeeditor_handleformat, prettier_format, monacocodeeditor_editorinstance [EXTRACTED 1.00]
- **Run/Step/Stop Execution Control Flow** — codeeditor_codeeditor, codeeditor_props, monacocodeeditor_monacocodeeditor [EXTRACTED 1.00]
- **Example Script Selection & Load Flow** — codeeditor_codeeditor, sampledata_example_scripts, exampledialog_exampledialog, editorslice_setcode [EXTRACTED 1.00]

## Communities (94 total, 63 thin omitted)

### Community 0 - "Response Panel Components & Props"
Cohesion: 0.05
Nodes (50): BulkyApp(), LAYOUT_SIZES, ActivityRail(), TABS, DisplayModeDialogProps, OPTIONS, Props, PANE_LABELS (+42 more)

### Community 1 - "Layout & Display Modes"
Cohesion: 0.06
Nodes (37): Props, Props, ConfirmDialogProps, CurlImportDialogProps, Props, CYCLE_METHODS, METHOD_INFO, MethodPillProps (+29 more)

### Community 2 - "App Bootstrap & Providers"
Cohesion: 0.05
Nodes (60): Button, ButtonGroup, ButtonGroup, CodeEditor, handleFormat, toggleExamples, collectionsReducer, selectActiveCollection (+52 more)

### Community 3 - "Error Boundary & Mock Fixtures"
Cohesion: 0.05
Nodes (32): metadata, viewport, ServiceWorkerRegister(), MonacoCodeEditor, Props, Props, EditorInstance, Props (+24 more)

### Community 4 - "Sidebar Dialogs & Panes"
Cohesion: 0.06
Nodes (52): ApiDocs, ApiWaterfall, AuthTab, Dot, CallCard, CollectionsState (type), findCollectionForEnv, EditorState (type) (+44 more)

### Community 5 - "Code Editor & Method Detail"
Cohesion: 0.08
Nodes (25): Props, Props, CallCard(), DetailTab, Props, Props, JNodeProps, Props (+17 more)

### Community 6 - "Sidebar & Curl Parsing"
Cohesion: 0.08
Nodes (27): ErrorBoundary, Props, State, HTTP_METHODS, MOCK_CALL, MOCK_CALL_CACHED, MOCK_CALL_ERROR, MOCK_CALL_SSE (+19 more)

### Community 7 - "Response Panel Tab Set"
Cohesion: 0.07
Nodes (27): 10. Theming & Layout, 11. Error Handling, 12. Best Practices, 1. Overview, 2. Interface Layout, 3.1 Available API Methods, 3.2 Using Environment Variables, 3.3 Chaining Calls (+19 more)

### Community 8 - "Code Editor State Wiring"
Cohesion: 0.2
Nodes (14): isSseBody(), ParsedSseEvent, parseSseBody(), Props, RespTab(), ViewMode, buildInterface(), camelToPascal() (+6 more)

### Community 9 - "Redux Store Architecture"
Cohesion: 0.18
Nodes (11): Props, TONES, ImportCollectionDialogProps, curlToScript(), parseCurl(), ParsedCurl, tokenize(), downloadBlob() (+3 more)

### Community 10 - "SSE Response Parsing"
Cohesion: 0.12
Nodes (16): Next.js 16 Breaking-Changes Notice, Graphify Knowledge-Graph Usage Rules, Writing a Script (SOP §3), Script API Surface (api.get/post/put/patch/delete), Bulky API Project, localforage Persistence, lucide-react Icons, Monaco Editor (@monaco-editor/react) (+8 more)

### Community 11 - "File Import & Curl Parsing"
Cohesion: 0.13
Nodes (14): ActivityRail (src/features/sidebar/components/ActivityRail.tsx), CodeEditor (src/features/code-editor/components/CodeEditor.tsx), CollPane (src/features/sidebar/components/CollPane.tsx), ConfirmDialog (src/components/ConfirmDialog.tsx), data-testid registry, DisplayModeDialog (src/features/sidebar/components/DisplayModeDialog.tsx), EnvPane (src/features/sidebar/components/EnvPane.tsx), Input (src/components/ui/input.tsx) (+6 more)

### Community 12 - "Project Docs & Dependencies"
Cohesion: 0.13
Nodes (14): API surface (in scripts), Author, Bulky API, code:bash (pnpm install), code:bash (pnpm build), code:block3 (src/), code:js (await api.get(url, opts?)), Features (+6 more)

### Community 13 - "Persistence & Improvement Notes"
Cohesion: 0.27
Nodes (12): curlToScript, parseCurl, ParsedCurl (type), tokenize, buildInterface, camelToPascal, capitalize, inferType (+4 more)

### Community 14 - "BulkyApp Debounce & Improvements"
Cohesion: 0.22
Nodes (11): ActivityRail, DisplayModeDialog, Debounce timeout input, TweaksPanelPreview, ServiceWorkerRegister, ActivityRail testid contract, DisplayModeDialog testid contract, TweaksPanel testid contract (+3 more)

### Community 15 - "State Hydration Flow"
Cohesion: 0.2
Nodes (9): BulkyApp, Home(), BulkyApp, React Component JSDoc Convention, CodeEditor Props, Debounce saveItemCode, Debounce syncAnalyzedCalls, Fix eslint-disable suppressions (+1 more)

### Community 16 - "UI Primitives & Mock Gallery"
Cohesion: 0.22
Nodes (9): Abort running script, Console height toggle, Extract onRun to custom hook, Move timeout config to TweaksPanel, ResponsePanel, analyzeScript, extractNoteBeforeIndex, isInsideComment (+1 more)

### Community 17 - "Script Runner Hook"
Cohesion: 0.25
Nodes (9): Cap persisted response size, Replace opts as never casts, Stop spreading every call on every update, RootLayout, manifest(), persist.ts (localforage save/load), Persisted Response Size Cap Note, Project Layout (src/ tree) (+1 more)

### Community 18 - "Activity Rail & Display Mode Hooks"
Cohesion: 0.22
Nodes (9): hydrateCollections, hydrateEditor, ErrorBoundary, Add error boundary, loadPersistedState, HydrateStore, Providers, hydrateRunner (+1 more)

### Community 19 - "Redux Reducers & Mock Store"
Cohesion: 0.25
Nodes (7): Bulky API — Improvement & Optimization Checklist v1.0.0, Code Quality / Architecture, Maintainability, Memory / Unbounded Growth, Performance, Security, UX / Missing Features

### Community 20 - "Proxy Route & Security Notes"
Cohesion: 0.4
Nodes (5): Add proxy timeout, Fix error: any, SSRF risk in proxy — accepted, Proxy Permissiveness Note, POST proxy handler

### Community 21 - "Service Worker Shell Cache"
Cohesion: 0.5
Nodes (3): copy, SHELL, url

### Community 22 - "Call Sync & Item Switching"
Cohesion: 0.5
Nodes (4): methodVars, themeVars, ghostBtn recipe, solidBtn recipe

### Community 23 - "Home Page Entry"
Cohesion: 0.5
Nodes (4): applyStored, mergeCalls, switchToItem, syncAnalyzedCalls

### Community 25 - "Brand Marks"
Cohesion: 0.67
Nodes (3): removeItem (action/reducer), removeItem cleanup handler (extraReducers), removeItem cleanup handler (extraReducers)

### Community 26 - "PostCSS Config"
Cohesion: 0.67
Nodes (3): BulkyApi Favicon Icon, Bulky API Wordmark Logo, Bulky API Logo Mark

## Ambiguous Edges - Review These
- `BulkyApp` → `CodeEditor Props`  [AMBIGUOUS]
  src/features/code-editor/components/CodeEditor.tsx · relation: shares_data_with
- `Feature-Based Folder Structure Convention` → `Redux Toolkit Centralized State Architecture`  [AMBIGUOUS]
  src/prompts/OPTIMIZATION_STORE.md · relation: conceptually_related_to
- `Bulky API Logo Mark` → `BulkyApi Favicon Icon`  [AMBIGUOUS]
  public/logo-mark.svg · relation: conceptually_related_to

## Knowledge Gaps
- **301 isolated node(s):** `config`, `eslintConfig`, `nextConfig`, `SHELL`, `url` (+296 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **63 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `BulkyApp` and `CodeEditor Props`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `Feature-Based Folder Structure Convention` and `Redux Toolkit Centralized State Architecture`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Bulky API Logo Mark` and `BulkyApi Favicon Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `MocksComponentsPage` connect `App Bootstrap & Providers` to `Sidebar Dialogs & Panes`, `BulkyApp Debounce & Improvements`, `State Hydration Flow`, `UI Primitives & Mock Gallery`, `Activity Rail & Display Mode Hooks`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `BulkyApp` connect `State Hydration Flow` to `App Bootstrap & Providers`, `BulkyApp Debounce & Improvements`, `UI Primitives & Mock Gallery`, `Script Runner Hook`, `Call Sync & Item Switching`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `ApiCall` connect `Sidebar Dialogs & Panes` to `UI Primitives & Mock Gallery`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `config`, `eslintConfig`, `nextConfig` to the rest of the system?**
  _301 weakly-connected nodes found - possible documentation gaps or missing edges._