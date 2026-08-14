"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  currentSaleFlow,
  currentTheme,
  subscribeToSettings,
  type SaleFlowOrder,
  type Theme,
} from "@/lib/settings";

/** Server snapshot "system": the server can't know; the pre-paint script
 *  in layout.tsx already made the FIRST paint right. */
export const useTheme = (): Theme =>
  useSyncExternalStore<Theme>(subscribeToSettings, currentTheme, () => "system");

/**
 * The one place the theme touches the DOM. Mounted once at the top
 * (UploadScreen, next to the <html lang> sync). While on "system" it
 * follows the OS live — flipping the phone to dark at sunset flips the
 * app without a reload.
 */
export const useApplyTheme = (): void => {
  const theme = useTheme();
  useEffect(() => {
    const apply = () => {
      const dark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    if (theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);
};

export const useSaleFlow = (): SaleFlowOrder =>
  useSyncExternalStore<SaleFlowOrder>(
    subscribeToSettings,
    currentSaleFlow,
    () => "products-first",
  );
