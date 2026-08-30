import type { Metadata, Viewport } from "next";
import { Rubik, Outfit } from "next/font/google";
import { cookies } from "next/headers";
import { IosActiveFix } from "@/components/ios-active-fix";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

// No Hebrew subset - Outfit doesn't have Hebrew glyphs at all. Used only
// for headings/stat numbers (see --font-display in globals.css), where it
// renders on digits/Latin text and silently falls back to Rubik for
// Hebrew, matching the marketing site's own (partly accidental) mixed look.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://elirangelberg.com"),
  title: {
    default: "אלירן גלברג - מורה פרטי | ניהול",
    template: "%s | אלירן גלברג - מורה פרטי",
  },
  description:
    "אלירן גלברג, מורה פרטי למתמטיקה, פיזיקה ומחשבים. קביעת שיעורים, מעקב התקדמות וסיכומי שיעור לתלמידים ולהורים.",
  keywords: ["אלירן גלברג", "מורה פרטי", "שיעורים פרטיים", "מתמטיקה", "פיזיקה", "מחשבים"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "אלירן גלברג - מורה פרטי",
    description: "מורה פרטי למתמטיקה, פיזיקה ומחשבים. קביעת שיעורים וניהול התקדמות לתלמידים ולהורים.",
    url: "https://elirangelberg.com",
    siteName: "אלירן גלברג - מורה פרטי",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "אלירן גלברג - מורה פרטי",
    description: "מורה פרטי למתמטיקה, פיזיקה ומחשבים.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "אלירן גלברג",
  },
};

export const viewport: Viewport = {
  themeColor: "#102a4c",
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get("theme")?.value;
  // No cookie yet = no explicit choice made -> let the
  // prefers-color-scheme media query in globals.css decide.
  const theme = cookieTheme === "dark" || cookieTheme === "light" ? cookieTheme : undefined;

  return (
    <html
      lang="he"
      dir="rtl"
      data-theme={theme}
      className={`${rubik.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text-primary">
        <IosActiveFix />
        {children}
      </body>
    </html>
  );
}
