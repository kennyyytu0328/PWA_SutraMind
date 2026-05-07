/** @type {import('next').NextConfig} */
const basePath = process.env.BASE_PATH ?? ''

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
}

export default nextConfig
