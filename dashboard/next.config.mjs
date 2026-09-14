/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Served alongside the static marketing site (index.html, about.html, ...)
  // under one Vercel project — see root vercel.json. Keep in sync with
  // BASE_PATH in src/lib/basePath.ts.
  basePath: "/dashboard",
};

export default nextConfig;
