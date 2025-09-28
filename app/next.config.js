/* eslint-disable @typescript-eslint/no-require-imports */

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
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
      {
        // Extracts the hostname from the Supabase URL environment variable.
        // The hostname is expected to be in the format: [project_id].supabase.co
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost').hostname,
      },
    ],
  },
}

module.exports = withBundleAnalyzer(nextConfig)
