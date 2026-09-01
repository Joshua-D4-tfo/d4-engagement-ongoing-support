/**
 * Netlify Function: Save Engagement Letter Configuration
 * Saves configuration to Netlify Blobs and returns reference ID
 */

import { getStore } from '@netlify/blobs';

export default async function(req, context) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405 }
    );
  }

  let config;
  try {
    config = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400 }
    );
  }

  const ref = Math.random().toString(36).substring(2, 6) + Math.random().toString(36).substring(2, 6);

  try {
    const store = getStore('engagement-configs');
    const configJson = JSON.stringify({ ...config, createdAt: new Date().toISOString() });
    await store.set(ref, configJson);
    return new Response(
      JSON.stringify({ ref }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error('Save error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to save' }),
      { status: 500 }
    );
  }
}

export const config = { path: '/.netlify/functions/save-config' };
