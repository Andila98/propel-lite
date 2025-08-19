
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ohpverffrwflwksxoljv.supabase.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
