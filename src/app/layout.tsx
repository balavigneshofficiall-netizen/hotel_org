import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import BottomNavigation from "@/components/BottomNavigation";
import PullToRefresh from "@/components/PullToRefresh";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hotel Annapoorna · Digital QR Menu & Ordering",
  description:
    "Order gourmet food directly from your table. Scan, browse our chef-crafted menu, customize dishes, and track your order in real-time.",
  applicationName: "Hotel Annapoorna QR",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Annapoorna QR",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#12372A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF9F6] text-[#171717]">
        <CartProvider>
          <PullToRefresh>
            {/* Full width container: mobile on phones, rich expansive layout on laptops/desktops */}
            <div className="flex-1 w-full min-h-screen bg-[#FAF9F6] relative flex flex-col">
              {children}
              {/* Bottom navigation: only on mobile screens */}
              <BottomNavigation />
            </div>
          </PullToRefresh>
        </CartProvider>
      </body>
    </html>
  );
}
