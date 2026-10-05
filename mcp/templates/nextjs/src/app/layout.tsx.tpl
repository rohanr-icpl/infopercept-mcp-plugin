import type { Metadata } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TourProvider } from "@/components/tour/TourProvider";
import "./uix.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "__PRODUCT_NAME__ · Invinsense", template: "%s · __PRODUCT_NAME__ · Invinsense" },
  description: "__PRODUCT_NAME__, part of the Invinsense suite.",
  icons: { icon: "/assets/mark.svg" },
};

/* Restore the saved theme before first paint (section 08). */
const themeInit = `(function(){try{var t=localStorage.getItem("__ID__-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">{themeInit}</Script>
        <TourProvider>{children}</TourProvider>
      </body>
    </html>
  );
}
