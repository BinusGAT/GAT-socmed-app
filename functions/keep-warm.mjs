// functions/keep-warm.mjs
// Scheduled Netlify function to keep the serverless container and Turso connection warm

async function keepWarm() {
  const targetUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';
  const pingEndpoint = `${targetUrl.replace(/\/$/, '')}/api/health?db=1`;
  console.log(`[Keep-Warm] Pinging health check at: ${pingEndpoint}`);

  try {
    const response = await fetch(pingEndpoint, {
      headers: {
        'User-Agent': 'Netlify-Scheduled-KeepWarm/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    const status = response.status;
    console.log(`[Keep-Warm] Ping complete with status: ${status}`);
  } catch (error) {
    console.warn('[Keep-Warm] Ping encountered non-fatal error:', error.message);
  }
}

export default keepWarm;
