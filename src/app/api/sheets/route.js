import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const payload = await request.json();
    const sheetsSource = process.env.SHEETS_SOURCE;

    if (!sheetsSource || !sheetsSource.startsWith('http')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database URL (SHEETS_SOURCE) is not configured on the server. Please configure it in your Netlify or .env.local environment variables.' 
        },
        { status: 500 }
      );
    }

    // Flatten the payload so parameters are placed at the root level of the POST JSON body, matching what the Google Apps Script expects.
    const gasPayload = {
      action: payload.action,
    };
    if (payload.token) {
      gasPayload.token = payload.token;
    }
    if (payload.params) {
      Object.assign(gasPayload, payload.params);
    }

    const response = await fetch(sheetsSource, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(gasPayload),
      redirect: 'follow'
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`GAS Error: HTTP ${response.status}, URL: ${response.url}, Body: ${errorText.substring(0, 500)}`);
      return NextResponse.json(
        { success: false, error: `Apps Script returned HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in API sheets proxy route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
