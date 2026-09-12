import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../src/lib/auth-context';

export const metadata: Metadata = {
  title: 'SICP - Societal Innovation Collaboration Portal',
  description: 'Connecting citizens, government, universities, and industry to solve societal challenges.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}