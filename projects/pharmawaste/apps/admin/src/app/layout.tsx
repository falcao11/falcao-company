import './globals.css';
import type { Metadata } from 'next';
import { QueryProvider } from '@/components/QueryProvider';

export const metadata: Metadata = {
  title: 'PharmaWaste Admin | Painel Falcão Company',
  description:
    'Consola de gestão SaaS: farmácias, utilizadores, pedidos de conta, demonstrações e subscrições.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
