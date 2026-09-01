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

  // Decode base64 HTML and preserve signature data URLs
  let attachmentBase64 = null;
  if (engagementHTML) {
    try {
      let decoded = Buffer.from(engagementHTML, 'base64').toString('utf-8');
      // Keep all data URLs intact (including signatures) by not stripping them
      attachmentBase64 = Buffer.from(decoded, 'utf-8').toString('base64');
      console.log('Attachment size (base64 chars):', attachmentBase64.length);
    } catch(e) {
      console.error('Decode error:', e.message);
    }
  }

  const notificationHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;color:#1A1A1A;background:#F0EDE8;margin:0;padding:0;">
<div style="max-width:580px;margin:36px auto;background:white;">
  <div style="background:#0F1B2D;padding:18px 30px;"><span style="color:rgba(255,255,255,0.6);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;">D4 &amp; Partners — New Signed Engagement &nbsp;|&nbsp; ${signedDate}</span></div>
  <div style="height:4px;background:#E8632A;"></div>
  <div style="padding:30px;">
    <h2 style="font-size:19px;color:#0F1B2D;margin-bottom:16px;">New Engagement Letter Signed</h2>
    <p style="font-size:13px;margin-bottom:6px;"><strong>Client:</strong> ${clientName}</p>
    <p style="font-size:13px;margin-bottom:16px;"><strong>Date:</strong> ${signedDate}</p>
    <div style="background:#FAFAF8;border:1px solid #E2DDD8;border-left:4px solid #E8632A;padding:16px 20px;border-radius:3px;">
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#7A7A7A;margin-bottom:8px;font-weight:600;">Engagement Summary</p>
      <pre style="font-family:Arial,sans-serif;font-size:12px;color:#1A1A1A;white-space:pre-wrap;margin:0;line-height:1.7;">${summaryText || 'No summary'}</pre>
    </div>
    <p style="margin-top:16px;font-size:11px;color:#E8632A;font-weight:600;">Signed engagement letter attached.</p>
  </div>
</div>
</body></html>`;

  const payload = {
    from: 'D4 Engagements <onboarding@resend.dev>',
    to: [D4_EMAIL],
    subject: `Signed Engagement — ${clientName} — ${signedDate}`,
    html: notificationHtml,
    ...(attachmentBase64 ? {
      attachments: [{
        filename: `D4-Engagement-${safeClient}-${safeDate}.html`,
        content: attachmentBase64,
        content_type: 'text/html'
      }]
    } : {})
  };

  console.log('Sending to Resend. Payload keys:', Object.keys(payload).join(', '));

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
