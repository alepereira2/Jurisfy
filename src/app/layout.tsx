import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jurisfy | ERP Financeiro para Escritórios de Advocacia",
  description: "Sistema de Gestão Financeira, DRE Caixa/Competência, Conciliação Bancária e BI Jurídico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-slate-100 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
