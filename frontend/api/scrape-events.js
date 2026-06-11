// Vercel Serverless Function to securely scrape or generate free Central Coast kids events
// End-point: POST /api/scrape-events

const SOURCES = [
  { name: "Gosford RSL", url: "https://grsl.com.au/box-office" },
  { name: "Everglades Woy Woy", url: "https://everglades.net.au/whats-on/school-holidays/" },
  { name: "Ettalong Diggers", url: "https://www.ettalongdiggers.com/whats-on/" },
  { name: "Deepwater Plaza", url: "https://www.deepwaterplaza.com.au/whats-on/" },
  { name: "Imperial Centre", url: "https://imperialcentre.com.au/whats-on/" },
  { name: "Reptile Park", url: "https://www.reptilepark.com.au/plan-your-visit/whats-on" },
  { name: "Wyong Milk Factory", url: "https://www.wyongmilkfactorytavernevents.com.au/" },
  { name: "Kincumber Hotel", url: "https://www.kincumberhotel.com.au/whats-on.html" },
  { name: "Bateau Bay Hotel", url: "https://www.bateaubayhotel.com.au/whats-on.html" },
  { name: "Davistown RSL", url: "https://davistownrsl.com.au/whats-on/" },
  { name: "Budgewoi Hotel", url: "https://srghospitality.com.au/venue/budgewoi-hotel/" },
  { name: "Erina Fair", url: "https://erinafair.com.au/whats-new/events/" },
  { name: "Westfield Tuggerah", url: "https://www.westfield.com.au/tuggerah/kids-and-family" },
  { name: "Gosford Regional Gallery", url: "https://gosfordregionalgallery.com/page/kids#" },
  {
    name: "Central Coast Libraries",
    url: "https://libraries.centralcoast.nsw.gov.au/whats-on?title=&category=39347&field_address_address_line1=&field_date_range_value=1&viewsreference%5Bcompressed%5D=eJxtUdtuwyAM_Rc_9yGZ1KXK274EecOhlhwSGZIuqvLvg6KRqtsDMseXc3zgDhYjQn-HGR0p9AAniByFoPeLyAmmYQgUfxGqW0byFQuPXMGV0GaOguh7ngJZM7BE0pA1VjUvWbNy4M-s1lbdvMIXRnKTbgl9iKTEwCTWoLVKIdQo7KktE6UhuSGj6B2ZFWXJbC3se9rGY5KxJnmJ7F14tlzis7nj-o-PP5lEP6OmbpMOx83EbaYHr6JTnK_w2sA2lbuuOTdHqRjwOObRAlam29GglB9r8mX60r13b-dqnCONxpLkz2z2H2OfpW0"
  },
  { name: "Breakers Wamberal", url: "https://www.breakerscc.com/entertainment-events" },
  { name: "Terrigal Beach House", url: "https://www.terrigalbh.com.au/whats-on/" },
  { name: "Beachcomber", url: "https://beachcomberhotelandresort.com.au/whats-on/" },
  { name: "Lake Haven Shops", url: "https://www.lakehavencentre.com.au/whats-on" },
  { name: "The Ary Toukley", url: "https://www.thearytoukley.com.au/sh" }
];

// Extract LD+JSON structured data (Schema.org Event objects) from HTML
function extractLdJson(html) {
  const results = [];
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      // Recursively search for Event-type objects
      const findEvents = (obj) => {
        if (!obj) return;
        if (Array.isArray(obj)) { obj.forEach(findEvents); return; }
        if (typeof obj === 'object') {
          const type = obj['@type'];
          if (type && (typeof type === 'string' ? type.toLowerCase().includes('event') : Array.isArray(type) && type.some(t => t.toLowerCase().includes('event')))) {
            results.push(JSON.stringify(obj));
          }
          // Check @graph arrays (Yoast, Rank Math)
          if (obj['@graph']) findEvents(obj['@graph']);
          Object.values(obj).forEach(v => { if (typeof v === 'object') findEvents(v); });
        }
      };
      findEvents(data);
    } catch (e) { /* ignore malformed JSON */ }
  }
  return results.join('\n');
}

// Extract text from <article> elements (Elementor event cards, WP posts)
function extractArticles(html) {
  const articles = [];
  const regex = /<article[^>]*>([\s\S]*?)<\/article>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    let text = match[1]
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#8217;/g, "'").replace(/&#8211;/g, '-').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim();
    if (text.length > 10) articles.push(text);
  }
  return articles.join('\n---\n');
}

// Extract content from <main> or primary content area
function extractMainContent(html) {
  // Try <main> first
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  let content = mainMatch ? mainMatch[1] : '';

  // If no <main>, try common content wrappers
  if (!content) {
    const contentMatch = html.match(/<div[^>]*(?:id|class)\s*=\s*["'][^"']*(?:content|main|page-content|entry-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    content = contentMatch ? contentMatch[1] : '';
  }

  if (!content) return '';

  return content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#8217;/g, "'").replace(/&#8211;/g, '-').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

// Full body fallback: strip HTML to plain text (original approach)
function cleanHtmlFull(html) {
  if (!html) return "";

  const bodyStartIndex = html.indexOf('<body');
  let content = bodyStartIndex !== -1 ? html.substring(bodyStartIndex) : html;

  let clean = content
    .replace(/<head[^>]*>([\s\S]*?)<\/head>/gi, '')
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
    .replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, '')
    .replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, '')
    .replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, '')
    .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '')
    .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '');

  clean = clean.replace(/<[^>]+>/g, ' ');
  clean = clean
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'").replace(/&#8211;/g, '-');
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

// Smart multi-pass content extraction: prioritizes structured data > articles > main > full body
function extractEventContent(html) {
  const parts = [];

  // Pass 1: LD+JSON structured event data (highest quality)
  const ldJson = extractLdJson(html);
  if (ldJson) parts.push('[STRUCTURED DATA]\n' + ldJson);

  // Pass 2: Article elements (Elementor event cards, WP post listings)
  const articles = extractArticles(html);
  if (articles) parts.push('[EVENT CARDS]\n' + articles);

  // Pass 3: Main content area
  const mainContent = extractMainContent(html);
  if (mainContent) parts.push('[MAIN CONTENT]\n' + mainContent);

  // If we got useful structured content, return it
  if (parts.length > 0) {
    return parts.join('\n\n');
  }

  // Pass 4: Fall back to full body text extraction
  return cleanHtmlFull(html);
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const todayStr = new Date().toISOString().split('T')[0];

  // Extract existing events, suggestions, and dismissed suggestions lists from the request body to avoid duplicates
  const { existingEvents = [], existingSuggestions = [], dismissedSuggestions = [] } = req.body;

  // List of high-fidelity mock events for templates & fallback
  const mockTemplates = [
    {
      title: "Umina Beach Toddler Sensory Play",
      category: "Outdoors",
      location: "Umina Beach Playground, Sydney Ave, Umina Beach NSW 2257",
      age_group: "0-5 years",
      time: "09:30 AM - 11:00 AM",
      description: "Join local mums and dads for an outdoor toddler sensory play session right next to the fully fenced Umina Beach active zone. Shaded areas, baby swings, and sand play. Perfect morning coffee spot.",
      image_url: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80",
      link: "https://www.facebook.com/events/334455667/",
      daysOffset: 3,
      is_school_holiday: false,
      is_recurring: false,
      recurrence_type: null,
      recurrence_until: null
    },
    {
      title: "Kibble Park LEGO Club",
      category: "Art & Craft",
      location: "Gosford Library, Erina St, Gosford NSW 2250",
      age_group: "6-12 years",
      time: "03:30 PM - 05:00 PM",
      description: "Free after-school LEGO building challenge for school-aged kids (6-12 years). Build creative models, showcase your designs in the library cabinets, and meet new friends. Bookings not required.",
      image_url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80",
      link: "https://www.facebook.com/events/112233445/",
      daysOffset: 5,
      is_school_holiday: false,
      is_recurring: false,
      recurrence_type: null,
      recurrence_until: null
    },
    {
      title: "The Entrance Splash Park Picnic",
      category: "Outdoors",
      location: "The Entrance Water Park, The Entrance Rd, The Entrance NSW 2261",
      age_group: "All Ages",
      time: "11:00 AM - 03:00 PM",
      description: "Free community picnic and splash day out for families. Pack a rug and lunch, enjoy the water fountains, fully fenced play equipment, and feeding of the pelicans at 3:30 PM nearby!",
      image_url: "https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=800&q=80",
      link: "https://www.facebook.com/events/556677889/",
      daysOffset: 7,
      is_school_holiday: false,
      is_recurring: false,
      recurrence_type: null,
      recurrence_until: null
    },
    {
      title: "Avoca Beach Rockpool Explorers",
      category: "Outdoors",
      location: "Avoca Beach Rockpools, Avoca Beach NSW 2251",
      age_group: "6-12 years",
      time: "01:00 PM - 02:30 PM",
      description: "Free guided marine exploration for school holidays. Kids can learn about local anemones, crabs, and sea snails in the shallow rockpools. Shaded parent seating and clean amenities nearby.",
      image_url: "https://images.unsplash.com/photo-1502082553048-f2a82984de30?auto=format&fit=crop&w=800&q=80",
      link: "https://www.facebook.com/events/778899001/",
      daysOffset: 9,
      is_school_holiday: true,
      is_recurring: false,
      recurrence_type: null,
      recurrence_until: null
    },
    {
      title: "Erina Library Musical Storytime",
      category: "Music & Storytime",
      location: "Erina Library, Erina Fair, Terrigal Dr, Erina NSW 2250",
      age_group: "0-5 years",
      time: "10:00 AM - 10:45 AM",
      description: "Free interactive story and music program for toddlers and preschoolers. Features classic kids' songs, puppet play, and picture book readings. Parents must stay. Level access and stroller parking inside Erina Fair.",
      image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
      link: "https://www.facebook.com/events/445566778/",
      daysOffset: 11,
      is_school_holiday: false,
      is_recurring: false,
      recurrence_type: null,
      recurrence_until: null
    }
  ];

  // Helper to generate dynamic future dates
  const getFutureDate = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  // 1. Concurrent Live Web Scraping for all 20 websites
  console.log("Starting concurrent crawl of local websites...");
  const crawlStartTime = Date.now();
  
  const fetchPromises = SOURCES.map(async (src) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(src.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { name: src.name, url: src.url, text: `[HTTP ${response.status}]` };
      }

      const html = await response.text();
      const extractedText = extractEventContent(html);
      
      // Limit to 15,000 characters per source for the Gemini API
      const trimmedText = extractedText.substring(0, 15000);
      console.log(`  ✓ ${src.name}: ${html.length} bytes HTML → ${trimmedText.length} chars extracted`);
      return { name: src.name, url: src.url, text: trimmedText };
    } catch (err) {
      console.log(`  ✗ ${src.name}: ${err.message}`);
      return { name: src.name, url: src.url, text: `[Error: ${err.message}]` };
    }
  });

  const crawledSources = await Promise.all(fetchPromises);
  const crawlDuration = ((Date.now() - crawlStartTime) / 1000).toFixed(2);
  console.log(`Completed crawl of ${crawledSources.length} sources in ${crawlDuration} seconds.`);

  // Filter out completely failed or error response text to save API token usage
  const successfulCrawls = crawledSources.filter(src => !src.text.startsWith('[Error:') && !src.text.startsWith('[HTTP '));
  console.log(`Successful crawls: ${successfulCrawls.length}/${SOURCES.length} — Total chars: ${successfulCrawls.reduce((sum, s) => sum + s.text.length, 0)}`);

  // 2. AI Synthesis and Parsing via Gemini (if Key is configured)
  if (geminiApiKey) {
    try {
      const promptText = `
You are the "Little Locals Scraper Assistant". Your job is to analyze raw website content from local Central Coast venues and extract all upcoming kids' and family-friendly events happening over the next 6 months (starting from ${todayStr}).

Current Date: ${todayStr}

EXISTING LIVE EVENTS & PENDING SUGGESTIONS (DO NOT extract/duplicate any events that match these titles and dates):
${JSON.stringify([...existingEvents, ...existingSuggestions])}

DISMISSED / DELETED EVENTS (DO NOT recommend or suggest ANY event whose title matches these, regardless of date):
${JSON.stringify(dismissedSuggestions)}

RAW WEBSITE TEXT CONTENTS (may include sections labelled [STRUCTURED DATA], [EVENT CARDS], and [MAIN CONTENT] — check all sections for event information):
${successfulCrawls.map(s => `=== SOURCE: ${s.name} (${s.url}) ===\n${s.text}`).join('\n\n')}

INSTRUCTIONS:
1. Carefully analyze ALL content from ALL sources above. Extract every family-friendly, kids/children's event you can find. This includes: school holiday events, children's workshops, kids discos, family fun days, playground events, library storytimes, kids' movie nights, kids eat free deals, sensory play, craft activities, animal shows, school holiday programs, and any event described as suitable for families or children.
2. Also include general venue events at family-friendly venues (RSLs, clubs, hotels, shopping centres) that would appeal to families — e.g. barefoot bowls, community markets, free live music with kids' activities, etc.
3. Only extract events that are happening on or after today (${todayStr}). Do not include any past events.
4. Skip any events that are already present in the "EXISTING LIVE EVENTS & PENDING SUGGESTIONS" list (match by title case-insensitive AND date). For "DISMISSED / DELETED EVENTS", skip any event whose title matches a dismissed title (case-insensitive), regardless of date.
5. Set "is_school_holiday" to true if the event explicitly mentions school holidays, is run as a school holidays activity, or if the source URL path contains "school-holidays". Otherwise, set it to false.
6. CONSOLIDATE REPEATING EVENTS:
   - If an event appears to repeat (e.g., happens every Wednesday, every Saturday, weekly, or is a repeating holiday class), DO NOT extract multiple individual occurrences.
   - Extract it ONLY ONCE representing the first upcoming occurrence (use its start date as "date").
   - Set "is_recurring" to true.
   - Set "recurrence_type" to one of: "weekly", "fortnightly", "monthly".
   - Set "recurrence_until" to the date the series ends (YYYY-MM-DD format). If no end date is specified, default to 3 months from today's date (relative to ${todayStr}), capped at a maximum of 6 months.
   - For single, one-off events, set "is_recurring" to false, "recurrence_type" to null, and "recurrence_until" to null.
7. For each extracted event, map it to the following JSON schema:
   - title: Clean, catchy, parent-friendly title (e.g. "Ettalong Diggers School Holiday Magic Show")
   - category: Must be exactly one of: "School Holidays", "Weekend Activities", "Weekday Activities", "Markets", "Playgrounds", "Indoor Activities", or "Playgroups".
   - location: The venue name and suburb/address, e.g. "Gosford RSL, 26 Central Coast Hwy, West Gosford NSW 2250".
   - date: A string in YYYY-MM-DD format. Ensure you extract the correct date from the context.
   - time: Event times, e.g. "10:00 AM - 12:00 PM".
   - age_group: One of "All Ages", "0-5 years", "6-12 years", or "Teens".
   - description: Describe the activity, what to bring, shade options, playground fences, and parking. Provide highly readable, parent-friendly copy directly.
   - image_url: A high-quality Unsplash search URL suited to the activity category.
   - link: The exact source URL from the SOURCE header above (or a specific event link if found).
   - is_school_holiday: Boolean indicating if it's a school holiday event.
   - is_recurring: Boolean indicating if the event repeats.
   - recurrence_type: String (weekly, fortnightly, monthly, or null).
   - recurrence_until: String (YYYY-MM-DD or null).

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
                  link: { type: "STRING" },
                  is_school_holiday: { type: "BOOLEAN" },
                  is_recurring: { type: "BOOLEAN" },
                  recurrence_type: { type: "STRING" },
                  recurrence_until: { type: "STRING" }
                },
                required: ["title", "category", "location", "date", "description", "time", "age_group", "is_school_holiday", "is_recurring"]
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
          // Additional safety check to filter out past events and duplicates in Javascript
          const filteredEvents = parsedEvents.filter(ev => {
            if (!ev.date || ev.date < todayStr) return false;
            
            // Match existing events/suggestions by title + date
            const isExistingDuplicate = 
              existingEvents.some(e => e.title?.toLowerCase() === ev.title?.toLowerCase() && e.date === ev.date) ||
              existingSuggestions.some(s => s.title?.toLowerCase() === ev.title?.toLowerCase() && s.date === ev.date);
            // Match dismissed events by title ONLY — once dismissed, never re-suggest
            const isDismissed = 
              dismissedSuggestions.some(d => d.title?.toLowerCase() === ev.title?.toLowerCase());
              
            return !isExistingDuplicate && !isDismissed;
          });

          return res.status(200).json({
            success: true,
            mode: `Multi-site crawl (${successfulCrawls.length}/${SOURCES.length} sites fetched) + AI Extraction`,
            suggestions: filteredEvents.map((ev, i) => ({
              ...ev,
              image_url: ev.image_url || mockTemplates[i % mockTemplates.length].image_url,
              link: ev.link || `https://www.facebook.com/events/recommendation_${Date.now()}_${i}/`,
              // Normalize null values for optional recurrence params
              recurrence_type: ev.is_recurring ? (ev.recurrence_type || 'weekly') : null,
              recurrence_until: ev.is_recurring ? (ev.recurrence_until || getFutureDate(90)) : null
            }))
          });
        }
      }
    } catch (geminiErr) {
      console.error("Gemini API Parse failed. Falling back to structured templates...", geminiErr);
    }
  }

  // 3. Graceful Fallback Mode (No Key / API Error / Crawl Timed Out)
  // Randomly select 3 templates, update their dates dynamically, filter duplicates, and return them
  try {
    const shuffled = [...mockTemplates].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    const generatedSuggestions = selected
      .map(template => ({
        title: template.title,
        category: template.category,
        location: template.location,
        age_group: template.age_group,
        time: template.time,
        description: template.description,
        image_url: template.image_url,
        link: template.link,
        date: getFutureDate(template.daysOffset),
        is_school_holiday: template.is_school_holiday || false,
        is_recurring: template.is_recurring || false,
        recurrence_type: template.recurrence_type || null,
        recurrence_until: template.recurrence_until || null
      }))
      .filter(ev => {
        const isExistingDuplicate = 
          existingEvents.some(e => e.title?.toLowerCase() === ev.title?.toLowerCase() && e.date === ev.date) ||
          existingSuggestions.some(s => s.title?.toLowerCase() === ev.title?.toLowerCase() && s.date === ev.date);
        const isDismissed = 
          dismissedSuggestions.some(d => d.title?.toLowerCase() === ev.title?.toLowerCase());
        return !isExistingDuplicate && !isDismissed;
      });

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
