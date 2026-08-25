# data-testid registry

## MocksComponentsPage (src/app/mocks/components/page.tsx)

`mocks-components-page-nav-list` — MocksComponentsPage / nav container
`mocks-components-page-theme-select` — MocksComponentsPage / theme select
`mocks-components-page-nav-link-<entry-id>` — MocksComponentsPage / nav link (per catalog entry)
`mocks-components-page-catalog-table` — MocksComponentsPage / catalog table
`mocks-components-page-catalog-row-<entry-id>` — MocksComponentsPage / catalog row (per catalog entry)
`mocks-components-page-section-<entry-id>` — MocksComponentsPage / preview section (per catalog entry)
`mocks-components-page-crash-button` — MocksComponentsPage / ErrorBoundary throw-reset button
`mocks-components-page-example-dialog-button` — MocksComponentsPage / ExampleDialog open button
`mocks-components-page-display-mode-dialog-button` — MocksComponentsPage / DisplayModeDialog open button
`mocks-components-page-tweaks-panel-button` — MocksComponentsPage / TweaksPanel open button
`mocks-components-page-code-editor-mount-button` — MocksComponentsPage / CodeEditor mount toggle
`mocks-components-page-monaco-mount-button` — MocksComponentsPage / MonacoCodeEditor mount toggle

## ActivityRail (src/features/sidebar/components/ActivityRail.tsx)

`activity-rail-nav` — ActivityRail / rail root nav
`activity-rail-env-button` — ActivityRail / active environment button
`activity-rail-tab-<tab-id>` — ActivityRail / section tab (per sidebar tab: collections, env, vars, file)
`activity-rail-status` — ActivityRail / run status live region
`activity-rail-call-count` — ActivityRail / built-call count
`activity-rail-display-button` — ActivityRail / display-mode picker trigger
`activity-rail-tweaks-button` — ActivityRail / tweaks panel toggle

## Sidebar (src/features/sidebar/components/Sidebar.tsx)

`sidebar-pane` — Sidebar / active pane body (tabpanel)

## DisplayModeDialog (src/features/sidebar/components/DisplayModeDialog.tsx)

`display-mode-dialog-root` — DisplayModeDialog / dialog root
`display-mode-dialog-option-<mode>` — DisplayModeDialog / mode option (per mode: fullscreen, browser)
`display-mode-dialog-close-button` — DisplayModeDialog / header close button
`display-mode-dialog-cancel-button` — DisplayModeDialog / footer cancel button
`display-mode-dialog-done-button` — DisplayModeDialog / footer confirm button

## TweaksPanel (src/features/tweaks/components/TweaksPanel.tsx)

`tweaks-panel-root` — TweaksPanel / dialog root
`tweaks-panel-close-button` — TweaksPanel / header close button
`tweaks-panel-theme-button-<theme-id>` — TweaksPanel / color theme pill (per theme: midnight, ocean, light, purple, green, rose, amber, slate, flat)
`tweaks-panel-layout-button-<layout-id>` — TweaksPanel / layout pill (per layout: balanced, editor-focus, response-focus)
`tweaks-panel-timeout-input` — TweaksPanel / call timeout number input (via shared `Input`)
`tweaks-panel-timeout-input-clear-button` — TweaksPanel / call timeout inline clear button (renamed from `tweaks-panel-timeout-clear-button` when the standalone Clear link was replaced by `Input`'s built-in clear button)
`tweaks-panel-done-button` — TweaksPanel / footer done button

## Input (src/components/ui/input.tsx)

Shared primitive — forwards the caller's `data-testid` to the `<input>` and derives `<data-testid>-clear-button` for its inline clear button. Ids below are the ones assigned by each caller.

## NewCollectionDialog (src/features/sidebar/components/NewCollectionDialog.tsx)

`new-collection-dialog-name-input` — NewCollectionDialog / name field (via shared `Input`)
`new-collection-dialog-name-input-clear-button` — NewCollectionDialog / name field inline clear button

## CollPane (src/features/sidebar/components/CollPane.tsx)

`coll-pane-rename-collection-input` — CollPane / inline collection rename field (via shared `Input`; single instance, since only one row can be in edit mode at a time)
`coll-pane-rename-collection-input-clear-button` — CollPane / collection rename inline clear button
`coll-pane-rename-item-input` — CollPane / inline test-item rename field (via shared `Input`; single instance, since only one row can be in edit mode at a time)
`coll-pane-rename-item-input-clear-button` — CollPane / test-item rename inline clear button

## EnvPane (src/features/sidebar/components/EnvPane.tsx)

`env-pane-rename-input` — EnvPane / inline environment rename field (via shared `Input`; single instance, since only one row can be in edit mode at a time)
`env-pane-rename-input-clear-button` — EnvPane / environment rename inline clear button

## NewEnvironmentDialog (src/features/sidebar/components/NewEnvironmentDialog.tsx)

`new-environment-dialog-root` — NewEnvironmentDialog / dialog root
`new-environment-dialog-name-input` — NewEnvironmentDialog / name field (via shared `Input`)
`new-environment-dialog-name-input-clear-button` — NewEnvironmentDialog / name field inline clear button
`new-environment-dialog-close-button` — NewEnvironmentDialog / header close button
`new-environment-dialog-cancel-button` — NewEnvironmentDialog / footer cancel button
`new-environment-dialog-create-button` — NewEnvironmentDialog / footer create button

## ConfirmDialog (src/components/ConfirmDialog.tsx)

Shared primitive — fixed ids regardless of caller (not derived per instance). Used by `CollPane` (collection/request deletion) and `EnvPane` (environment deletion).

`confirm-dialog-root` — ConfirmDialog / dialog root
`confirm-dialog-close-button` — ConfirmDialog / header close button
`confirm-dialog-cancel-button` — ConfirmDialog / footer cancel button
`confirm-dialog-confirm-button` — ConfirmDialog / footer confirm button

## VarsPane (src/features/sidebar/components/VarsPane.tsx)

`vars-pane-key-input-<key>` — VarsPane / inline variable key rename field (per variable key, via shared `Input`)
`vars-pane-key-input-<key>-clear-button` — VarsPane / variable key rename inline clear button
`vars-pane-value-input-<key>` — VarsPane / inline variable value edit field (per variable key, via shared `Input`)
`vars-pane-value-input-<key>-clear-button` — VarsPane / variable value edit inline clear button
`vars-pane-new-key-input` — VarsPane / new variable key field (via shared `Input`)
`vars-pane-new-key-input-clear-button` — VarsPane / new variable key inline clear button
`vars-pane-new-value-input` — VarsPane / new variable value field (via shared `Input`)
`vars-pane-new-value-input-clear-button` — VarsPane / new variable value inline clear button

## CodeEditor (src/features/code-editor/components/CodeEditor.tsx)

`code-editor-rename-collection-input` — CodeEditor / breadcrumb inline collection rename field (via shared `Input`)
`code-editor-rename-collection-input-clear-button` — CodeEditor / breadcrumb collection rename inline clear button
`code-editor-rename-item-input` — CodeEditor / breadcrumb inline request rename field (via shared `Input`)
`code-editor-rename-item-input-clear-button` — CodeEditor / breadcrumb request rename inline clear button
