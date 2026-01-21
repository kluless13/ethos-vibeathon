import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const satoshi = localFont({
  src: [
    {
      path: "../fonts/Satoshi-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Satoshi-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/Satoshi-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

const recoleta = localFont({
  src: "../fonts/Recoleta-Regular.otf",
  variable: "--font-recoleta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trust Ring Detector | Ethos Network",
  description: "Detect collusion patterns in the Ethos vouch network. Check profiles before staking your ETH.",
  openGraph: {
    title: "Trust Ring Detector",
    description: "Should you vouch for this person? Check for collusion patterns first.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${satoshi.variable} ${recoleta.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
