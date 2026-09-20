import type { Metadata, Viewport } from "next";
import { Baloo_2, Caveat, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Aurora } from "@/components/Aurora";
import { AppShell } from "@/components/AppShell";
import { getMemberRoster } from "@/lib/queries";
import { isAdmin } from "@/lib/auth";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Chunky and rounded, for the "FriendlyFund" wordmark.
const baloo2 = Baloo_2({
  variable: "--font-baloo-2",
  subsets: ["latin"],
  weight: ["700", "800"],
});

// Handwritten script, for the "Small Contributions, Big Friendships" note.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "FriendlyFund",
  description: "Track what every friend has saved into the fund.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FriendlyFund",
  },
};

// Every screen reads live balances, so nothing is prerendered at build time.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#f0f8f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The picker in the entry sheet needs the roster on every screen.
  const [members, admin] = await Promise.all([getMemberRoster(), isAdmin()]);

  return (
    <html
      lang="en"
      className={`${nunitoSans.variable} ${baloo2.variable} ${caveat.variable} h-full`}
    >
      <body className="min-h-full">
        <Aurora />
        <AppShell members={members} isAdmin={admin}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
