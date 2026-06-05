// Vercel Serverless Function to send a welcome email when a user signs up to the newsletter
// End-point: POST /api/send-welcome-email

function buildWelcomeHtml({ email, baseUrl }) {
  const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Little Locals! 🌟</title>
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
          <h2 style="font-family: 'Sora', Arial, sans-serif; font-size: 22px; font-weight: 900; color: #033f1d; margin-top: 0; margin-bottom: 20px; letter-spacing: -0.01em;">
            You're on the list! 🎉
          </h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #1c1b1b;">
            Hey there! Thanks so much for subscribing to the Little Locals newsletter. We are absolutely thrilled to have you join our community of Central Coast families.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #1c1b1b;">
            Once a month, we'll slide into your inbox with the <strong>Monthly Scoop</strong>: a curated guide to the very best 100% free playground reviews, toddler activities, and kid-friendly events happening right here on the coast.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #1c1b1b; margin-bottom: 28px;">
            In the meantime, feel free to dive straight into our live directory and interactive calendar to see what's happening this week!
          </p>
          
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="https://littlelocals.au/calendar" target="_blank" style="background-color: #ffdcc1; color: #8e4e00; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 15px; border: 3px solid #1c1b1b; box-shadow: 4px 4px 0px 0px #1c1b1b; display: inline-block;">
              Explore the Events Calendar →
            </a>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #555555; border-top: 2px dashed #b6f1bf; padding-top: 24px; margin-top: 24px;">
            Talk soon,<br>
            <strong>The Little Locals Team</strong>
          </p>
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
            You received this because you signed up on our website footer. <br>
            If you wish to stop receiving these updates, you can <a href="${unsubscribeUrl}" style="color: #8e4e00; text-decoration: underline; font-weight: bold;">unsubscribe here</a> at any time.
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

  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Missing parameter: email (string) is required.' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || 'Little Locals <onboard@resend.dev>';

  if (!resendApiKey) {
    return res.status(400).json({ 
      error: 'Resend API key is not configured in environment variables.' 
    });
  }

  try {
    // Resolve base URL dynamically from request headers
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'littlelocals.au';
    // Use localhost in dev if Vite/Vercel dev server port is forwarded
    const baseUrl = `${proto}://${host}`;

    const welcomeHtml = buildWelcomeHtml({ email, baseUrl });

    const payload = {
      from: senderEmail,
      to: [email.trim().toLowerCase()],
      subject: 'Welcome to the Little Locals Monthly Scoop! 🌟',
      html: welcomeHtml
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to dispatch welcome email via Resend.');
    }

    return res.status(200).json({ 
      success: true, 
      message: `Welcome email successfully sent to ${email}! 🚀`,
      id: data.id
    });

  } catch (err) {
    console.error("Welcome email serverless function error:", err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
}
