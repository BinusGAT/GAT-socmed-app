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

  try {
    const response = await fetch('/api/sheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
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
    console.error(`API Call failed for action ${action}:`, error);
    throw error;
  }
}
