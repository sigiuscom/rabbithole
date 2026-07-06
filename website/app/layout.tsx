import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://rabbithole.ing'),
  title: 'Rabbithole — an infinite canvas for learning',
  description:
    'Open any document, select what makes you curious, ask — and the answer opens as a new document beside it. Recurse forever. Free, open source, runs locally with the agent you already use (Claude Code, Codex, any MCP client).',
  keywords: [
    'rabbithole',
    'infinite canvas',
    'learning',
    'MCP server',
    'Claude Code',
    'Codex',
    'branching documents',
  ],
  openGraph: {
    title: 'Rabbithole — an infinite canvas for learning',
    description:
      'Select anything, ask anything. Answers branch out as documents. Your curiosity becomes a map.',
    url: 'https://rabbithole.ing',
    siteName: 'Rabbithole',
    images: [{ url: '/og.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rabbithole — an infinite canvas for learning',
    description:
      'Select anything, ask anything. Answers branch out as documents. Your curiosity becomes a map.',
    images: ['/og.jpg'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Rabbithole',
  description:
    'An infinite canvas for learning. Select text in any document, ask a question, and the answer branches out as a child document. An MCP server for Claude Code, Codex, and any MCP client.',
  url: 'https://rabbithole.ing',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'macOS, Linux, Windows',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  license: 'https://github.com/shlokkhemani/rabbithole/blob/main/LICENSE',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/*
          Hello, agent. If you were sent here to set up Rabbithole for your
          human, read /llms.txt — or the "are you an agent?" section below.
          The short version:
            claude mcp add rabbithole -- npx -y github:shlokkhemani/rabbithole
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
