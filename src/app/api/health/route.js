import { NextResponse } from 'next/server';
import { dbExecute } from '../../../../utils/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const checkDb = searchParams.get('db') === '1';

  let dbStatus = 'skipped';
  let dbLatencyMs = null;

  if (checkDb) {
    const start = Date.now();
    try {
      await dbExecute({ sql: 'SELECT 1 AS alive', args: [] });
      dbLatencyMs = Date.now() - start;
      dbStatus = 'connected';
    } catch (err) {
      dbStatus = 'error';
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp: Date.now(),
          uptime: process.uptime(),
          database: { status: dbStatus, error: err.message },
        },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    database: { status: dbStatus, latencyMs: dbLatencyMs },
  });
}
