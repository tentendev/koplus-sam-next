import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ConsentBanner from "@/components/ConsentBanner";

export const metadata: Metadata = {
  title: "Koplus Booth Configurator",
  icons: { icon: "/assets/koplus-favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Cal Sans — series heading + product title. Noto Sans — tagline/body.
            Loaded as global Google Fonts so the configurator's font-['Cal_Sans']
            / font-['Noto_Sans'] utility classes resolve by family name. */}
        <link
          rel="preconnect"
          href="https://kolo-website.s3.eu-west-1.amazonaws.com"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cal+Sans&family=Noto+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        <Script
          src="https://cdn.tailwindcss.com"
          strategy="beforeInteractive"
        />
        {/* Consent Mode v2 — runs BEFORE gtag.js loads (beforeInteractive executes
            in placement order, ahead of any Next.js code). Analytics/ads storage
            default to 'denied'; the ConsentBanner flips analytics_storage to
            'granted' only after the visitor accepts. A prior choice stored in
            localStorage is re-applied here so returning visitors aren't re-prompted. */}
        <Script id="ga4-consent" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500
});
try {
  if (localStorage.getItem('koplus-cookie-consent') === 'granted') {
    gtag('consent', 'update', { analytics_storage: 'granted' });
  }
} catch (e) {}`}
        </Script>
        {/* Google tag (gtag.js) — GA4 property G-1NE4ZT9T7G. Reports to the same
            GA4 as koplus.com so configurator traffic + conversions roll up together.
            Gated by the Consent Mode defaults above. */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1NE4ZT9T7G"
          strategy="afterInteractive"
        />
        <Script id="ga4-gtag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-1NE4ZT9T7G');`}
        </Script>
      </head>
      <body className="min-h-screen bg-white text-gray-900">
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}
