"use client";

import { useState, useEffect } from "react";

type Props = { children: React.ReactNode };

export default function AuthGate({ children }: Props) {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    fetch("/api/auth/check", { credentials: "include" })
      .then((res) => (res.ok ? "authenticated" : "unauthenticated"))
      .then(setStatus)
      .catch(() => setStatus("unauthenticated"));
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <p className="text-stone-500">確認中...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LoginForm onSuccess={() => setStatus("authenticated")} />;
  }

  return <>{children}</>;
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error ?? "ログインに失敗しました");
      }
    } catch {
      setError("通信エラー");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-sm border border-stone-200">
        <h1 className="text-lg font-medium text-stone-800 mb-4">かぞくたちルーレット</h1>
        <label className="block text-sm text-stone-600 mb-2">パスワード</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-stone-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          autoFocus
          autoComplete="current-password"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {submitting ? "送信中..." : "入室"}
        </button>
      </form>
    </div>
  );
}
