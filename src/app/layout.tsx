import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { ChromeGate } from "@/components/layout/ChromeGate";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { ToastProvider } from "@/components/ui/toast";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * The single typeface (ADR-012). One variable family covers the whole product —
 * `--font-sans` for every UI surface and `--font-display` for marketing
 * headlines both resolve to it, and the weight axis is what separates them.
 *
 * It replaced Inter (product) plus Playfair Display (marketing display), so
 * one font file ships where two used to. `weight` is deliberately omitted:
 * Figtree is variable, and the whole 300–900 axis is what the display headings
 * use in place of the roman/italic pairing ADR-006 built.
 */
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Lets per-page `generateMetadata` (e.g. `/marketplace/[id]`, Task 2.5) set
  // relative `openGraph.images`/canonical URLs that Next resolves to
  // absolute ones — required for OpenGraph tags to be spec-valid.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PropLink UK — The UK Distressed Property Platform",
    template: "%s · PropLink UK",
  },
  description:
    "Distressed property marketplace, investor syndication, agent credibility and market intelligence — discovery to completion on one platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={`${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          {/* The `(auth)` routes carry their own full-bleed shell and suppress
              the global chrome — see `<ChromeGate>`. The cookie banner is not
              gated: consent has to be offered on every page. */}
          <ChromeGate>
            <SiteHeader />
          </ChromeGate>
          {children}
          <ChromeGate>
            <SiteFooter />
          </ChromeGate>
          <CookieBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
