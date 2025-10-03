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
  experimental: {
    // This is required to fix a critical dependency issue with genkit.
    serverComponentsExternalPackages: [
      '@google-cloud/firestore',
      '@opentelemetry/api',
      '@opentelemetry/sdk-trace-base',
      '@opentelemetry/sdk-trace-node',
      'firebase-admin',
      'long',
      'protobufjs',
    ],
  },
}

module.exports = nextConfig
