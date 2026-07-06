/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pure static export: the whole site is one page + assets, deployable
  // anywhere (Vercel, Pages, a bucket). No server required.
  output: 'export',
};

export default nextConfig;
