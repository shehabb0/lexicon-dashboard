/**
 * Lexicon ↔ Notion private dashboard server.
 * Node 20+; no external dependencies.
 * IMPORTANT: Keep NOTION_TOKEN and DASHBOARD_PASSWORD on the server only.
 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const API_ROOT = process.env.NOTION_API_ROOT || 'https://api.notion.com/v1';
const API_VERSION = '2026-03-11';
const TOKEN = process.env.NOTION_TOKEN || '';
const SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID || '';
const PASSWORD = process.env.DASHBOARD_PASSWORD || '';
const MAX_ROWS = 10000;
const TIMEOUT_MS = 30000;
const html = fs.readFileSync(path.join(__dirname, 'index.html'));

function okPass(attempt) {
  if (!PASSWORD || typeof attempt !== 'string') return false;
  const a = crypto.createHash('sha256').update(attempt).digest();
  const b = crypto.createHash('sha256').update(PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}
function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': 'frame-ancestors https://www.notion.so https://*.notion.so https://*.notion.site'
  });
  res.end(JSON.stringify(data));
}
function textFromRich(rich) {
  return Array.isArray(rich) ? rich.map(t => t.plain_text || t.text?.content || '').join('') : '';
}
function propertyText(prop) {
  if (!prop) return '';
  switch (prop.type) {
    case 'title': return textFromRich(prop.title);
    case 'rich_text': return textFromRich(prop.rich_text);
    case 'select': return prop.select?.name || '';
    case 'status': return prop.status?.name || '';
    case 'multi_select': return (prop.multi_select || []).map(s=>s.name).join(', ');
    case 'formula': {
      const f = prop.formula || {};
      if (f.type === 'string') return f.string || '';
      if (f.type === 'number') return f.number == null ? '' : String(f.number);
      if (f.type === 'date') return f.date?.start || '';
      if (f.type === 'boolean') return String(f.boolean);
      return '';
    }
    case 'number': return prop.number == null ? '' : String(prop.number);
    case 'date': return prop.date?.start || '';
    case 'checkbox': return String(!!prop.checkbox);
    default: return '';
  }
}
function propByCandidates(props, candidates, exclude = []) {
  const entries = Object.entries(props);
  const skip = new Set(exclude.map(s=>s.toLowerCase()));
  for (const phrase of candidates) {
    const exact = entries.find(([k])=>k.toLowerCase() === phrase.toLowerCase() && !skip.has(k.toLowerCase()));
    if (exact) return exact[1];
  }
  for (const phrase of candidates) {
    const similar = entries.find(([k])=>k.toLowerCase().includes(phrase.toLowerCase()) && !skip.has(k.toLowerCase()));
    if (similar) return similar[1];
  }
  return null;
}
function mapPage(page) {
  const p = page.properties || {};
  const titleEntry = Object.entries(p).find(([,v])=>v.type==='title');
  const word = titleEntry ? propertyText(titleEntry[1]) : '';
  const translation = propByCandidates(p,
    ['Write Translation', 'Translation', 'Meaning', 'English', 'Definition', 'Answer']);
  const difficulty = propertyText(p['Difficulty']);
  const klass = Number(propertyText(p['Class'])) || 1;
  const next = propertyText(p['Next Review']) || null;
  const approvedReviews = Number(p['Approved Reviews']?.number || 0);
  const language = propertyText(propByCandidates(p, ['Language', 'Lang', 'Languages'])) || 'Other';
  const example = propertyText(propByCandidates(p, ['Example', 'Example Sentence', 'Sentence']));
  return {
    id: page.id, word, meaning: propertyText(translation), lang: language,
    klass: Math.min(10,Math.max(1,klass)), next,
    difficulty, mastered: difficulty === 'Learned',
    approvedReviews, example, url: page.url || ''
  };
}
async function notion(method, endpoint, body) {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(API_ROOT + endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Notion-Version': API_VERSION,
        'Content-Type':'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
    const result = await response.json();
    if (!response.ok) {
      const err = new Error(result.message || 'Notion API error');
      err.status = response.status;
      throw err;
    }
    return result;
  } finally { clearTimeout(timer); }
}
async function getAllWords() {
  const words = [];
  let cursor = undefined;
  do {
    const body = { page_size:100 };
    if (cursor) body.start_cursor=cursor;
    const result = await notion('POST', `/data_sources/${encodeURIComponent(SOURCE_ID)}/query`, body);
    words.push(...(result.results || []).filter(p=>p.object==='page').map(mapPage));
    if (words.length > MAX_ROWS) throw Object.assign(new Error('Too many rows; narrow the query before continuing.'),{status:400});
    cursor=result.has_more ? result.next_cursor : null;
  } while (cursor);
  return words.filter(w=>w.word);
}
function readJson(req) {
  return new Promise((resolve,reject)=>{
    let chunks='';
    req.on('data',chunk=>{chunks+=chunk;if(chunks.length>12000){reject(Object.assign(new Error('Request too large'),{status:413}));req.destroy();}});
    req.on('end',()=>{try{resolve(JSON.parse(chunks || '{}'));}catch(e){reject(Object.assign(new Error('Invalid JSON'),{status:400}));}});
    req.on('error',reject);
  });
}
async function updateWord(pageId, action) {
  if (!/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(pageId))
    throw Object.assign(new Error('Invalid word ID'),{status:400});
  if (!['remember','forgot','master'].includes(action))
    throw Object.assign(new Error('Unknown action'),{status:400});
  const page = await notion('GET',`/pages/${pageId}`);
  if (page.parent?.data_source_id !== SOURCE_ID && page.parent?.database_id !== SOURCE_ID) {
    // Some older page objects have database_id; the connection is still scoped by Notion.
    // Confirm the page belongs to this vocabulary collection when possible.
    const parent = page.parent || {};
    if (parent.type === 'data_source_id') throw Object.assign(new Error('Word belongs to another database'),{status:403});
  }
  const p=page.properties || {};
  const props = {};
  if (action==='master') {
    if (p.Difficulty?.type !== 'select') throw Object.assign(new Error('Difficulty must be a Select property'),{status:400});
    props.Difficulty = {select:{name:'Learned'}};
  } else {
    if (p['Approved Reviews']?.type !== 'number' || p['Last Reviewed']?.type !== 'date')
      throw Object.assign(new Error('Approved Reviews must be Number and Last Reviewed must be Date'),{status:400});
    if (p.Difficulty?.select?.name === 'Learned')
      throw Object.assign(new Error('Change Difficulty from Learned to a normal level in Notion before reviewing.'),{status:409});
    const old = Number(p['Approved Reviews'].number || 0);
    const n = action === 'forgot' ? 0 : Math.min(9,old+1);
    props['Approved Reviews']={number:n};
    props['Last Reviewed']={date:{start:new Date().toISOString()}};
  }
  const updated=await notion('PATCH',`/pages/${pageId}`,{properties:props});
  return mapPage(updated);
}

http.createServer(async(req,res)=>{
  const pathname = new URL(req.url||'/',`http://${req.headers.host||'localhost'}`).pathname;
  if (req.method==='GET' && (pathname==='/' || pathname==='/index.html')) {
    res.writeHead(200, {
      'Content-Type':'text/html; charset=utf-8',
      'Cache-Control':'no-cache',
      'X-Content-Type-Options':'nosniff',
      'Content-Security-Policy': 'frame-ancestors https://www.notion.so https://*.notion.so https://*.notion.site'
    });
    return res.end(html);
  }
  if (!pathname.startsWith('/api/')) return json(res,404,{error:'Not found'});
  if (!okPass(req.headers['x-dashboard-key'])) return json(res,401,{error:'Incorrect dashboard password'});
  if (!TOKEN || !SOURCE_ID) return json(res,503,{error:'Missing NOTION_TOKEN or NOTION_DATA_SOURCE_ID on the server'});
  try {
    if (req.method==='GET' && pathname==='/api/words') {
      const words=await getAllWords();
      return json(res,200,{words, syncedAt:new Date().toISOString()});
    }
    if (req.method==='POST' && pathname==='/api/review') {
      const body=await readJson(req);
      const word=await updateWord(body.pageId, body.action);
      return json(res,200,{ok:true,word});
    }
    return json(res,404,{error:'Not found'});
  } catch(err) {
    console.error('Sync error:',err.status || 500,err.message);
    return json(res,err.status >=400 && err.status < 500 ? err.status : 502,{error: err.status===401 ? 'Notion API access denied: check integration token' : err.message || 'Connection error'});
  }
}).listen(PORT,()=>console.log(`Lexicon dashboard listening on port ${PORT}`));
