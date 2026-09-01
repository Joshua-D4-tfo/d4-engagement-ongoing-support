/**
 * Netlify Function: Load Engagement Letter Configuration
 * Retrieves configuration by reference ID from Netlify Blobs
 */

import { getStore } from '@netlify/blobs';

export default async function(req, context) {
  const ref = new URL(req.url).searchParams.get('ref');
  if (!ref) {
    return new Response(
      JSON.stringify({ error: 'Missing ref parameter' }),
      { status: 400 }
    );
  }

  try {
    const store = getStore('engagement-configs');
    const configStr = await store.get(ref);
    if (!configStr) {
      return new Response(
        JSON.stringify({ error: 'Configuration not found' }),
        { status: 404 }
      );
    }
    const config = JSON.parse(configStr);
    return new Response(
      JSON.stringify(config),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error('Fetch error:', err);
    return new Response(
      JSON.stringify({ error: 'Configuration not found' }),
      { status: 404 }
    );
  }
}

export const config = { path: '/.netlify/functions/get-config' };
