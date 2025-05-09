
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
  // Removed custom port for next dev to defer to package.json script
  // Refer to https://nextjs.org/docs/pages/api-reference/next-config-js/dev
};

export default nextConfig;
