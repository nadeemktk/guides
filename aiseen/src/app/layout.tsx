import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PostHogProvider } from "@/components/layout/PostHogProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AISeen — AI Search Visibility for E-commerce",
    template: "%s | AISeen",
  },
  description:
    "Find out when ChatGPT, Perplexity, and Gemini recommend your store — and automatically fix your catalog to win more AI mentions.",
  openGraph: {
    title: "AISeen — AI Search Visibility for E-commerce",
    description:
      "Track how often AI assistants recommend your products and automatically fix your catalog.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
