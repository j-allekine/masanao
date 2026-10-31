import { NavigationGuardProvider } from "@/components/workspace/navigation-guard";
import { cookies } from "next/headers";
import { SidebarStateProvider } from "@/components/ui/sidebar";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const appFont = Geist({
  variable: "--font-app-face",
  subsets: ["latin"],
});

const dataFont = Geist_Mono({
  variable: "--font-data-face",
  subsets: ["latin"],
});

const fontVariables = [
  appFont.variable,
  dataFont.variable,
].join(" ");

export const metadata: Metadata = {
  title: "Masanao | Municipal operations",
  description: "Local access for Masanao municipal operations.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const savedSidebar = (await cookies()).get("sidebar_state")?.value;
  const defaultOpen = savedSidebar === "true" ? true : savedSidebar === "false" ? false : undefined;
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col"><NavigationGuardProvider><SidebarStateProvider defaultOpen={defaultOpen}>{children}</SidebarStateProvider></NavigationGuardProvider></body>
    </html>
  );
}
