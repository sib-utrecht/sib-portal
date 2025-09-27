/** @type {import('next').NextConfig} */
const basePathEnv = process.env.NEXT_PUBLIC_BASE_PATH
// Only set basePath/assetPrefix when provided; basePath must be undefined (not empty string) when unused
const basePath = basePathEnv && basePathEnv !== '/' ? basePathEnv : undefined
const assetPrefix = basePath ? `${basePath}/` : undefined

const nextConfig = {
  // Export a fully static site compatible with GitHub Pages
  output: 'export',
  trailingSlash: true,

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix,
}

export default nextConfig
