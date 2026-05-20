import type { Metadata, Viewport } from "next";
import { getMarketingBaseUrl } from "@/lib/urls";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getMarketingBaseUrl()),
  title: {
    default: "Agendix | Agenda, reservas y pacientes para centros de salud",
    template: "%s | Agendix",
  },
  description:
    "Agenda para profesionales de la salud y centros médicos. Gestiona reservas, pacientes, profesionales, citas médicas y operación diaria en un solo software.",
  keywords: [
    "agenda para profesionales de la salud",
    "software de reservas",
    "gestión de pacientes",
    "agenda para centros de salud",
    "gestión de citas médicas",
    "software de agendamiento",
    "agenda clínica",
  ],
  openGraph: {
    title: "Agendix | Agenda, reservas y pacientes para centros de salud",
    description:
      "Centraliza agenda clínica, reservas online, pacientes y equipo en un solo software para profesionales y centros de salud.",
    url: "https://www.agendixchile.cl",
    siteName: "Agendix",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agendix | Agenda, reservas y pacientes para centros de salud",
    description:
      "Software de agenda clínica, reservas online y gestión de pacientes para profesionales y centros de salud.",
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/icon.png",
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAFAF8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
