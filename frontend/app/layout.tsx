import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "GrowEasy · AI CSV Importer",
  description:
    "Upload any CSV and let AI map it into the GrowEasy CRM format — intelligent field mapping for messy, real-world lead exports.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
