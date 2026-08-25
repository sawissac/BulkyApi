"use client";

import { useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, KeyRound, LogOut, Mail, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { clearPersistedState } from "@/lib/persist";
import {
  clearSession,
  selectSupabaseConfigured,
  selectUserEmail,
  selectAuthStatus,
} from "@/store/authSlice";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Reads the `next` search param, dropping anything that could leave the app.
 * An absolute or protocol-relative value would turn a sign-in redirect into
 * an open redirect, so only same-origin paths survive.
 */
function readSafeNext(): string | null {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : null;
}

/**
 * Account screen for the Supabase-backed sync. Signed out it offers two ways
 * in — a magic link or an email and password; signed in it shows the account,
 * lets a password be set or changed, and offers sign-out. Mounted by the
 * `/login` route.
 *
 * @remarks
 * Status: stable — Type: screen
 *
 * State & behavior: holds the email, password, and confirmation drafts plus
 * the submit lifecycle locally; session state itself is read from the `auth`
 * slice, which {@link Providers} keeps in step with Supabase. The magic-link
 * form calls `signInWithOtp` and swaps itself for a "check your inbox"
 * confirmation — no session exists until the emailed link hits
 * `/auth/callback`. The password form calls `signInWithPassword`, which
 * establishes the session immediately, then hard-navigates so `src/proxy.ts`
 * sees the fresh auth cookies. A `next` search param (set by `src/proxy.ts`
 * when it turns away a signed-out visitor) is honoured by both paths: it
 * rides along on the emailed link, and is the redirect target after a
 * password sign-in. Signed in, the password form calls `updateUser` to set or
 * replace the account password without touching the session. Signing out
 * clears the Supabase session, resets the slice, and drops the localforage
 * cache so the next visitor to the browser starts clean.
 *
 * Variants: three mutually exclusive views — unconfigured (no Supabase env
 * vars, sync unavailable), signed out (a two-button method switch over either
 * the magic-link form or the password form), signed in (the account, the
 * set-password form, and sign-out).
 *
 * Composition: renders no children.
 *
 * Accessibility: each form is a real `form` submitted by Enter or its button.
 * Status and error text render in a `role="status"` live region. The method
 * switch is a `role="group"` of two buttons carrying `aria-pressed`. Every
 * field is labelled and carries the matching `autoComplete` token — `email`,
 * `current-password`, `new-password` — so password managers fill and save
 * correctly.
 *
 * Test ids: root `login-pane-root`, back link `login-pane-back-link`, method
 * switch `login-pane-mode-link-button` and `login-pane-mode-password-button`,
 * email field `login-pane-email-input`, magic-link submit
 * `login-pane-submit-button`, password field `login-pane-password-input`,
 * password submit `login-pane-password-submit-button`, new password
 * `login-pane-new-password-input`, confirmation
 * `login-pane-confirm-password-input`, set-password submit
 * `login-pane-set-password-button`, sign out `login-pane-signout-button`,
 * status region `login-pane-status`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: with no Supabase project configured the forms are replaced by a
 * notice rather than a dead button — the app is fully usable local-only, so
 * this is a normal state and not an error. A failed attempt leaves the typed
 * address in place so it can be retried without retyping. An account created
 * through a magic link has no password until one is set here while signed in;
 * password sign-in for such an account fails with Supabase's generic
 * "Invalid login credentials", so that message is answered with a hint to use
 * the magic link first. Passwords shorter than
 * {@link MIN_PASSWORD_LENGTH} characters and mismatched confirmations are
 * rejected before any request is sent; a project configured with a longer
 * minimum still rejects server-side and that message is surfaced as-is. The
 * back arrow points at `/`, which bounces straight back here while signed
 * out; it is there for the signed-in case, where this screen doubles as the
 * account page.
 *
 * Dependencies: `react-redux`, `lucide-react`, `@/components/ui/input`
 * ({@link Input}), `@/lib/supabase/client`.
 *
 * @example
 * ```tsx
 * export default function LoginPage() {
 *   return <LoginPane />;
 * }
 * ```
 *
 * @see {@link Providers}
 */
export default function LoginPane() {
  const dispatch = useDispatch();
  const configured = useSelector(selectSupabaseConfigured);
  const status = useSelector(selectAuthStatus);
  const email = useSelector(selectUserEmail);

  const [mode, setMode] = useState<"link" | "password">("link");
  const [draft, setDraft] = useState("");
  const [secret, setSecret] = useState("");
  const [nextSecret, setNextSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [phase, setPhase] = useState<"idle" | "working" | "sent" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const switchMode = (to: "link" | "password") => {
    setMode(to);
    setPhase("idle");
    setMessage("");
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = draft.trim();
    if (!address) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    setPhase("working");
    const next = readSafeNext();
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callback.toString() },
    });

    if (error) {
      setPhase("error");
      setMessage(error.message);
      return;
    }
    setPhase("sent");
    setMessage(`Magic link sent to ${address}. Open it on this device to finish signing in.`);
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = draft.trim();
    if (!address || !secret) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    setPhase("working");
    const { error } = await supabase.auth.signInWithPassword({ email: address, password: secret });

    if (error) {
      setPhase("error");
      setMessage(
        error.message === "Invalid login credentials"
          ? "Wrong email or password — and an account created by magic link has no password yet. Sign in with a link, then set one below."
          : error.message,
      );
      return;
    }

    setSecret("");
    window.location.href = readSafeNext() ?? "/";
  };

  const setPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nextSecret.length < MIN_PASSWORD_LENGTH) {
      setPhase("error");
      setMessage(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (nextSecret !== confirmSecret) {
      setPhase("error");
      setMessage("The two passwords do not match.");
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    setPhase("working");
    const { error } = await supabase.auth.updateUser({ password: nextSecret });

    if (error) {
      setPhase("error");
      setMessage(error.message);
      return;
    }

    setNextSecret("");
    setConfirmSecret("");
    setPhase("saved");
    setMessage("Password saved. You can now sign in with your email and password on any device.");
  };

  const signOut = async () => {
    const supabase = getSupabaseBrowser();
    await supabase?.auth.signOut();
    await clearPersistedState();
    dispatch(clearSession());
    window.location.href = "/login";
  };

  const modeButton = (target: "link" | "password", label: string, testId: string) => (
    <button
      type="button"
      onClick={() => switchMode(target)}
      aria-pressed={mode === target}
      data-testid={testId}
      className={`h-7 flex-1 rounded-md text-[11px] font-semibold uppercase tracking-[0.07em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${
        mode === target
          ? "bg-app-hover text-app-bright"
          : "bg-transparent text-app-dim hover:text-app-bright"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      data-testid="login-pane-root"
      className="flex min-h-dvh items-center justify-center bg-app-bg p-4"
    >
      <div className="flex w-[min(420px,94vw)] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel">
        <div className="flex shrink-0 items-center gap-2 border-b border-app-border px-4 py-2.5">
          <ShieldCheck size={14} aria-hidden="true" className="text-app-accent" />
          <span className="flex-1 font-title text-[13px] font-semibold tracking-[-0.01em] text-app-bright">
            {status === "signed-in" ? "Account" : "Sign in to sync"}
          </span>
          <Link
            href="/"
            data-testid="login-pane-back-link"
            aria-label="Back to workspace"
            className="flex size-7 items-center justify-center rounded-md text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
          >
            <ArrowLeft size={14} aria-hidden="true" />
          </Link>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4">
          {!configured && (
            <p className="font-description text-[12px] leading-relaxed text-app-dim">
              Sync is not configured. Set <code className="text-app-bright">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              and <code className="text-app-bright">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable it.
              Everything still works locally in the meantime.
            </p>
          )}

          {configured && status === "signed-in" && (
            <>
              <p className="font-description text-[12px] leading-relaxed text-app-dim">
                Signed in as <span className="text-app-bright">{email ?? "your account"}</span>.
                Collections, environments, and run history sync to every device you sign in on.
              </p>

              <form onSubmit={setPassword} className="flex flex-col gap-2 border-t border-app-border pt-3">
                <p className="font-description text-[12px] leading-relaxed text-app-dim">
                  Set a password to sign in without a link, on a device where opening mail is
                  awkward.
                </p>
                <Input
                  icon={KeyRound}
                  type="password"
                  value={nextSecret}
                  onChange={(e) => setNextSecret(e.target.value)}
                  placeholder={`New password (${MIN_PASSWORD_LENGTH}+ characters)`}
                  aria-label="New password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  data-testid="login-pane-new-password-input"
                  className="h-8"
                />
                <Input
                  icon={KeyRound}
                  type="password"
                  value={confirmSecret}
                  onChange={(e) => setConfirmSecret(e.target.value)}
                  placeholder="Confirm password"
                  aria-label="Confirm new password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  data-testid="login-pane-confirm-password-input"
                  className="h-8"
                />
                <button
                  type="submit"
                  disabled={!nextSecret || !confirmSecret || phase === "working"}
                  data-testid="login-pane-set-password-button"
                  className="h-8 rounded-md border border-app-border bg-transparent px-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel disabled:pointer-events-none disabled:opacity-50"
                >
                  {phase === "working" ? "Saving…" : "Save password"}
                </button>
              </form>

              <button
                type="button"
                onClick={signOut}
                data-testid="login-pane-signout-button"
                className="flex h-8 items-center justify-center gap-2 rounded-md border border-app-border bg-transparent px-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-app-dim transition-colors duration-200 hover:bg-app-hover hover:text-app-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel"
              >
                <LogOut size={13} aria-hidden="true" />
                Sign out
              </button>
            </>
          )}

          {configured && status !== "signed-in" && phase !== "sent" && (
            <>
              <div
                role="group"
                aria-label="Sign-in method"
                className="flex gap-1 rounded-md border border-app-border p-1"
              >
                {modeButton("link", "Magic link", "login-pane-mode-link-button")}
                {modeButton("password", "Password", "login-pane-mode-password-button")}
              </div>

              {mode === "link" ? (
                <form onSubmit={sendLink} className="flex flex-col gap-3">
                  <p className="font-description text-[12px] leading-relaxed text-app-dim">
                    We&apos;ll email a one-time link — no password. Local work already in this
                    browser uploads to your account the first time you sign in.
                  </p>
                  <Input
                    icon={Mail}
                    type="email"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="you@example.com"
                    aria-label="Email address"
                    autoComplete="email"
                    required
                    data-testid="login-pane-email-input"
                    className="h-8"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || phase === "working"}
                    data-testid="login-pane-submit-button"
                    className="h-8 rounded-md border-0 bg-app-accent px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel disabled:pointer-events-none disabled:opacity-50"
                  >
                    {phase === "working" ? "Sending…" : "Send magic link"}
                  </button>
                </form>
              ) : (
                <form onSubmit={signInWithPassword} className="flex flex-col gap-3">
                  <p className="font-description text-[12px] leading-relaxed text-app-dim">
                    Sign in with the password set on your account. Accounts created by magic link
                    have none until one is set from this screen while signed in.
                  </p>
                  <Input
                    icon={Mail}
                    type="email"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="you@example.com"
                    aria-label="Email address"
                    autoComplete="email"
                    required
                    data-testid="login-pane-email-input"
                    className="h-8"
                  />
                  <Input
                    icon={KeyRound}
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Password"
                    aria-label="Password"
                    autoComplete="current-password"
                    required
                    data-testid="login-pane-password-input"
                    className="h-8"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || !secret || phase === "working"}
                    data-testid="login-pane-password-submit-button"
                    className="h-8 rounded-md border-0 bg-app-accent px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel disabled:pointer-events-none disabled:opacity-50"
                  >
                    {phase === "working" ? "Signing in…" : "Sign in"}
                  </button>
                </form>
              )}
            </>
          )}

          {message && (
            <p
              role="status"
              data-testid="login-pane-status"
              className={`font-description text-[12px] leading-relaxed ${
                phase === "error" ? "text-app-error" : "text-app-dim"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
