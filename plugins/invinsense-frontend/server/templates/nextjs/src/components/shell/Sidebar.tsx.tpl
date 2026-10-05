"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Bell, CaretRight, ChartLine, Database, FileText, Gear, Lifebuoy, ListChecks, ShieldCheck, SquaresFour, Table, User } from "@phosphor-icons/react";
import { useNextStep } from "nextstepjs";
import { NAV, type NavItem } from "@/lib/nav";
import { PRODUCT } from "@/lib/families";

const ICONS = {
  "squares-four": SquaresFour,
  table: Table,
  gear: Gear,
  "list-checks": ListChecks,
  "shield-check": ShieldCheck,
  database: Database,
  bell: Bell,
  user: User,
  "chart-line": ChartLine,
  "file-text": FileText,
} as const;

function Items({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const failed = params.get("filter") === "failed";

  const isActive = (it: NavItem) => (it.id === "items-failed" ? pathname === "/items" && failed : it.href.split("?")[0] === pathname && !(it.id === "items" && failed));

  function render(it: NavItem) {
    const kids = it.children ?? [];
    const open = isActive(it) || kids.some(isActive) || (it.id === "items" && pathname === "/items");
    const Icon = it.icon ? ICONS[it.icon] : null;
    return (
      <div key={it.id}>
        <Link
          className="nav-item"
          id={`nav-${it.id}`}
          href={it.href}
          aria-current={isActive(it) ? "page" : undefined}
          aria-expanded={kids.length ? open : undefined}
          title={it.label}
          onClick={onNavigate}
        >
          {Icon ? <Icon size={16} weight="bold" aria-hidden="true" /> : null}
          <span className="label">{it.label}</span>
          {kids.length ? <span className="chev"><CaretRight size={16} weight="bold" aria-hidden="true" /></span> : null}
        </Link>
        {open && kids.length ? <div className="sub">{kids.map(render)}</div> : null}
      </div>
    );
  }

  return (
    <nav className="nav" aria-label="Main">
      {NAV.map((g) => (
        <div key={g.label}>
          <div className="nav-label">{g.label}</div>
          {g.items.map(render)}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const { startNextStep } = useNextStep();
  return (
    <aside className="sidebar" id="sidebar" aria-label="Primary">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/mark.svg" alt="" width={30} height={30} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
        <div className="lockup">
          <small>Invinsense</small>
          <strong>{PRODUCT.name}</strong>
        </div>
      </div>
      <Suspense fallback={<nav className="nav" aria-label="Main" />}>
        <Items onNavigate={onNavigate} />
      </Suspense>
      <div className="sidebar-foot">
        <button className="nav-item" id="nav-tour" type="button" onClick={() => startNextStep("getting-started")}>
          <Lifebuoy size={16} weight="bold" aria-hidden="true" />
          <span className="label">Guided tour</span>
        </button>
      </div>
    </aside>
  );
}
