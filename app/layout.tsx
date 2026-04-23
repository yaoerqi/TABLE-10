import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { WebPet } from "@/components/pet/WebPet";

export const metadata: Metadata = {
  title: "Campus Market",
  description: "Second-hand marketplace for university students"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Script
          // Cubism 4 core runtime required by pixi-live2d-display/cubism4
          src="/vendor/live2dcubismcore.js"
          strategy="beforeInteractive"
        />
        {children}
        <WebPet />
      </body>
    </html>
  );
}
