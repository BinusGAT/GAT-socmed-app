import { describe, expect, it } from 'vitest';
import {
  MAX_REQUEST_BODY_BYTES,
  MAX_USER_AGENT_LENGTH,
  readJsonBody,
  RequestValidationError,
  sanitizeUserAgent,
  validatePayload,
} from '../../src/app/api/sheets/request-validation';

describe('API request validation', () => {
  it('accepts a normal action payload', () => {
    expect(validatePayload({ action: 'save_notification', params: { message: 'Hello' } }))
      .toEqual({ action: 'save_notification', params: { message: 'Hello' } });
  });

  it('rejects oversized declared and streamed request bodies', async () => {
    const declared = new Request('https://example.test/api', {
      method: 'POST',
      headers: { 'content-length': String(MAX_REQUEST_BODY_BYTES + 1) },
      body: '{}',
    });
    await expect(readJsonBody(declared)).rejects.toMatchObject({ status: 413 });

    const streamed = new Request('https://example.test/api', {
      method: 'POST',
      body: JSON.stringify({ action: 'save_script', params: { Script: 'x'.repeat(MAX_REQUEST_BODY_BYTES) } }),
    });
    await expect(readJsonBody(streamed)).rejects.toMatchObject({ status: 413 });
  });

  it('limits batch work and action-specific text fields', () => {
    expect(() => validatePayload({
      action: 'delete_batch',
      params: { rows: Array.from({ length: 101 }, (_, id) => ({ id })) },
    })).toThrow(RequestValidationError);

    expect(() => validatePayload({
      action: 'save_notification',
      params: { message: 'x'.repeat(2_001) },
    })).toThrow(/message must contain at most 2000 characters/);
  });

  it('allows bounded long-form scripts and caps stored User-Agent values', () => {
    expect(() => validatePayload({
      action: 'save_script',
      params: { Script: 'x'.repeat(20_000), Caption: 'caption' },
    })).not.toThrow();
    expect(sanitizeUserAgent('x'.repeat(1_000))).toHaveLength(MAX_USER_AGENT_LENGTH);
  });
});
