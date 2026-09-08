"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "auth_callback_failed"
      ? "Authentication callback failed. Please try again."
      : null
  );

  const supabase = createClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setOauthLoading(true);

    const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error: oAuthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (oAuthError) {
      setError(oAuthError.message);
      setOauthLoading(false);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      {error && (
        <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={oauthLoading || loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors disabled:opacity-50 shadow-sm"
      >
        {oauthLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>Continue with Google</span>
      </button>

      <div className="relative my-6 text-center text-xs">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        </div>
        <span className="relative bg-white dark:bg-zinc-950 px-3 text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-[10px] font-medium">
          or continue with email
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="developer@example.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading || oauthLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-colors disabled:opacity-50 shadow-sm mt-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#09090b] px-4 py-12 selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-900">
      <div className="w-full max-w-[420px]">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 tracking-tight transition-all hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80 mb-5"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>ShipSprint v1</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome back
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
            Log in to manage and publish your app landing pages
          </p>
        </div>

        {/* Card inside Suspense */}
        <Suspense
          fallback={
            <div className="bg-white/80 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mx-auto" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Footer Link */}
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-900 dark:text-zinc-100 underline underline-offset-4 hover:text-blue-600 transition-colors"
          >
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}
