"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#161e1a",
            color: "#e6f0ea",
            border: "1px solid #1f2a24",
          },
          success: { iconTheme: { primary: "#22c55e", secondary: "#0a0f0c" } },
        }}
      />
    </SessionProvider>
  );
}
