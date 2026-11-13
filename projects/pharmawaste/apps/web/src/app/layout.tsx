import './globals.css';
import type { Metadata } from 'next';
import { QueryProvider } from '@/components/QueryProvider';

export const metadata: Metadata = {
  title: 'PharmaWaste | Gestão Preditiva de Validades & Prevenção de Desperdício',
  description: 'Plataforma B2B para farmácias comunitárias: erradique o desperdício de medicamentos e recupere liquidez.',
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
