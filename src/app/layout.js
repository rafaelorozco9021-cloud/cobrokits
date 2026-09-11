import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CobroKits SaaS — Control total de ventas en calle y recaudos",
  description:
    "Administra vendedores de ruta, controla mercancía en campo, elimina pérdidas de inventario y cuadra la caja diaria. Offline-first, GPS y cobranza a crédito. Un mes gratis.",
  keywords: ["cobranza", "ventas en calle", "distribución", "SaaS", "GPS", "inventario móvil", "CobroKits"],
  openGraph: {
    title: "CobroKits SaaS — Ventas en calle sin fugas",
    description: "Plataforma para distribuidores puerta a puerta. Control de stock móvil, crédito y caja diaria.",
    type: "website",
    locale: "es_DO",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}>
      <body className="min-h-full flex flex-col bg-slate-900 text-slate-100">{children}</body>
    </html>
  );
}
