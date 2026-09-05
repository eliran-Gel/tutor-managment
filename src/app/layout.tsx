import type { Metadata, Viewport } from "next";
import { Rubik, Frank_Ruhl_Libre } from "next/font/google";
import { cookies } from "next/headers";
import { IosActiveFix } from "@/components/ios-active-fix";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

// A real Hebrew-supporting display face for headings/stat numbers (see
// --font-display in globals.css). Design-refresh: Suez One (single-weight,
// fairly generic-feeling) swapped for Frank Ruhl Libre - a genuine Hebrew
// editorial serif with real character across a weight range, still with
// real Hebrew glyph support (unlike Outfit, the original pick, which was
// invisible on every Hebrew heading and only ever rendered on digits).
const frankRuhl = Frank_Ruhl_Libre({
  variable: "--font-frank-ruhl",
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.elirangelberg.com"),
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
    url: "https://app.elirangelberg.com",
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
      className={`${rubik.variable} ${frankRuhl.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text-primary">
        <IosActiveFix />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
