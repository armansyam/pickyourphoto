import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

let cachedGitInfo = null;

function getGitInfo() {
    if (cachedGitInfo) return cachedGitInfo;

    // 1. Cek environment variables (CI/CD, Vercel, Docker)
    const envHash = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || process.env.COMMIT_HASH || '';
    const envBranch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GIT_BRANCH || '';

    if (envHash) {
        cachedGitInfo = {
            hash: envHash.substring(0, 7),
            count: '',
            branch: envBranch || 'main'
        };
        return cachedGitInfo;
    }

    // 2. Fallback aman untuk development lokal
    try {
        const hash = execSync('git rev-parse --short HEAD', { 
            encoding: 'utf8', 
            timeout: 2000,
            stdio: ['ignore', 'pipe', 'ignore'] 
        }).trim();
        const count = execSync('git rev-list --count HEAD', { 
            encoding: 'utf8', 
            timeout: 2000,
            stdio: ['ignore', 'pipe', 'ignore'] 
        }).trim();
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { 
            encoding: 'utf8', 
            timeout: 2000,
            stdio: ['ignore', 'pipe', 'ignore'] 
        }).trim();

        cachedGitInfo = { hash, count, branch };
        return cachedGitInfo;
    } catch (err) {
        // Fallback gracefully tanpa memblokir runtime
        cachedGitInfo = { hash: '', count: '', branch: 'main' };
        return cachedGitInfo;
    }
}

function getAppVersion() {
    try {
        const pkgPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            return pkg.version || '0.1.0';
        }
    } catch (err) {
        console.warn('[Version-Read-Warning]:', err.message);
    }
    return '0.1.0';
}

export async function GET() {
    try {
        const isEnabled = process.env.NEXT_PUBLIC_SHOW_DEV_CREDIT !== 'false';
        const git = getGitInfo();
        const version = getAppVersion();
        const buildTag = git.count && git.hash 
            ? ` (#${git.count} · ${git.hash})` 
            : (git.hash ? ` (${git.hash})` : '');

        return NextResponse.json({
            enabled: isEnabled,
            appName: 'Pick Your Photo',
            version: version,
            commitHash: git.hash || null,
            commitCount: git.count ? parseInt(git.count, 10) : null,
            branch: git.branch || 'main',
            release: `v${version}${buildTag}`,
            stack: 'Designed, built, and optimized with Next.js, SQLite, and custom styling.',
            status: 'Active Release',
            developer: {
                name: 'AMS Developer',
                githubUrl: 'https://github.com/armansyam',
                logo: '/branding/ams-logo.png'
            },
            timestamp: new Date().toISOString()
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
            }
        });
    } catch (error) {
        return NextResponse.json({
            enabled: process.env.NEXT_PUBLIC_SHOW_DEV_CREDIT !== 'false',
            version: '0.1.0',
            release: 'v0.1.0',
            stack: 'Designed, built, and optimized with Next.js, SQLite, and custom styling.',
            status: 'Active Release',
            developer: {
                name: 'AMS Developer',
                githubUrl: 'https://github.com/armansyam',
                logo: '/branding/ams-logo.png'
            }
        }, { status: 200 });
    }
}
