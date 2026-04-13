/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: process.env.NODE_ENV === 'development',
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    
    // 生产环境优化
    compress: true,
    poweredByHeader: false,
    
    // 实验性功能
    experimental: {
        optimizePackageImports: ['@heroui/react'],
    },
    
    // 环境变量配置
    env: {
        APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
        APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
    },
};

module.exports = nextConfig;
