"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = [
  { title: "Overview", links: [{ href: "/", label: "Le Tableau", hint: "Statistics" }] },
  {
    title: "People",
    links: [
      { href: "/users", label: "Users", hint: "Profiles · read" },
      { href: "/signup-domains", label: "Signup domains", hint: "CRUD" },
      { href: "/whitelist", label: "Whitelisted emails", hint: "CRUD" },
    ],
  },
  {
    title: "Content",
    links: [
      { href: "/media", label: "Images & AI captions", hint: "CRUD · upload" },
      { href: "/votes", label: "Votes", hint: "Read" },
      { href: "/terms", label: "Terms", hint: "CRUD" },
    ],
  },
  {
    title: "AI pipeline",
    links: [
      { href: "/chains", label: "Prompt chains", hint: "Chains & steps · read" },
      { href: "/mix", label: "Chain mix", hint: "Read · update" },
      { href: "/examples", label: "Generation examples", hint: "CRUD" },
      { href: "/models", label: "LLM models", hint: "CRUD" },
      { href: "/providers", label: "LLM providers", hint: "CRUD" },
    ],
  },
  {
    title: "Observability",
    links: [
      { href: "/requests", label: "Generation requests", hint: "Read" },
      { href: "/responses", label: "LLM responses", hint: "Read" },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-4 md:overflow-x-visible">
      {GROUPS.map((group) => (
        <div key={group.title} className="flex gap-1 md:flex-col md:gap-0">
          <p className="hidden px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 md:block">{group.title}</p>
          {group.links.map(({ href, label, hint }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 px-3 py-1.5 transition-colors ${active ? "bg-white text-black" : "text-white hover:bg-white/10"}`}
              >
                <span className="block font-display text-sm uppercase tracking-wider">{label}</span>
                <span className={`hidden font-mono text-[10px] md:block ${active ? "text-muted" : "text-white/50"}`}>{hint}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
