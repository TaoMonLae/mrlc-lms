import { createContext, useContext, useMemo, useState, ReactNode } from "react";

/**
 * Coordinates the app's floating bottom-right widgets (Chat, AI Assistant)
 * so at most one is expanded at a time. Without this, opening one panel
 * would leave the other widget's trigger button floating on top of it in
 * the same corner -- both widgets independently anchor to bottom-right.
 */
type FloatingPanelId = "chat" | "ai";

interface FloatingPanelContextValue {
  active: FloatingPanelId | null;
  open: (id: FloatingPanelId) => void;
  close: (id: FloatingPanelId) => void;
}

const FloatingPanelContext = createContext<FloatingPanelContextValue | null>(null);

export function FloatingPanelProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<FloatingPanelId | null>(null);

  const value = useMemo<FloatingPanelContextValue>(
    () => ({
      active,
      open: (id) => setActive(id),
      close: (id) => setActive((current) => (current === id ? null : current)),
    }),
    [active]
  );

  return <FloatingPanelContext.Provider value={value}>{children}</FloatingPanelContext.Provider>;
}

/** Returns whether `id`'s panel is open, plus a setter that opening one panel closes the other. */
export function useFloatingPanel(id: FloatingPanelId) {
  const ctx = useContext(FloatingPanelContext);
  if (!ctx) {
    throw new Error("useFloatingPanel must be used within a FloatingPanelProvider");
  }
  const isOpen = ctx.active === id;
  const isOtherOpen = ctx.active !== null && ctx.active !== id;
  const setOpen = (next: boolean) => (next ? ctx.open(id) : ctx.close(id));
  return { isOpen, isOtherOpen, setOpen };
}
