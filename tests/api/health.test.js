import { describe, expect, it, vi } from 'vitest';
import { GET } from '../../src/app/api/health/route';

describe('GET /api/health', () => {
  it('returns ok status without database check by default', async () => {
    const request = new Request('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.database.status).toBe('skipped');
    expect(typeof data.timestamp).toBe('number');
  });

  it('performs database connectivity check when db=1 is passed', async () => {
    const request = new Request('http://localhost:3000/api/health?db=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.database.status).toBe('connected');
    expect(typeof data.database.latencyMs).toBe('number');
  });
});
