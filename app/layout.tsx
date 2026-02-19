import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'VerifiedMeasure — Data Access Platform',
  description: 'Enterprise-grade lead data access with token-based entitlements.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface text-white antialiased">
        {children}
      </body>
    </html>
  );
}
