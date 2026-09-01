export default async function(req, context) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const { clientName, signedDate, summaryText, engagementHTML } = body;
  if (!clientName) {
    return new Response(JSON.stringify({ error: 'Missing clientName' }), { status: 400 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500 });
  }

  const D4_EMAIL = 'joshua@d4-tfo.com';
  const safeClient = clientName.replace(/[^a-zA-Z0-9]/g, '-');
  const safeDate = (signedDate || '').replace(/\s+/g, '-');

  // Decode base64 HTML engagement letter
  let engagementHtmlDecoded = '';
  if (engagementHTML) {
    try {
      engagementHtmlDecoded = Buffer.from(engagementHTML, 'base64').toString('utf-8');
      console.log('Engagement HTML decoded, length:', engagementHtmlDecoded.length);
    } catch(e) {
      console.error('Decode error:', e.message);
    }
  }

  // Combined email body: notification + full engagement letter
  const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;}</style></head><body>${engagementHtmlDecoded}</body></html>`;

  const payload = {
    from: 'D4 Engagements <onboarding@resend.dev>',
    to: [D4_EMAIL],
    subject: `Signed Engagement — ${clientName} — ${signedDate}`,
    html: emailHtml
  };

  console.log('Sending to Resend. Email size:', emailHtml.length);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await res.text();
    console.log('Resend status:', res.status);
    console.log('Resend response:', responseText);

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Resend rejected', status: res.status, detail: responseText }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Fetch error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
export const config = { path: '/.netlify/functions/send-engagement' };
