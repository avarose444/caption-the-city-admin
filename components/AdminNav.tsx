"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Le Tableau", hint: "Statistics" },
  { href: "/users", label: "Les Membres", hint: "Users & profiles" },
  { href: "/media", label: "Les Médias", hint: "Photos & AI captions" },
  { href: "/votes", label: "Les Votes", hint: "Upvotes & downvotes" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map(({ href, label, hint }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 px-3 py-2 transition-colors ${
              active ? "bg-white text-black" : "text-white hover:bg-white/10"
            }`}
          >
            <span className="block font-display text-base uppercase tracking-wider">{label}</span>
            <span className={`hidden font-mono text-[11px] md:block ${active ? "text-muted" : "text-white/60"}`}>
              {hint}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
