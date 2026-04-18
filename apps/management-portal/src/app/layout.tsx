import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Management Portal — School ERP",
  description: "Multi-school management & SaaS analytics dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
