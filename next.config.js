/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
        // Skip ESLint check during production build to save RAM/CPU on low-spec servers
        ignoreDuringBuilds: true,
    },
};

module.exports = nextConfig;