import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { CrownMark } from "@/components/brand/crown-mark";

import "./globals.css";
import "./media.css";

export const metadata: Metadata = {
  title: {
    default: "Sartoria",
    template: "%s · Sartoria",
  },
  description: "A private wardrobe and personal style system.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="app-shell">
          <header className="site-header">
            <Link aria-label="Sartoria home" className="brand" href="/">
              <CrownMark className="brand-mark" />
              <span className="brand-copy">
                <span className="brand-name">Sartoria</span>
                <span className="brand-motto">Elegantia in Simplicitate</span>
              </span>
            </Link>
            <nav aria-label="Primary navigation" className="primary-navigation">
              <Link href="/wardrobe">Wardrobe</Link>
              <span aria-disabled="true">Outfits</span>
              <span aria-disabled="true">Planning</span>
              <span aria-disabled="true">Insights</span>
            </nav>
            <button aria-label="Open account menu" className="account-button" type="button">
              JV
            </button>
          </header>
          <main id="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
