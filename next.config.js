/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // A fix for wasm files not being loaded correctly.
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.output.webassemblyModuleFilename = (isServer ? '../' : '') + 'static/wasm/[modulehash].wasm';

    return config;
  },
}

module.exports = nextConfig
