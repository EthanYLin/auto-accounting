import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";

import { siteConfig } from "@/constants/site";
import { Navbar } from "@/components/navbar/navbar";

// Font variables for Tailwind CSS (defined in globals.css)
const fontSans = { variable: "--font-sans" };
const fontMono = { variable: "--font-mono" };

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-dvh text-foreground bg-background font-sans antialiased",
          fontSans.variable,
          fontMono.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <div className="relative flex flex-col h-dvh">
            <Navbar />
            <main
              className="w-full flex-grow flex flex-col min-h-0"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
