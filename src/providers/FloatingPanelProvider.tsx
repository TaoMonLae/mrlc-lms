import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";

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
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  // Collapse whichever panel is open whenever the user navigates to a
  // different page -- otherwise the expanded Chat/AI panel stays parked on
  // top of the new page's content until manually closed.
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      setActive(null);
    }
  }, [location.pathname]);

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
