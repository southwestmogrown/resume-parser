import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PassStack — Resume analysis for people tired of ATS roulette",
  description:
    "Upload your resume, paste the job description, and get the real breakdown for $5 one time. No subscription. No account. No fluff.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500&family=Bricolage+Grotesque:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
