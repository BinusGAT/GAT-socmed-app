export async function callSheetsAPI(action, params = {}) {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('session_token') : null;
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
      throw new Error((errorJson && errorJson.error) || `HTTP error! Status: ${response.status}`);
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
