import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE } from "@/lib/constants";
import PrivyProvider from "@/providers/privy-provider";
import QueryProvider from "@/providers/query-provider";
import { NetworkWrapper } from "@/components/network-wrappers";
import ErrorSuppressor from "@/components/suppressor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: SITE.name,
  description: SITE.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ErrorSuppressor />
        <QueryProvider>
          <PrivyProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <NetworkWrapper>{children}</NetworkWrapper>
            </ThemeProvider>
          </PrivyProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
