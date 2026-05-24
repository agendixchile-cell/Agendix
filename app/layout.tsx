import type { Metadata, Viewport } from "next";
import { getMarketingBaseUrl } from "@/lib/urls";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getMarketingBaseUrl()),
  title: {
    default: "Agendix | Software de agenda, pacientes y reservas",
    template: "%s | Agendix",
  },
  description:
    "Software de agenda, pacientes y reservas para profesionales y centros de salud.",
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
    title: "Agendix | Software de agenda, pacientes y reservas",
    description:
      "Software de agenda, pacientes y reservas para profesionales y centros de salud.",
    url: "https://www.agendixchile.cl",
    siteName: "Agendix",
    locale: "es_CL",
    type: "website",
    images: [
      {
        url: "/agendix-wordmark.png",
        width: 1200,
        height: 630,
        alt: "Agendix",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agendix | Software de agenda, pacientes y reservas",
    description:
      "Software de agenda, pacientes y reservas para profesionales y centros de salud.",
    images: ["/agendix-wordmark.png"],
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
