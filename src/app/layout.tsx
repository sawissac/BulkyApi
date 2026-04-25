import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Bulky API",
  description: "JavaScript API automation client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: '100%', overflow: 'hidden' }}>
      <body style={{ height: '100%', margin: 0, padding: 0, overflow: 'hidden' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
