
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Required for static site generation for Wails
  // Note: The `next export` command has been removed in favor of the `output: 'export'` option in next.config.js.
  // Learn more here: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
  typescript: { 
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Required for `next export` if next/image is used
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
