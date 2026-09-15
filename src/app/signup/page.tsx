"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")),
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      workspaceName: String(fd.get("workspaceName")),
    };
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Signup failed");
      return;
    }
    const login = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      setError("Account created — please sign in");
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
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
        <h1 className="mt-8 text-[24px] font-semibold tracking-[-0.03em]">Create workspace</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Shared status for accounts, work items, and delivery teams.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <input
            name="workspaceName"
            required
            placeholder="Workspace name"
            className="wb-input"
          />
          <input name="name" required placeholder="Your name" className="wb-input" />
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
            minLength={6}
            required
            autoComplete="new-password"
            placeholder="Password"
            className="wb-input"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="wb-btn wb-btn-primary w-full !py-3">
            {loading ? "Creating…" : "Create workspace"}
          </button>
        </form>
        <p className="mt-7 text-center text-sm text-ink-soft">
          Already have a workspace?{" "}
          <Link href="/login" className="font-semibold text-accent-deep transition hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
