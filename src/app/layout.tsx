import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Singapore Law Atlas",
    template: "%s · Singapore Law Atlas",
  },
  description:
    "Singapore Law Atlas maps written law (Penal Code, Constitution, Civil Law Act, and other codes) and case law as a connected research graph — open statutes, follow precedents, ask citation-grounded questions, and analyse depositions.",
  applicationName: "Singapore Law Atlas",
  authors: [{ name: "Edmund Lim" }],
  openGraph: {
    title: "Singapore Law Atlas",
    description:
      "Graph-first research workspace for Singapore written law and judgments.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f1ed" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c0f" },
  ],
};

// Applies the stored theme before first paint so the app never flashes light.
const themeScript = `(()=>{try{const s=localStorage.getItem("sla-theme");const d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-ink">
        <a
          href="#atlas-main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-ink"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
