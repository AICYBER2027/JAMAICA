"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/Wordmark";

export function AdminNav({ items, user, signOut }: { items: { href: string; label: string }[]; user: { name: string; role: string }; signOut: () => Promise<void> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

  return (
    <aside className="sticky top-0 z-30 bg-black text-white lg:h-svh">
      <div className="flex h-14 items-center justify-between px-5 lg:h-auto lg:px-5 lg:pb-6 lg:pt-6">
        <Link href="/admin" className="text-[1.05rem]" aria-label="Dashboard home"><Wordmark /></Link>
        <button type="button" className="h-10 px-2 font-semibold lg:hidden" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <nav id="admin-nav" aria-label="Dashboard" className={`${open ? "block" : "hidden"} max-h-[calc(100svh-56px)] overflow-y-auto pb-6 lg:flex lg:h-[calc(100svh-76px)] lg:max-h-none lg:flex-col`}>
        <ul className="px-3">
          {items.map((i) => {
            const on = isActive(i.href);
            return (
              <li key={i.href}>
                <Link href={i.href} aria-current={on ? "page" : undefined} className={`flex h-10 items-center px-3 text-[0.95rem] transition-colors ${on ? "bg-jade-2 font-semibold text-white" : "text-mist hover:bg-white/5 hover:text-white"}`}>
                  {i.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 px-6 text-small lg:mt-auto">
          <p className="font-semibold">{user.name}</p>
          <p className="capitalize text-mist">{user.role}</p>
          <div className="mt-3 flex gap-4">
            <Link href="/" className="text-mist hover:text-white">View store</Link>
            <form action={signOut}>
              <button type="submit" className="text-mist hover:text-white">Sign out</button>
            </form>
          </div>
        </div>
      </nav>
    </aside>
  );
}
