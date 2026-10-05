"use client";

import { useEffect, useRef, useState } from "react";
import { DotsNine, ShieldCheck } from "@phosphor-icons/react";
import { FAMILIES, PRODUCT } from "@/lib/families";

/* Placeholder for the shared navigator package fed by the entitlements API (Law 13). */
export function AppsMenu() {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="pop-anchor">
      <button ref={btn} className="icon-btn" id="btn-apps" type="button" aria-label="Apps" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <DotsNine size={18} weight="bold" aria-hidden="true" />
      </button>
      {open ? (
        <div className="popover">
          {FAMILIES.map((f) => (
            <section key={f.id} className={`family fam-${f.id}`}>
              <h3>{f.name}</h3>
              <div className="tiles">
                {f.products.map((p) => (
                  <a key={p} className={`tile${f.id === PRODUCT.family && p === PRODUCT.name ? " current" : ""}`} href="#" title={p}>
                    <ShieldCheck size={24} weight="bold" aria-hidden="true" />
                    <span>{p}</span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
