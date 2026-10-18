import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./App.tsx";

// Polyfill window.atob to safely handle unpadded base64url formats (common in Safari/Supabase client)
if (typeof window !== "undefined" && typeof window.atob === "function") {
  const originalAtob = window.atob;
  window.atob = function (str: string) {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    try {
      return originalAtob(base64);
    } catch (e) {
      return originalAtob(str);
    }
  };
}

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Analytics />
    <SpeedInsights />
  </>
);

