import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

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
        {/* Google tag (gtag.js) — GA4 property G-1NE4ZT9T7G. Reports to the same
            GA4 as koplus.com so configurator traffic + conversions roll up together. */}
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
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  );
}
