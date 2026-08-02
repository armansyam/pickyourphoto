/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
        // Skip ESLint check during production build to save RAM/CPU on low-spec servers
        ignoreDuringBuilds: true,
    },
    // Nonaktifkan cache internal webpack saat development agar hot reload tidak menyisakan stale module
    webpack: (config, { dev }) => {
        if (dev) {
            config.cache = false;
        }
        return config;
    },
    // Perpanjang waktu halaman on-demand agar tidak di-recycle terlalu cepat saat dev
    onDemandEntries: {
        maxInactiveAge: 60 * 1000,
        pagesBufferLength: 5,
    },
};

module.exports = nextConfig;