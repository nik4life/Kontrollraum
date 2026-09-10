import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./v1.css";
import "./v2.css";

export const metadata: Metadata = {
  title: "Kontrollraum",
  description: "Intuitive Unternehmenssoftware für kleine Betriebe",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f5f7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
