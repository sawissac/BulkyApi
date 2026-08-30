import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import DesktopOnlyGate from "@/components/DesktopOnlyGate";

export const metadata: Metadata = {
  title: "Bulky API",
  description: "JavaScript API automation client",
  applicationName: "Bulky API",
  appleWebApp: {
    capable: true,
    title: "Bulky API",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/bulky_api.ico", sizes: "any" },
      { url: "/bulky_api.png", type: "image/png", sizes: "1000x1000" },
    ],
    apple: [{ url: "/bulky_api.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      style={{ height: "100%", overflow: "hidden" }}
      suppressHydrationWarning
    >
      <body
        style={{ height: "100%", margin: 0, padding: 0, overflow: "hidden" }}
        suppressHydrationWarning
      >
        <DesktopOnlyGate>
          <Providers>{children}</Providers>
        </DesktopOnlyGate>
      </body>
    </html>
  );
}
