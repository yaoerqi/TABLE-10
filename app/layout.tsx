import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Market",
  description: "Second-hand marketplace for university students"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
