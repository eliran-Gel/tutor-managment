import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { cookies } from "next/headers";
import { IosActiveFix } from "@/components/ios-active-fix";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "אלירן גלברג - מורה פרטי | ניהול",
  description: "מערכת ניהול לעסק ההוראה הפרטית",
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
      className={`${rubik.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text-primary">
        <IosActiveFix />
        {children}
      </body>
    </html>
  );
}
