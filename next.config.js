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
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // For Firebase Storage images
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com', // Alternative Firebase Storage domain
      },
    ],
  },
}

module.exports = nextConfig
