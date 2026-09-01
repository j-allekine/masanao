import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const bodyFont = Inter({
  variable: "--font-body-face",
  subsets: ["latin"],
});

const headingFont = Geist({
  variable: "--font-heading-face",
  subsets: ["latin"],
});

const dataFont = Geist_Mono({
  variable: "--font-data-face",
  subsets: ["latin"],
});

const fontVariables = [
  bodyFont.variable,
  headingFont.variable,
  dataFont.variable,
].join(" ");

export const metadata: Metadata = {
  title: "Masanao | Municipal operations",
  description: "Local access for Masanao municipal operations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
