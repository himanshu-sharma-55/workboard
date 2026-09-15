"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { LayoutGrid, LogOut, Menu, Users, Building2 } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar } from "@/components/Avatar";
import { SearchButton } from "@/components/CommandPalette";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/parents", label: "Accounts", icon: Building2 },
  { href: "/team", label: "Team", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-paper">
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur-md md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="app-sidebar"
          onClick={() => setOpen(true)}
          className="rounded-full p-2 text-ink-soft transition hover:bg-paper-2 hover:text-ink"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold tracking-tight">Workboard</span>
        <NotificationBell />
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-[232px] flex-col border-r border-sidebar-edge bg-surface transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 -ml-1.5 transition hover:bg-paper-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[12px] font-semibold text-white">
              W
            </span>
            <span className="text-[14px] font-semibold tracking-tight">Workboard</span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 pt-1" aria-label="Main">
          {links.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== "/dashboard" && pathname.startsWith(l.href));
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`inline-flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                  active
                    ? "bg-ink text-white hover:bg-ink hover:text-white"
                    : "text-ink-soft hover:bg-paper-2 hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-line p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Avatar name={data?.user?.name || "User"} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight">
                {data?.user?.name}
              </div>
              <div className="truncate text-xs text-mute">{data?.user?.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-1 inline-flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-ink-soft transition hover:bg-paper-2 hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pt-14 md:pt-0">
        <header className="sticky top-0 z-20 hidden h-14 items-center justify-end gap-2 border-b border-line bg-paper/80 px-6 backdrop-blur md:flex">
          <SearchButton />
          <NotificationBell />
        </header>
        <main className="wb-rise mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
