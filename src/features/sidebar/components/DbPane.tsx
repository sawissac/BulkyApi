'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Copy,
  Database,
  Eye,
  EyeOff,
  Plug,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Theme } from '@/lib/themes';
import type { DbConnection, DbSsl } from '@/lib/sampleData';
import * as ui from '@/lib/ui';
import {
  connectionUrl,
  describeConnection,
  isConnectionUsable,
  parseConnectionUrl,
  sslOption,
} from '@/lib/dbConnection';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  selectActiveCollection,
  selectConnections,
  selectConnIdx,
  setConnIdx,
  addConnection,
  updateConnection,
  removeConnection,
  duplicateConnection,
} from '@/store/collectionsSlice';

type Props = { T: Theme };

/** Container that visually combines a `ButtonGroup`'s children, no border. */
const GROUP_BOX = 'rounded-md overflow-hidden';

/** Ghost button hover matching the rest of the app's icon controls. */
const GROUP_BTN = 'rounded-none hover:bg-app-hover hover:text-app-accent dark:hover:bg-app-hover';

const GROUP_BTN_DANGER =
  'rounded-none text-app-error hover:bg-app-error/10 hover:text-app-error dark:hover:bg-app-error/10';

/** Connection list: one bordered card with `divide-y` row separators, matching
 *  the environment list in {@link EnvPane} so the two panes read as siblings. */
const LIST =
  'flex flex-col overflow-hidden rounded-md border border-app-border bg-app-panel divide-y divide-app-border';

/** Row block for one connection, flush edge-to-edge inside `LIST`. Active state
 *  is a left accent bar whose border is always present and only changes color,
 *  so selecting a row never shifts layout. */
const ROW =
  'group flex w-full items-center gap-2 border-l-2 border-l-transparent bg-app-hover px-2.5 py-1.5 ' +
  'transition-colors duration-200 hover:bg-app-selected ' +
  'data-selected:border-l-app-accent data-selected:bg-app-selected';

const FIELD_LABEL = 'font-title text-[10px] font-semibold uppercase tracking-[0.12em] text-app-dim';

/** The three TLS choices, in the order the segmented control renders them. */
const SSL_OPTIONS: Array<{ id: DbSsl; label: string; hint: string }> = [
  { id: '', label: 'Off', hint: 'No TLS — a local socket or a tunnel' },
  { id: 'require', label: 'Verify', hint: 'TLS, verifying the server certificate' },
  {
    id: 'no-verify',
    label: 'No verify',
    hint: 'TLS without checking the certificate — managed Postgres behind a self-signed pooler',
  },
];

/** What `/api/query/pgsql/test` answers on a reachable connection. */
type TestResult = {
  connectedMs: number;
  version: string;
  database: string;
  user: string;
  /** Null when the server would not say — `pg_stat_ssl` is unreadable on some
   *  managed providers, so this is never proof of an unencrypted link. */
  encrypted: boolean | null;
};

/** Outcome of the last **Test connection** press, held only while the pane
 *  stays mounted — a result is feedback on an action, not saved state. */
type TestState =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; result: TestResult }
  | { kind: 'error'; message: string };

/** One line summarizing a reachable connection: how long the dial took, the
 *  server version, and where the DSN actually landed — a pooler that rewrites
 *  the database, or a role other than the one in the URL, shows up here. */
function summarizeTest(r: TestResult): string {
  const parts = [`Connected in ${r.connectedMs}ms`];
  if (r.version) parts.push(`PostgreSQL ${r.version}`);
  if (r.database) parts.push(r.user ? `${r.database} as ${r.user}` : r.database);
  if (r.encrypted === true) parts.push('encrypted');
  return parts.join(' · ');
}

/**
 * The active collection's saved Postgres connections: a list to pick the active
 * one from, and a form editing whichever is selected. This is where
 * `api.query.pgsql(...)` gets its connection — a script names one with
 * `{ db: 'reporting' }` or, naming none, uses the row marked active here.
 * Environment variables live one tab over in {@link VarsPane}; a connection is
 * deliberately not one of them, so a password is never a `{{var}}` a URL can
 * interpolate.
 *
 * @remarks
 * Status: stable — Type: pane
 *
 * State & behavior: four pieces of local state — `pendingDelete` gating
 * {@link ConfirmDialog}, `showPassword` swapping the password field between
 * `password` and `text`, `dsnDraft` holding a pasted connection string until it
 * parses, and `test` holding the outcome of the last **Test connection** press.
 * Every field edit dispatches `updateConnection` immediately; there is no
 * save button and no draft state, matching how the rest of the sidebar edits
 * collection data. Which connection is active lives in the store as the
 * collection's `connIdx`, not here.
 *
 * Variants: renders a "select a collection" message when no collection is
 * active, and a "no connections yet" message when the active one has none —
 * the form only mounts once a connection exists to edit. A connection missing
 * a host or database disables **Test connection** rather than dialling a
 * half-built DSN.
 *
 * Composition: {@link ConfirmDialog} when a delete is pending. Rows use the
 * same bordered `LIST` card and `ROW` accent-bar treatment as {@link EnvPane}.
 * Duplicate and delete are grouped into one `ButtonGroup` revealed on row
 * hover/focus via `ui.reveal`; the TLS choice is a second `ButtonGroup` acting
 * as a segmented control.
 *
 * Accessibility: the active row's name button carries `aria-current`. Every
 * field has an `aria-label` naming both the field and its connection, since
 * the visible labels are shared by whichever row is selected. Icon-only
 * controls carry `aria-label` plus a tooltip. The test result is a live region
 * so its outcome is announced without moving focus.
 *
 * Test ids: add `db-pane-add-button`; list `db-pane-list`, rows
 * `db-pane-row-<id>` with `db-pane-select-button-<id>`,
 * `db-pane-duplicate-button-<id>` and `db-pane-delete-button-<id>`; form fields
 * `db-pane-name-input`, `db-pane-host-input`, `db-pane-port-input`,
 * `db-pane-database-input`, `db-pane-user-input`, `db-pane-password-input`,
 * `db-pane-password-reveal-button`, `db-pane-dsn-input`; TLS
 * `db-pane-ssl-button-<off|require|no-verify>`; test `db-pane-test-button` and
 * `db-pane-test-message`; empty states `db-pane-empty-message`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases:
 * - A password is stored on the collection and syncs with the account, so the
 *   field is masked by default; it is stripped from a collection exported to a
 *   file (see `useFileActions`), which is the copy most likely to be shared.
 * - A port typed as anything non-numeric falls back to 0, which
 *   `connectionUrl` renders as the default 5432 rather than an invalid DSN.
 * - A pasted string that is not a `postgres://` URL stays in the field with a
 *   hint instead of silently blanking the form.
 * - **Test connection** posts to `/api/query/pgsql/test`, which dials without
 *   running a caller-supplied statement. A reachable connection reports the
 *   dial time plus the server version, and the database and role the DSN
 *   actually resolved to — a pooler that rewrites either shows up here rather
 *   than silently in a later query. An unreachable one reports the driver's
 *   own message (refused port, rejected credentials, unacceptable
 *   certificate), so a connection can be proven before any script runs.
 * - `encrypted` is omitted from the summary unless the server confirmed it:
 *   `pg_stat_ssl` is unreadable on some managed providers, so its absence is
 *   never proof of an unencrypted link.
 * - The result line truncates to the pane width; the full text stays in its
 *   tooltip, which matters most for a long driver error.
 *
 * Dependencies: `lucide-react`, `react-redux`, `@/lib/dbConnection`,
 * `@/components/ui/input`, `@/components/ui/button`,
 * `@/components/ui/button-group`, `@/components/ui/tooltip`,
 * `@/components/ConfirmDialog`, `@/store/collectionsSlice`.
 *
 * @example
 * ```tsx
 * <DbPane T={theme} />
 * ```
 *
 * @see {@link EnvPane}
 * @see {@link VarsPane}
 */
export default function DbPane({}: Props) {
  const dispatch = useDispatch();
  const activeCol = useSelector(selectActiveCollection);
  const connections = useSelector(selectConnections);
  const connIdx = useSelector(selectConnIdx);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [dsnDraft, setDsnDraft] = useState('');
  const [test, setTest] = useState<TestState>({ kind: 'idle' });

  if (!activeCol) {
    return (
      <p
        data-testid="db-pane-empty-message"
        className="p-4 text-center font-description text-[12px] text-app-dim"
      >
        Select a collection to manage database connections.
      </p>
    );
  }

  const selected: DbConnection | undefined = connections[connIdx];

  const patch = (fields: Partial<Omit<DbConnection, 'id'>>) => {
    if (selected) dispatch(updateConnection({ id: selected.id, patch: fields }));
    setTest({ kind: 'idle' });
  };

  const applyDsn = (text: string) => {
    setDsnDraft(text);
    const parsed = parseConnectionUrl(text);
    if (parsed) {
      patch(parsed);
      setDsnDraft('');
    }
  };

  const runTest = async () => {
    if (!selected) return;
    setTest({ kind: 'testing' });
    try {
      const res = await fetch('/api/query/pgsql/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: connectionUrl(selected),
          ssl: sslOption(selected),
        }),
      });
      const payload = await res.json();
      if (!res.ok || payload.error) {
        setTest({ kind: 'error', message: payload.error || `HTTP ${res.status}` });
        return;
      }
      setTest({ kind: 'ok', result: payload as TestResult });
    } catch (e) {
      setTest({ kind: 'error', message: (e as Error).message });
    }
  };

  const field = (
    labelText: string,
    testId: string,
    value: string | number,
    onValue: (next: string) => void,
    extra?: { type?: string; placeholder?: string },
  ) => (
    <label className="flex flex-col gap-1">
      <span className={FIELD_LABEL}>{labelText}</span>
      <Input
        value={value}
        type={extra?.type}
        placeholder={extra?.placeholder}
        onChange={(e) => onValue(e.target.value)}
        aria-label={`${labelText} for ${selected?.name ?? 'connection'}`}
        data-testid={testId}
        className="py-1"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="mb-0.5 flex items-center justify-between gap-2 px-0.5">
        <h2 className={`${ui.label} truncate`}>{activeCol.name} DB</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() =>
                dispatch(
                  addConnection({
                    collectionId: activeCol.id,
                    name: `Connection ${connections.length + 1}`,
                  }),
                )
              }
              className={ui.iconBtn}
              aria-label="Add connection"
              data-testid="db-pane-add-button"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Add connection</TooltipContent>
        </Tooltip>
      </div>

      {connections.length === 0 ? (
        <p
          data-testid="db-pane-empty-message"
          className="px-1 py-6 text-center font-description text-[12px] text-app-dim"
        >
          No connections yet. Add one, then reach it from a script with{' '}
          <code className="font-mono text-app-text">api.query.pgsql(...)</code>.
        </p>
      ) : (
        <ul className={LIST} data-testid="db-pane-list">
          {connections.map((conn, i) => {
            const isActive = i === connIdx;
            return (
              <li
                key={conn.id}
                data-selected={isActive || undefined}
                data-testid={`db-pane-row-${conn.id}`}
                className={ROW}
              >
                <Database
                  size={13}
                  aria-hidden="true"
                  className={`shrink-0 transition-colors duration-200 ${isActive ? 'text-app-accent' : 'text-app-dim'}`}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        dispatch(setConnIdx({ collectionId: activeCol.id, connIdx: i }));
                        setTest({ kind: 'idle' });
                        setShowPassword(false);
                        setDsnDraft('');
                      }}
                      data-selected={isActive || undefined}
                      aria-current={isActive ? 'true' : undefined}
                      aria-label={`Use ${conn.name}`}
                      data-testid={`db-pane-select-button-${conn.id}`}
                      className={`flex min-w-0 flex-1 flex-col items-start gap-0 rounded-sm border-0 bg-transparent p-0 text-left transition-colors duration-200 hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-0 ${isActive ? 'text-app-bright' : 'text-app-text'}`}
                    >
                      <span className="w-full truncate font-title text-[12px] font-semibold">
                        {conn.name}
                      </span>
                      <span className={`${ui.meta} w-full truncate`}>{describeConnection(conn)}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isActive ? 'Used when a script names no connection' : 'Click to make active'}
                  </TooltipContent>
                </Tooltip>
                <ButtonGroup className={`${GROUP_BOX} ${ui.reveal}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => dispatch(duplicateConnection(conn.id))}
                        aria-label={`Duplicate ${conn.name}`}
                        data-testid={`db-pane-duplicate-button-${conn.id}`}
                        className={GROUP_BTN}
                      >
                        <Copy size={12} aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Duplicate</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setPendingDelete({ id: conn.id, name: conn.name })}
                        aria-label={`Delete ${conn.name}`}
                        data-testid={`db-pane-delete-button-${conn.id}`}
                        className={GROUP_BTN_DANGER}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </ButtonGroup>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <div className="flex flex-col gap-2.5 rounded-md border border-app-border bg-app-panel p-2.5">
          {field('Name', 'db-pane-name-input', selected.name, (v) => patch({ name: v }))}

          <div className="grid grid-cols-[1fr_auto] gap-2">
            {field('Host', 'db-pane-host-input', selected.host, (v) => patch({ host: v }))}
            <div className="w-20">
              {field('Port', 'db-pane-port-input', selected.port, (v) =>
                patch({ port: Number(v.replace(/\D/g, '')) || 0 }),
              )}
            </div>
          </div>

          {field('Database', 'db-pane-database-input', selected.database, (v) =>
            patch({ database: v }),
          )}
          {field('User', 'db-pane-user-input', selected.user, (v) => patch({ user: v }))}

          <div className="flex items-end gap-1.5">
            <div className="min-w-0 flex-1">
              {field(
                'Password',
                'db-pane-password-input',
                selected.password,
                (v) => patch({ password: v }),
                { type: showPassword ? 'text' : 'password' },
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={ui.iconBtn}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  data-testid="db-pane-password-reveal-button"
                >
                  {showPassword ? (
                    <EyeOff size={14} aria-hidden="true" />
                  ) : (
                    <Eye size={14} aria-hidden="true" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{showPassword ? 'Hide password' : 'Show password'}</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex flex-col gap-1">
            <span className={FIELD_LABEL}>TLS</span>
            <ButtonGroup className={GROUP_BOX}>
              {SSL_OPTIONS.map(({ id, label: sslLabel, hint }) => (
                <Tooltip key={id || 'off'}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => patch({ ssl: id })}
                      data-active={selected.ssl === id || undefined}
                      aria-pressed={selected.ssl === id}
                      data-testid={`db-pane-ssl-button-${id || 'off'}`}
                      className={`${GROUP_BTN} flex-1 text-[11px] data-active:bg-app-accent-faint data-active:text-app-accent`}
                    >
                      {sslLabel}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{hint}</TooltipContent>
                </Tooltip>
              ))}
            </ButtonGroup>
          </div>

          <label className="flex flex-col gap-1">
            <span className={FIELD_LABEL}>Paste a connection string</span>
            <Input
              value={dsnDraft}
              onChange={(e) => applyDsn(e.target.value)}
              placeholder="postgres://user:pass@host:5432/db"
              aria-label="Paste a connection string to fill the fields"
              data-testid="db-pane-dsn-input"
              className="py-1 font-mono text-[11px]"
            />
            {dsnDraft.trim() !== '' && (
              <span className="font-description text-[11px] text-app-warn">
                Not a postgres:// URL — nothing was changed.
              </span>
            )}
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runTest}
              disabled={test.kind === 'testing' || !isConnectionUsable(selected)}
              className={ui.ghostBtn}
              data-testid="db-pane-test-button"
            >
              <Plug size={12} aria-hidden="true" />
              {test.kind === 'testing' ? 'Testing' : 'Test connection'}
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="status"
                  aria-live="polite"
                  data-testid="db-pane-test-message"
                  className={`min-w-0 truncate font-description text-[11px] ${
                    test.kind === 'error' ? 'text-app-error' : 'text-app-dim'
                  }`}
                >
                  {test.kind === 'ok' && summarizeTest(test.result)}
                  {test.kind === 'error' && test.message}
                </span>
              </TooltipTrigger>
              {test.kind !== 'idle' && test.kind !== 'testing' && (
                <TooltipContent>
                  {test.kind === 'ok' ? summarizeTest(test.result) : test.message}
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete connection"
          message={`Delete connection "${pendingDelete.name}"? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            dispatch(removeConnection(pendingDelete.id));
            setPendingDelete(null);
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
