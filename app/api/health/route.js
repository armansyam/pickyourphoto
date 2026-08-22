import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Verify SQLite DB responsiveness
    const dbCheck = db.prepare('SELECT 1 as alive').get();
    const isDbAlive = dbCheck && dbCheck.alive === 1;

    // 2. Memory usage stats
    const mem = process.memoryUsage();

    return NextResponse.json({
      status: isDbAlive ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: isDbAlive ? 'connected' : 'error',
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      },
      version: '0.1.0'
    }, {
      status: isDbAlive ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return NextResponse.json({
      status: 'unhealthy',
      error: err.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
