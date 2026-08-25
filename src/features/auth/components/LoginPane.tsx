"use client";

import { useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, LogOut, Mail, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { clearPersistedState } from "@/lib/persist";
import {
  clearSession,
  selectSupabaseConfigured,
  selectUserEmail,
  selectAuthStatus,
} from "@/store/authSlice";

/**
 * Account screen for the Supabase-backed sync. Signed out it sends a magic
 * link; signed in it shows the account and offers sign-out. Mounted by the
 * `/login` route.
 *
 * @remarks
 * Status: stable — Type: screen
 *
 * State & behavior: holds the email draft and the send lifecycle locally;
 * session state itself is read from the `auth` slice, which
 * {@link Providers} keeps in step with Supabase. Submitting calls
 * `signInWithOtp` and swaps the form for a "check your inbox" confirmation —
 * no session exists until the emailed link hits `/auth/callback`. A `next`
 * search param (set by `src/proxy.ts` when it turns away a signed-out
 * visitor) rides along on the emailed link so sign-in lands back on the page
 * that was originally asked for. Signing out clears the Supabase session,
 * resets the slice, and drops the localforage cache so the next visitor to
 * the browser starts clean.
 *
 * Variants: three mutually exclusive views — unconfigured (no Supabase env
 * vars, sync unavailable), signed out (the form), signed in (the account).
 *
 * Composition: renders no children.
 *
 * Accessibility: the form is a real `form` submitted by Enter or the button.
 * Status and error text render in a `role="status"` live region. The email
 * field is labelled and marked `autoComplete="email"`.
 *
 * Test ids: root `login-pane-root`, email field `login-pane-email-input`,
 * submit `login-pane-submit-button`, sign out `login-pane-signout-button`,
 * back link `login-pane-back-link`, status region `login-pane-status`.
 *
 * CSS classes: none — Tailwind utilities over the `app-*` theme tokens only.
 *
 * Edge cases: with no Supabase project configured the form is replaced by a
 * notice rather than a dead button — the app is fully usable local-only, so
 * this is a normal state and not an error. A failed send leaves the typed
 * address in place so it can be retried without retyping. The back arrow
 * points at `/`, which bounces straight back here while signed out; it is
 * there for the signed-in case, where this screen doubles as the account
 * page. An untrusted `next` (absolute URL or protocol-relative) is dropped
 * rather than forwarded, so the emailed link can never leave the app.
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

  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = draft.trim();
    if (!address) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    setPhase("sending");
    const next = new URLSearchParams(window.location.search).get("next");
    const callback = new URL("/auth/callback", window.location.origin);
    if (next?.startsWith("/") && !next.startsWith("//")) callback.searchParams.set("next", next);

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

  const signOut = async () => {
    const supabase = getSupabaseBrowser();
    await supabase?.auth.signOut();
    await clearPersistedState();
    dispatch(clearSession());
    window.location.href = "/login";
  };

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
            <form onSubmit={sendLink} className="flex flex-col gap-3">
              <p className="font-description text-[12px] leading-relaxed text-app-dim">
                We&apos;ll email a one-time link — no password. Local work already in this browser
                uploads to your account the first time you sign in.
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
                disabled={!draft.trim() || phase === "sending"}
                data-testid="login-pane-submit-button"
                className="h-8 rounded-md border-0 bg-app-accent px-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-app-on-solid transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel disabled:pointer-events-none disabled:opacity-50"
              >
                {phase === "sending" ? "Sending…" : "Send magic link"}
              </button>
            </form>
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
