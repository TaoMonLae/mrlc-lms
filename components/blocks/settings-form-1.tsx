"use client";

import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router";

export type FieldbookSettingsItem = {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  path: string;
};

type FieldbookSettingsFrameProps = {
  activePath: string;
  children: ReactNode;
  items: FieldbookSettingsItem[];
};

/** Production adaptation of React Bits Pro settings-form-1. */
export default function FieldbookSettingsFrame({
  activePath,
  children,
  items,
}: FieldbookSettingsFrameProps) {
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activePath]);

  return (
    <section className="border border-border bg-card" aria-labelledby="settings-heading">
      <header className="grid border-b border-foreground lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="px-5 py-6 sm:px-7 sm:py-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-academic-teal">
            Administration / control desk
          </p>
          <h1 id="settings-heading" className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            School settings
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Keep identity, access, data and system operations in one auditable place.
          </p>
        </div>
        <div className="flex items-end justify-between gap-5 border-t border-foreground bg-academic-gold px-5 py-5 text-academic-navy-deep lg:border-l lg:border-t-0 sm:px-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em]">System ledger</p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.02em]">Changes stay scoped to this school.</p>
          </div>
          <SlidersHorizontal className="size-6 shrink-0" aria-hidden="true" />
        </div>
      </header>

      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="overflow-x-auto border-b border-border bg-muted/45 p-3 lg:min-h-[620px] lg:border-b-0 lg:border-r lg:p-4">
          <div className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
            {items.map((item, index) => {
              const active = activePath.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  ref={active ? activeItemRef : undefined}
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-h-11 items-center gap-3 border px-3 py-2 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-full ${
                    active
                      ? "border-academic-navy-deep bg-academic-navy-deep text-white"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground"
                  }`}
                >
                  <span className={`font-mono text-[10px] ${active ? "text-academic-gold" : "text-muted-foreground"}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon className="size-4 shrink-0" aria-hidden={true} />
                  <span className="whitespace-nowrap lg:min-w-0 lg:flex-1 lg:whitespace-normal">{item.label}</span>
                  {active && <ChevronRight className="hidden size-3.5 shrink-0 lg:block" aria-hidden="true" />}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 bg-card">{children}</div>
      </div>
    </section>
  );
}
