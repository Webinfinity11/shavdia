"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";

export type DialogName = "search" | "wishlist" | "cart";

type ShopContextValue = {
  dialog: DialogName | null;
  openDialog: (name: DialogName) => void;
  closeDialog: () => void;
  /** Called when the browser closed a dialog itself, for example with Escape */
  dialogDismissed: (name: DialogName) => void;
  showToast: (message: string) => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function useShop() {
  const value = use(ShopContext);
  if (!value) throw new Error("useShop must be used inside ShopProvider");
  return value;
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [toast, setToast] = useState({ message: "", visible: false });
  const toastTimer = useRef<number>(undefined);
  const opener = useRef<HTMLElement | null>(null);

  const openDialog = useCallback((name: DialogName) => {
    // Moving between dialogs keeps the element that opened the first one.
    if (!opener.current && document.activeElement instanceof HTMLElement) {
      opener.current = document.activeElement;
    }
    setDialog(name);
  }, []);

  const closeDialog = useCallback(() => setDialog(null), []);

  const dialogDismissed = useCallback((name: DialogName) => {
    setDialog((current) => (current === name ? null : current));
  }, []);

  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, visible: true });
    toastTimer.current = window.setTimeout(() => setToast((current) => ({ ...current, visible: false })), 3000);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dialog-open", dialog !== null);
    if (dialog === null && opener.current) {
      if (opener.current.isConnected) opener.current.focus({ preventScroll: true });
      opener.current = null;
    }
  }, [dialog]);

  const value = useMemo(
    () => ({ dialog, openDialog, closeDialog, dialogDismissed, showToast }),
    [dialog, openDialog, closeDialog, dialogDismissed, showToast],
  );

  return (
    <ShopContext value={value}>
      {children}
      <div className={`toast${toast.visible ? " is-visible" : ""}`} role="status" aria-live="polite" aria-atomic="true">
        {toast.message}
      </div>
    </ShopContext>
  );
}
