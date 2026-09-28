"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

const links = [
  { href: "/", label: "Home" },
  { href: "/estimator", label: "Property Value Estimator" },
  { href: "/market", label: "Market Analysis" },
];

export default function NavBar() {
  const pathname = usePathname();
  // Menu is "open for this path": navigating elsewhere closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 rounded font-semibold">
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-md bg-brand text-sm text-brand-fg">
            H
          </span>
          Housing Portal
        </Link>

        <button
          type="button"
          className="rounded-md border border-line px-3 py-1.5 text-sm sm:hidden"
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpenPath(open ? null : pathname)}
        >
          {open ? "Close" : "Menu"}
        </button>

        <ul id="nav-links" className={cn("flex-col gap-1 sm:flex sm:flex-row", open ? "absolute inset-x-0 top-full flex border-b border-line bg-surface p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0" : "hidden")}>
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-1.5 text-sm transition-colors",
                    active ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
