// Vercel Serverless Function to securely publish posts to the Little Locals Facebook Page
// End-point: POST /api/post-to-facebook

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { message, link, image_url } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Missing parameter: message' });
  }

  const pageId = process.env.FACEBOOK_PAGE_ID;
  const pageToken = process.env.FACEBOOK_PAGE_TOKEN;

  // If credentials are not configured yet, return a clean instruction response
  if (!pageId || !pageToken) {
    return res.status(400).json({ 
      error: 'Facebook credentials are not configured in Vercel. Please set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_TOKEN environment variables in your Vercel Settings.' 
    });
  }

  try {
    // If an image URL is provided, post to Page Photos. Otherwise post to Page Feed.
    const isPhotoPost = !!image_url;
    const fbUrl = isPhotoPost 
      ? `https://graph.facebook.com/v19.0/${pageId}/photos`
      : `https://graph.facebook.com/v19.0/${pageId}/feed`;
    
    const params = {
      access_token: pageToken
    };

    if (isPhotoPost) {
      params.url = image_url;
      // In the /photos endpoint, the text description is passed as "caption"
      params.caption = link ? `${message}\n\nRead more: ${link}` : message;
    } else {
      params.message = message;
      if (link) {
        params.link = link;
      }
    }

    const response = await fetch(fbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Facebook API Error response:", data);
      return res.status(response.status).json({ 
        error: data.error?.message || 'Failed to post to Facebook Graph API.' 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Post published successfully to Facebook Page! 🎉',
      fbPostId: data.id 
    });

  } catch (err) {
    console.error("Facebook serverless function crash:", err);
    return res.status(500).json({ error: 'Serverless function error: ' + err.message });
  }
}
