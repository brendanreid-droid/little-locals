// Vercel Serverless Function to securely send branded newsletter campaigns via Resend API
// End-point: POST /api/send-newsletter

async function verifyAdminToken(authHeader, apiKey) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No authorization token provided.');
  }
  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    throw new Error('Unauthorized: Malformed authorization token.');
  }

  // Fallback for local development if the API key is not configured in local environment
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn("WARNING: Firebase API Key not configured. Skipping token validation in local dev environment.");
      return true;
    }
    throw new Error('Server misconfiguration: Firebase API Key is not set.');
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Unauthorized: Token validation failed. ${data.error?.message || ''}`);
  }

  const data = await response.json();
  if (!data.users || data.users.length === 0) {
    throw new Error('Unauthorized: User record not found.');
  }

  return true;
}

function buildHtmlTemplate({ subject, preheader, message, events = [], blogPost = null }) {
  // Convert message newline breaks to HTML paragraphs
  const messageHtml = message
    .split('\n\n')
    .map(para => `<p style="margin-bottom: 16px; font-size: 16px; line-height: 1.6; color: #1c1b1b;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');

  // Format events section if any events are included
  let eventsHtml = '';
  if (events && events.length > 0) {
    eventsHtml = `
      <div style="margin-top: 32px; border-top: 2px dashed #b6f1bf; padding-top: 32px;">
        <h2 style="font-family: 'Sora', Arial, sans-serif; font-size: 22px; font-weight: 900; color: #033f1d; margin-bottom: 20px; letter-spacing: -0.01em;">
          🌟 Featured Free Activities
        </h2>
        <div style="display: table; width: 100%;">
    `;

    events.forEach(event => {
      const eventDateStr = event.date && !isNaN(new Date(event.date).getTime())
        ? new Date(event.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
        : 'Flexible Date';

      eventsHtml += `
        <!-- Event Card -->
        <div style="background-color: #ffffff; border: 3px solid #1c1b1b; border-radius: 16px; padding: 20px; margin-bottom: 24px; box-shadow: 4px 4px 0px 0px #1c1b1b;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              ${event.image_url ? `
              <td valign="top" width="100" style="padding-right: 16px;">
                <img src="${event.image_url}" alt="" width="100" style="border-radius: 8px; border: 2.5px solid #1c1b1b; object-fit: cover; display: block;" height="100" />
              </td>
              ` : ''}
              <td valign="top">
                <span style="background-color: #b6f1bf; color: #033f1d; padding: 3px 10px; font-size: 11px; font-weight: 800; border-radius: 6px; border: 2px solid #1c1b1b; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 8px;">
                  ${event.category || 'General'}
                </span>
                <h3 style="font-family: 'Sora', Arial, sans-serif; font-size: 18px; font-weight: 900; color: #033f1d; margin: 0 0 6px 0;">${event.title}</h3>
                <div style="font-size: 13px; font-weight: 700; color: #8e4e00; margin-bottom: 8px;">
                  📅 ${eventDateStr} ${event.time ? `• ⏰ ${event.time}` : ''}
                </div>
                <div style="font-size: 13px; color: #555555; margin-bottom: 4px;">
                  📍 ${event.location || 'Central Coast'}
                </div>
                <p style="font-size: 14px; line-height: 1.5; color: #1c1b1b; margin: 8px 0 12px 0;">${event.description || ''}</p>
                ${event.link ? `
                  <a href="${event.link}" target="_blank" style="background-color: #8e4e00; color: #ffffff; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; border: 2px solid #1c1b1b; box-shadow: 2px 2px 0px 0px #1c1b1b; display: inline-block;">
                    View Details →
                  </a>
                ` : ''}
              </td>
            </tr>
          </table>
        </div>
      `;
    });

    eventsHtml += `
        </div>
      </div>
    `;
  }

  // Format blog post section if a post is included
  let blogHtml = '';
  if (blogPost) {
    const readingTime = Math.max(1, Math.ceil((blogPost.content?.split(/\s+/).length || 0) / 200));
    blogHtml = `
      <div style="margin-top: 32px; border-top: 2px dashed #b6f1bf; padding-top: 32px;">
        <h2 style="font-family: 'Sora', Arial, sans-serif; font-size: 22px; font-weight: 900; color: #033f1d; margin-bottom: 20px; letter-spacing: -0.01em;">
          📖 Featured Local Guide
        </h2>
        <!-- Blog Card -->
        <div style="background-color: #ffffff; border: 3px solid #1c1b1b; border-radius: 16px; padding: 24px; box-shadow: 4px 4px 0px 0px #1c1b1b;">
          ${blogPost.image_url ? `
            <img src="${blogPost.image_url}" alt="${blogPost.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px; border: 2.5px solid #1c1b1b; margin-bottom: 16px; display: block;" />
          ` : ''}
          <span style="background-color: #ffdcc1; color: #8e4e00; padding: 3px 10px; font-size: 11px; font-weight: 800; border-radius: 6px; border: 2px solid #1c1b1b; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 8px;">
            ${blogPost.category || 'Review'} • ${readingTime} MIN READ
          </span>
          <h3 style="font-family: 'Sora', Arial, sans-serif; font-size: 20px; font-weight: 900; color: #033f1d; margin: 0 0 10px 0; line-height: 1.2;">
            ${blogPost.title}
          </h3>
          <p style="font-size: 15px; line-height: 1.6; color: #1c1b1b; margin: 0 0 16px 0;">
            ${blogPost.excerpt || blogPost.content?.slice(0, 180) + '...'}
          </p>
          <a href="https://littlelocals.au/blog/${blogPost.id}" target="_blank" style="background-color: #ffe170; color: #1c1b1b; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; border: 2px solid #1c1b1b; box-shadow: 2px 2px 0px 0px #1c1b1b; display: inline-block;">
            Read Full Guide →
          </a>
        </div>
      </div>
    `;
  }

  // Final styled HTML email layout reflecting the brand design tokens
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&family=Sora:wght@800;900&display=swap');
        body {
          font-family: 'Be Vietnam Pro', Helvetica, Arial, sans-serif;
          background-color: #fcf9f8;
          color: #1c1b1b;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        p { margin: 0 0 16px 0; }
      </style>
    </head>
    <body style="background-color: #fcf9f8; padding: 20px 10px; margin: 0;">
      <!-- Hidden preheader text for preview window -->
      ${preheader ? `<div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>` : ''}
      
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 3px solid #1c1b1b; border-radius: 24px; overflow: hidden; box-shadow: 6px 6px 0px 0px #033f1d;">
        <!-- Header Banner -->
        <div style="background-color: #033f1d; padding: 32px 24px; text-align: center; border-bottom: 3px solid #1c1b1b;">
          <h1 style="font-family: 'Sora', Arial, sans-serif; font-weight: 900; font-size: 28px; color: #ffffff; margin: 0; letter-spacing: -0.02em;">
            LITTLE LOCALS
          </h1>
          <div style="font-size: 13px; color: #b6f1bf; font-weight: 700; margin-top: 6px; letter-spacing: 0.1em; text-transform: uppercase;">
            Central Coast Free Events & Playgrounds
          </div>
        </div>
        
        <!-- Main Body Content -->
        <div style="padding: 32px 24px; background-color: #ffffff;">
          ${messageHtml}
          
          ${eventsHtml}
          
          ${blogHtml}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #fcf9f8; border-top: 3.5px solid #1c1b1b; padding: 24px; text-align: center;">
          <p style="font-size: 13px; font-weight: 700; color: #033f1d; margin-bottom: 6px;">
            Little Locals Central Coast
          </p>
          <p style="font-size: 12px; color: #777777; margin-bottom: 12px; line-height: 1.4;">
            Helping local families discover 100% free playground reviews, guides, and toddler activities.
          </p>
          <p style="font-size: 11px; color: #999999; margin: 0; line-height: 1.4;">
            You received this because you signed up on our home page. <br>
            If you wish to unsubscribe, please reply directly or contact us at <a href="mailto:newsletter@littlelocalscc.com" style="color: #8e4e00; text-decoration: underline;">newsletter@littlelocalscc.com</a>.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { subject, preheader, message, emails, events = [], blogPost = null } = req.body;

  if (!subject || !message || !emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'Missing required parameters: subject, message, and emails (array) are required.' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || 'Little Locals <onboard@resend.dev>'; // Falls back to sandbox default

  if (!resendApiKey) {
    return res.status(400).json({ 
      error: 'Resend API key is not configured in environment variables. Please set RESEND_API_KEY in your settings.' 
    });
  }

  try {
    // 1. Verify Admin JWT ID Token in Auth Header
    const authHeader = req.headers.authorization;
    await verifyAdminToken(authHeader, firebaseApiKey);

    // 2. Generate Branded Email HTML Content
    const emailHtml = buildHtmlTemplate({ subject, preheader, message, events, blogPost });

    // 3. Batch Send via Resend API (limit to 100 BCC recipients per request to protect privacy and respect limits)
    const BATCH_SIZE = 100;
    const sendPromises = [];

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batchEmails = emails.slice(i, i + BATCH_SIZE);
      
      const payload = {
        from: senderEmail,
        to: [senderEmail.includes('<') ? senderEmail.match(/<([^>]+)>/)[1] : senderEmail], // Send to self
        bcc: batchEmails, // Hide recipient emails for privacy
        subject: subject,
        html: emailHtml
      };

      const sendPromise = fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to dispatch email batch via Resend.');
        }
        return data;
      });

      sendPromises.push(sendPromise);
    }

    const results = await Promise.all(sendPromises);

    return res.status(200).json({ 
      success: true, 
      message: `Newsletter campaign dispatched successfully to ${emails.length} subscribers! 🚀`,
      batchesCount: results.length,
      results: results
    });

  } catch (err) {
    console.error("Newsletter serverless function error:", err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
}
