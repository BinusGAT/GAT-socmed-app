export const MAX_REQUEST_BODY_BYTES = 256 * 1024;
export const MAX_USER_AGENT_LENGTH = 512;

const MAX_ACTION_LENGTH = 64;
const MAX_OBJECT_KEYS = 100;
const MAX_ARRAY_LENGTH = 200;
const MAX_NESTING_DEPTH = 6;
const MAX_DEFAULT_STRING_LENGTH = 16_384;

const ACTION_LIMITS = Object.freeze({
  create: { strings: { URL: 2_048 } },
  update: { strings: { URL: 2_048 } },
  delete_batch: { arrays: { rows: 100 } },
  save_meeting: {
    arrays: { Attendees: 200, attendees: 200, Absentees: 200, absentees: 200 },
    strings: { Recap: 100_000, recap: 100_000, VideoRecap: 2_048, videoRecap: 2_048 },
  },
  save_script: {
    strings: {
      Script: 100_000, script: 100_000,
      Caption: 10_000, caption: 10_000,
      Hook: 10_000, hook: 10_000,
      References: 20_000, references: 20_000,
    },
  },
  save_notification: { strings: { message: 2_000 } },
  save_app_settings: { objects: { settings: 100 } },
  save_platform: { strings: { logo_url: 2_048 } },
});

export class RequestValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'RequestValidationError';
    this.status = status;
  }
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function validateStructure(value, stringLimits, field = '', depth = 0) {
  if (depth > MAX_NESTING_DEPTH) throw new RequestValidationError('Request data is nested too deeply');
  const maximumStringLength = stringLimits[field] || MAX_DEFAULT_STRING_LENGTH;
  if (typeof value === 'string' && value.length > maximumStringLength) {
    throw new RequestValidationError('Request contains a string that is too long');
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) throw new RequestValidationError('Request contains too many array items');
    value.forEach((item) => validateStructure(item, stringLimits, field, depth + 1));
    return;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > MAX_OBJECT_KEYS) throw new RequestValidationError('Request object has too many fields');
    entries.forEach(([key, item]) => validateStructure(item, stringLimits, key, depth + 1));
  }
}

function validateActionLimits(action, params) {
  const limits = ACTION_LIMITS[action];
  if (!limits) return;
  for (const [field, maximum] of Object.entries(limits.arrays || {})) {
    if (params[field] !== undefined && (!Array.isArray(params[field]) || params[field].length > maximum)) {
      throw new RequestValidationError(`${field} must contain at most ${maximum} items`);
    }
  }
  for (const [field, maximum] of Object.entries(limits.objects || {})) {
    if (params[field] !== undefined && (
      !params[field] || Array.isArray(params[field]) || typeof params[field] !== 'object'
      || Object.keys(params[field]).length > maximum
    )) {
      throw new RequestValidationError(`${field} must contain at most ${maximum} entries`);
    }
  }
  for (const [field, maximum] of Object.entries(limits.strings || {})) {
    if (params[field] !== undefined && (typeof params[field] !== 'string' || params[field].length > maximum)) {
      throw new RequestValidationError(`${field} must contain at most ${maximum} characters`);
    }
  }
}

export function validatePayload(payload) {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    throw new RequestValidationError('Request body must be a JSON object');
  }
  if (typeof payload.action !== 'string' || !payload.action || payload.action.length > MAX_ACTION_LENGTH) {
    throw new RequestValidationError('Invalid action');
  }
  const params = payload.params ?? {};
  if (!params || Array.isArray(params) || typeof params !== 'object') {
    throw new RequestValidationError('params must be a JSON object');
  }

  validateActionLimits(payload.action, params);
  validateStructure(payload, ACTION_LIMITS[payload.action]?.strings || {});
  return { action: payload.action, params };
}

export async function readJsonBody(request) {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    throw new RequestValidationError('Request body is too large', 413);
  }

  if (!request.body) throw new RequestValidationError('Request body is required');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel();
      throw new RequestValidationError('Request body is too large', 413);
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  if (!body || byteLength(body) > MAX_REQUEST_BODY_BYTES) {
    throw new RequestValidationError(body ? 'Request body is too large' : 'Request body is required', body ? 413 : 400);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new RequestValidationError('Request body must be valid JSON');
  }
}

export function sanitizeUserAgent(value) {
  return String(value || 'Unknown device').slice(0, MAX_USER_AGENT_LENGTH);
}
