// Vercel Serverless Function to securely scrape or generate free Central Coast kids events
// End-point: POST /api/scrape-events

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const todayStr = new Date().toISOString().split('T')[0];

  // List of high-fidelity mock events for templates & fallback
  const mockTemplates = [
    {
      title: "Umina Beach Toddler Sensory Play",
      category: "Outdoors",
      location: "Umina Beach Playground, Sydney Ave, Umina Beach NSW 2257",
      age_group: "0-5 years",
      time: "09:30 AM - 11:00 AM",
      description: "Scraped Facebook Lead: Join local mums and dads for an outdoor toddler sensory play session right next to the fully fenced Umina Beach active zone. Shaded areas, baby swings, and sand play. Perfect morning coffee spot.",
      image_url: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80",
      link: "https://www.facebook.com/events/334455667/",
      daysOffset: 3
    },
    {
      title: "Kibble Park LEGO Club",
      category: "Art & Craft",
      location: "Gosford Library, Erina St, Gosford NSW 2250",
      age_group: "6-12 years",
      time: "03:30 PM - 05:00 PM",
      description: "Scraped Facebook Lead: Free after-school LEGO building challenge for school-aged kids (6-12 years). Build creative models, showcase your designs in the library cabinets, and meet new friends. Bookings not required.",
      image_url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80",
      link: "https://www.facebook.com/events/112233445/",
      daysOffset: 5
    },
    {
      title: "The Entrance Splash Park Picnic",
      category: "Outdoors",
      location: "The Entrance Water Park, The Entrance Rd, The Entrance NSW 2261",
      age_group: "All Ages",
      time: "11:00 AM - 03:00 PM",
      description: "Scraped Facebook Lead: Free community picnic and splash day out for families. Pack a rug and lunch, enjoy the water fountains, fully fenced play equipment, and feeding of the pelicans at 3:30 PM nearby!",
      image_url: "https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=800&q=80",
      link: "https://www.facebook.com/events/556677889/",
      daysOffset: 7
    },
    {
      title: "Avoca Beach Rockpool Explorers",
      category: "Outdoors",
      location: "Avoca Beach Rockpools, Avoca Beach NSW 2251",
      age_group: "6-12 years",
      time: "01:00 PM - 02:30 PM",
      description: "Scraped Facebook Lead: Free guided marine exploration for school holidays. Kids can learn about local anemones, crabs, and sea snails in the shallow rockpools. Shaded parent seating and clean amenities nearby.",
      image_url: "https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=800&q=80",
      link: "https://www.facebook.com/events/778899001/",
      daysOffset: 9
    },
    {
      title: "Erina Library Musical Storytime",
      category: "Music & Storytime",
      location: "Erina Library, Erina Fair, Terrigal Dr, Erina NSW 2250",
      age_group: "0-5 years",
      time: "10:00 AM - 10:45 AM",
      description: "Scraped Facebook Lead: Free interactive story and music program for toddlers and preschoolers. Features classic kids' songs, puppet play, and picture book readings. Parents must stay. Level access and stroller parking inside Erina Fair.",
      image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
      link: "https://www.facebook.com/events/445566778/",
      daysOffset: 11
    }
  ];

  // Helper to generate dynamic future dates
  const getFutureDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  // 1. Live Web Scraping Attempt (Council Events Page)
  let rawWebText = "";
  try {
    const response = await fetch("https://www.centralcoast.nsw.gov.au/whats-on", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(4000) // 4 seconds timeout to prevent hanging
    });
    if (response.ok) {
      const html = await response.text();
      // Extract a representative, light-weight subset of the HTML body to parse
      const bodyStartIndex = html.indexOf('<body');
      if (bodyStartIndex !== -1) {
        // Grab a 30,000 char window of the body which usually contains content listings
        rawWebText = html.substring(bodyStartIndex, bodyStartIndex + 30000)
          .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // Strip script tags
          .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')   // Strip style tags
          .replace(/<[^>]+>/g, ' ')                           // Strip markup tags
          .replace(/\s+/g, ' ')                               // Clean whitespace
          .substring(0, 15000);                               // Cap final length
      }
    }
  } catch (err) {
    console.log("Council events directory crawl timed out or was blocked. Proceeding with synthesis mode...");
  }

  // 2. AI Synthesis and Parsing via Gemini (if Key is configured)
  if (geminiApiKey) {
    try {
      const promptText = `
You are the "Little Locals Scraper Assistant". Your job is to extract or generate exactly 3 highly realistic, 100% free, family-friendly events happening on the Central Coast, NSW, Australia.

Current Date: ${todayStr}

RAW WEBSITE CONTENT INGESTION:
${rawWebText ? `Here is raw text from the Central Coast Council's What's On page: ${rawWebText}` : "No raw text available. Please synthesize events instead."}

INSTRUCTIONS:
1. If the raw website content contains any kids/family-friendly free activities, extract up to 3 of them.
2. If there are no clear free family-friendly activities in the raw text, or if the text is missing, synthesize exactly 3 completely new, highly realistic, family-friendly free events happening on the Central Coast within the next 14 days.
3. Every event MUST follow the schema exactly:
   - title: Clean, catchy, parent-friendly title (e.g. "Kibble Park Storytime Picnic")
   - category: Must be exactly one of: "Playground", "Library", "Art & Craft", "Outdoors", "Sports", "Music & Storytime", or "General".
   - location: The exact park, library, or outdoor center name followed by suburb, e.g. "Woy Woy Lions Park, Brick Wharf Rd, Woy Woy NSW 2256".
   - date: A string in YYYY-MM-DD format. The date MUST be in the future (relative to today ${todayStr}).
   - time: Event times, e.g. "10:00 AM - 12:00 PM".
   - age_group: One of "All Ages", "0-5 years", "6-12 years", or "Teens".
   - description: Describe the activity, what to bring, shade options, playground fences, and parking. Must start with "Scraped Facebook Lead: " or "Scraped Lead: ".
   - image_url: A high-quality Unsplash search URL suited to the activity category.
   - link: A URL referencing the event (e.g., a mock Facebook event link like "https://www.facebook.com/events/12345/").

Ensure you return a clean JSON array matching the requested schema. Do not wrap it in markdown code blocks.
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptText
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  category: { type: "STRING" },
                  location: { type: "STRING" },
                  date: { type: "STRING" },
                  time: { type: "STRING" },
                  age_group: { type: "STRING" },
                  description: { type: "STRING" },
                  image_url: { type: "STRING" },
                  link: { type: "STRING" }
                },
                required: ["title", "category", "location", "date", "description", "time", "age_group"]
              }
            }
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text;
        const parsedEvents = JSON.parse(text);
        
        if (Array.isArray(parsedEvents) && parsedEvents.length > 0) {
          return res.status(200).json({
            success: true,
            mode: rawWebText ? "Crawl + AI Extraction" : "AI Synthesis Mode",
            suggestions: parsedEvents.map((ev, i) => ({
              ...ev,
              // Fallback default image URLs matching categories if Unsplash fails or is invalid
              image_url: ev.image_url || mockTemplates[i % mockTemplates.length].image_url,
              link: ev.link || `https://www.facebook.com/events/scraped_${Date.now()}_${i}/`
            }))
          });
        }
      }
    } catch (geminiErr) {
      console.error("Gemini API Parse failed. Falling back to structured templates...", geminiErr);
    }
  }

  // 3. Graceful Fallback Mode (No Key / API Error / Crawl Timed Out)
  // Randomly select 3 templates, update their dates dynamically, and return them
  try {
    const shuffled = [...mockTemplates].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    const generatedSuggestions = selected.map(template => ({
      title: template.title,
      category: template.category,
      location: template.location,
      age_group: template.age_group,
      time: template.time,
      description: template.description,
      image_url: template.image_url,
      link: template.link,
      date: getFutureDate(template.daysOffset)
    }));

    return res.status(200).json({
      success: true,
      mode: "Template Synthesis Fallback (Zero Setup Mode)",
      suggestions: generatedSuggestions
    });

  } catch (fallbackErr) {
    console.error("Fallback generator crashed:", fallbackErr);
    return res.status(500).json({ error: 'Serverless scraper crashed: ' + fallbackErr.message });
  }
}
