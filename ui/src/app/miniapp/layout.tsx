import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ethos Trust Check",
  description: "Check reputation before vouching on Ethos Network",
  openGraph: {
    title: "Ethos Trust Check",
    description: "Check reputation before vouching on Ethos Network",
    images: ["https://ethos-vibeathon.vercel.app/api/og/start"],
    type: "website",
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://ethos-vibeathon.vercel.app/api/og/start",
    "fc:frame:button:1": "Open App",
    "fc:frame:button:1:action": "link",
    "fc:frame:button:1:target": "https://ethos-vibeathon.vercel.app/miniapp",
  },
};

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
