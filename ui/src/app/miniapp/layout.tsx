import type { Metadata } from "next";

const miniAppEmbed = {
  version: "1",
  imageUrl: "https://ethos-vibeathon.vercel.app/api/og/start",
  button: {
    title: "Check Trust Score",
    action: {
      type: "launch_miniapp",
      url: "https://ethos-vibeathon.vercel.app/miniapp",
      name: "Ethos Trust Check",
      splashImageUrl: "https://ethos-vibeathon.vercel.app/api/og/start",
      splashBackgroundColor: "#0a0a0a",
    },
  },
};

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
    "fc:miniapp": JSON.stringify(miniAppEmbed),
    "fc:frame": JSON.stringify(miniAppEmbed),
  },
};

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
