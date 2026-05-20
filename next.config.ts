import type { NextConfig } from "next";

const MARKETING_HOST_PATTERN = "^(?:www\\.)?agendixchile\\.cl$";
const MARKETING_APEX_HOST_PATTERN = "^agendixchile\\.cl$";
const MARKETING_HOME = "https://www.agendixchile.cl/";
const APP_HOME = "https://app.agendixchile.cl";
const APP_ONLY_AUTH_PREFIXES = ["login", "register", "auth"];
const APP_ONLY_PREFIXES = [
  "dashboard",
  "agenda",
  "centro",
  "salas",
  "profesionales",
  "servicios",
  "reservas",
  "pacientes",
  "fichas-clinicas",
];

function hostHas(value: string) {
  return [{ type: "host" as const, value }];
}

const nextConfig: NextConfig = {
  async redirects() {
    const appOnlyAuthRedirects = APP_ONLY_AUTH_PREFIXES.flatMap((prefix) => [
      {
        source: `/${prefix}`,
        destination: `${APP_HOME}/${prefix}`,
        permanent: false,
        has: hostHas(MARKETING_HOST_PATTERN),
      },
      {
        source: `/${prefix}/:path*`,
        destination: `${APP_HOME}/${prefix}/:path*`,
        permanent: false,
        has: hostHas(MARKETING_HOST_PATTERN),
      },
    ]);

    const protectedMarketingRedirects = APP_ONLY_PREFIXES.flatMap((prefix) => [
      {
        source: `/${prefix}`,
        destination: MARKETING_HOME,
        permanent: false,
        has: hostHas(MARKETING_HOST_PATTERN),
      },
      {
        source: `/${prefix}/:path*`,
        destination: MARKETING_HOME,
        permanent: false,
        has: hostHas(MARKETING_HOST_PATTERN),
      },
    ]);

    return [
      ...appOnlyAuthRedirects,
      ...protectedMarketingRedirects,
      {
        source: "/:path*",
        destination: "https://www.agendixchile.cl/:path*",
        permanent: true,
        has: hostHas(MARKETING_APEX_HOST_PATTERN),
      },
    ];
  },
};

export default nextConfig;
