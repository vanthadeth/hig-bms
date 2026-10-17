import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-khmer"; // Khmer glyphs; Latin text uses the brand typeface, Arial
import "./globals.css";
import { getLocale } from "@/i18n/server";
import { LocaleProvider } from "@/i18n/client";
import { PwaProvider } from "@/components/pwa/pwa-provider";

export const metadata: Metadata = {
  title: { default: "HIG Admin", template: "%s · HIG Admin" },
  applicationName: "HIG Admin",
  description: "HIG users, roles and permissions",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/icons/favicon-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "HIG Admin", statusBarStyle: "default" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // no pinch zoom (product requirement); inputs are 16px so iOS does not zoom on focus either
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121820" },
  ],
};

// Runs before first paint so an explicit light/dark choice never flashes the other theme.
const THEME_INIT = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <LocaleProvider locale={locale}>
          <PwaProvider>{children}</PwaProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
