let inMemoryToken = '';

export function setSessionToken(token) {
  inMemoryToken = token || '';
}

export function getSessionToken() {
  return inMemoryToken;
}

export async function callSheetsAPI(action, params = {}) {
  const token = inMemoryToken;
  const payload = {
    action,
    params
  };
  if (token) {
    payload.token = token;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('/api/sheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        // Not JSON
      }
      const errorMsg = (errorJson && errorJson.error) || `HTTP error! Status: ${response.status}`;
      if (response.status === 401 || errorMsg.includes('Unauthorized') || errorMsg.includes('Access token')) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('unauthorized-api-call'));
        }
      }
      throw new Error(errorMsg);
    }

    const result = await response.json();
    if (result && result.success === false) {
      throw new Error(result.error || 'Server error occurred');
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError' || error.message?.includes('aborted') || error.message?.includes('signal is aborted')) {
      throw new Error('Request timed out. Please check your database connection and try again.');
    }
    const isAuthError = error.message && (
      error.message.includes('Unauthorized') || 
      error.message.includes('Access token') ||
      error.message.includes('401')
    );
    if (!isAuthError) {
      console.error(`API Call failed for action ${action}:`, error);
    }
    throw error;
  }
}
