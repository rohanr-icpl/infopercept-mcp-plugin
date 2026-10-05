"use client";

import { useEffect, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { RAIL_KEY, readStore, writeStore } from "@/lib/theme";

/* One shell (Principle 1): fixed sidebar, fixed topbar, scrolling main content. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setCollapsed(readStore(RAIL_KEY) === "1");
  }, []);

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    document.body.classList.toggle("sidebar-open", sheetOpen);
  }, [collapsed, sheetOpen]);

  function toggle() {
    setCollapsed((c) => {
      writeStore(RAIL_KEY, c ? "0" : "1");
      return !c;
    });
  }

  return (
    <>
      <Sidebar onNavigate={() => setSheetOpen(false)} />
      <button className="sidebar-toggle" type="button" onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
        {collapsed ? <CaretRight size={14} weight="bold" /> : <CaretLeft size={14} weight="bold" />}
      </button>
      <Topbar onOpenMenu={() => setSheetOpen((o) => !o)} />
      <main className="content" id="main" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
