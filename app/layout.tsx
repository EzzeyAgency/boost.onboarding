import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOOST Onboarding | Ezzey",
  description: "Start BOOST with Ezzey. Tell us about your business, connect your Google Business Profile, and set your growth goals.",
};

export const viewport: Viewport = { themeColor: "#1b2e37", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
