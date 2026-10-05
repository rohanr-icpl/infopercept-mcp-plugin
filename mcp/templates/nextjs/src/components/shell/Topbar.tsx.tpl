"use client";

import { Bell, Buildings, Lifebuoy, List } from "@phosphor-icons/react";
import { useNextStep } from "nextstepjs";
import { useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { AppsMenu } from "./AppsMenu";
import { PRODUCT } from "@/lib/families";

const TOUR_KEY = "__ID__-tour-done";

/* Fixed control order (section 02): tenant, notifications, guided tour, theme, apps, user chip. */
export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { startNextStep } = useNextStep();

  useEffect(() => {
    let done = false;
    try {
      done = localStorage.getItem(TOUR_KEY) === "1";
      if (!done) localStorage.setItem(TOUR_KEY, "1");
    } catch {
      done = true;
    }
    if (!done) {
      const t = setTimeout(() => startNextStep("getting-started"), 500);
      return () => clearTimeout(t);
    }
  }, [startNextStep]);

  return (
    <header className="topbar" id="topbar">
      <button className="icon-btn menu-btn" type="button" aria-label="Open navigation" onClick={onOpenMenu}>
        <List size={20} weight="bold" aria-hidden="true" />
      </button>
      <span className="spacer" />
      {PRODUCT.multiTenant ? (
        <button className="icon-btn" id="btn-tenant" type="button" aria-label="Switch tenant">
          <Buildings size={20} weight="bold" aria-hidden="true" />
        </button>
      ) : null}
      <button className="icon-btn" id="btn-bell" type="button" aria-label="Notifications">
        <Bell size={20} weight="bold" aria-hidden="true" />
        <span className="count num">3</span>
      </button>
      <button className="icon-btn" id="btn-tour" type="button" aria-label="Guided tour" onClick={() => startNextStep("getting-started")}>
        <Lifebuoy size={20} weight="bold" aria-hidden="true" />
      </button>
      <ThemeToggle />
      <AppsMenu />
      <button className="avatar" id="btn-user" type="button" aria-label="Account">U</button>
    </header>
  );
}
