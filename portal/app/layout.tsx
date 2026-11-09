import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "livedock.", description: "Dein Tool sicher live bringen." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
