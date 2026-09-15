import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060817] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,91,255,0.55), transparent 55%),
            radial-gradient(ellipse 50% 40% at 90% 20%, rgba(56,189,248,0.18), transparent 50%),
            radial-gradient(ellipse 40% 30% at 10% 60%, rgba(99,91,255,0.2), transparent 45%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.09) 0.6px, transparent 0.6px)",
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(180deg, black 0%, transparent 75%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-7 sm:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#5b54f5] text-[13px] font-semibold">
              W
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Workboard</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 font-medium text-white/65 transition hover:bg-white/8 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-white px-3.5 py-1.5 font-semibold text-[#060817] transition hover:bg-white/90"
            >
              Start now
            </Link>
          </div>
        </header>

        <section className="wb-rise flex flex-1 flex-col justify-center py-20 sm:py-28">
          <p className="mb-5 text-sm font-medium text-[#a5b0ff]">
            Delivery visibility for modern teams
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Workboard
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/60 sm:text-xl">
            Accounts, work items, and shared status — without the follow-up fog.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-[#5b54f5] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#4f48e6]"
            >
              Create workspace
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Sign in
            </Link>
          </div>
        </section>

        <footer className="border-t border-white/10 py-6 text-sm text-white/40">
          Accounts → work items → activity. Decisions, requests, and blockers in one place.
        </footer>
      </div>
    </main>
  );
}
