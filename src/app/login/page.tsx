"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-paper"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 50% -20%, rgba(99,91,255,0.16), transparent 60%)",
        }}
      />
      <div className="wb-panel relative w-full max-w-[400px] p-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight transition hover:opacity-80">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[11px] font-semibold text-white">
            W
          </span>
          Workboard
        </Link>
        <h1 className="mt-8 text-[24px] font-semibold tracking-[-0.03em]">Sign in</h1>
        <p className="mt-1.5 text-sm text-ink-soft">Access your workspace.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            className="wb-input"
          />
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            className="wb-input"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="wb-btn wb-btn-primary w-full !py-3">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-7 text-center text-sm text-ink-soft">
          New workspace?{" "}
          <Link href="/signup" className="font-semibold text-accent-deep transition hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
