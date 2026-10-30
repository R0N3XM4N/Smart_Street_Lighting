import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Street Lighting",
  description: "Street-lighting operations, energy and schedule dashboard.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
