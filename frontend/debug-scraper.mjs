// Debug script: tests what the scraper actually extracts from each source
// Run with: node debug-scraper.mjs

const SOURCES = [
  { name: "Everglades Woy Woy", url: "https://everglades.net.au/whats-on/school-holidays/" },
  { name: "Ettalong Diggers", url: "https://www.ettalongdiggers.com/whats-on/" },
  { name: "Reptile Park", url: "https://www.reptilepark.com.au/plan-your-visit/whats-on" },
  { name: "Erina Fair", url: "https://erinafair.com.au/whats-new/events/" },
  { name: "Central Coast Libraries", url: "https://libraries.centralcoast.nsw.gov.au/whats-on?title=&category=39347" },
  { name: "Davistown RSL", url: "https://davistownrsl.com.au/whats-on/" },
  { name: "Gosford RSL", url: "https://grsl.com.au/box-office" },
];

// --- Copy of extraction functions from scrape-events.js ---

function extractLdJson(html) {
  const results = [];
  const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const findEvents = (obj) => {
        if (!obj) return;
        if (Array.isArray(obj)) { obj.forEach(findEvents); return; }
        if (typeof obj === 'object') {
          const type = obj['@type'];
          if (type && (typeof type === 'string' ? type.toLowerCase().includes('event') : Array.isArray(type) && type.some(t => t.toLowerCase().includes('event')))) {
            results.push(JSON.stringify(obj));
          }
          if (obj['@graph']) findEvents(obj['@graph']);
          Object.values(obj).forEach(v => { if (typeof v === 'object') findEvents(v); });
        }
      };
      findEvents(data);
    } catch (e) { /* ignore */ }
  }
  return results.join('\n');
}

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

function extractMainContent(html) {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  let content = mainMatch ? mainMatch[1] : '';
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
  clean = clean.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#8217;/g, "'").replace(/&#8211;/g, '-');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

function extractEventContent(html) {
  const parts = [];
  const ldJson = extractLdJson(html);
  if (ldJson) parts.push('[STRUCTURED DATA]\n' + ldJson);
  const articles = extractArticles(html);
  if (articles) parts.push('[EVENT CARDS]\n' + articles);
  const mainContent = extractMainContent(html);
  if (mainContent) parts.push('[MAIN CONTENT]\n' + mainContent);
  if (parts.length > 0) return parts.join('\n\n');
  return cleanHtmlFull(html);
}

// --- Run the test ---

async function main() {
  console.log('='.repeat(80));
  console.log('SCRAPER CONTENT EXTRACTION DIAGNOSTIC');
  console.log('='.repeat(80));
  
  for (const src of SOURCES) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`SOURCE: ${src.name}`);
    console.log(`URL: ${src.url}`);
    console.log('─'.repeat(80));
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(src.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log(`  ❌ HTTP ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      console.log(`  📥 HTML size: ${html.length} bytes`);
      
      // Test each extraction pass individually
      const ldJson = extractLdJson(html);
      console.log(`  📋 LD+JSON: ${ldJson.length} chars ${ldJson.length > 0 ? '✅' : '❌'}`);
      
      const articles = extractArticles(html);
      console.log(`  📰 Articles: ${articles.length} chars ${articles.length > 0 ? '✅' : '❌'}`);
      
      const mainContent = extractMainContent(html);
      console.log(`  📄 Main content: ${mainContent.length} chars ${mainContent.length > 0 ? '✅' : '❌'}`);
      
      const fullBody = cleanHtmlFull(html);
      console.log(`  📝 Full body fallback: ${fullBody.length} chars`);
      
      const combined = extractEventContent(html);
      const trimmed = combined.substring(0, 15000);
      console.log(`  🎯 Combined output: ${combined.length} chars (trimmed to ${trimmed.length})`);
      
      // Show first 500 chars of the actual output
      console.log(`\n  --- FIRST 800 CHARS OF EXTRACTED CONTENT ---`);
      console.log(`  ${trimmed.substring(0, 800).replace(/\n/g, '\n  ')}`);
      console.log(`  --- END PREVIEW ---`);
      
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }
}

main();
