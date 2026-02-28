"use client";

import { Toaster } from "sonner";

export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#0f172a",
          border: "1px solid #1e293b",
          color: "#f8fafc",
        },
        className: "sonner-toast",
      }}
    />
  );
}
