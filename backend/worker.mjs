import { jwtVerify, createRemoteJWKSet } from 'jose';

const PUBLIC_ORIGIN = 'https://lessthan301.github.io';
const OWNER = 'hdstufftodo@gmail.com'; // Explicitly confirmed by the account owner; no invitation sent.
const MAX_BODY = 16384;
const HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {status, headers:{...HEADERS, 'Content-Type':'application/json; charset=utf-8', ...extra}});
class Reject extends Error { constructor(status, code) {super(code); this.status=status;} }

export async function verifyOwner(token, env, keys) {
  if (!token || token.length > 8192 || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER || '') || !env.ACCESS_AUD) throw new Reject(403,'forbidden');
  const jwks = keys || createRemoteJWKSet(new URL(env.ACCESS_ISSUER + '/cdn-cgi/access/certs'), {timeoutDuration:5000});
  const {payload} = await jwtVerify(token, jwks, {issuer:env.ACCESS_ISSUER, audience:env.ACCESS_AUD, algorithms:['RS256'], requiredClaims:['exp','iat','sub','email']});
  if (payload.email !== OWNER || env.ADMIN_EMAIL !== OWNER) throw new Reject(403,'forbidden');
  return payload;
}

export async function limitedJSON(request) {
  if ((request.headers.get('content-type') || '').split(';')[0].trim() !== 'application/json') throw new Reject(415,'json_required');
  if (Number(request.headers.get('content-length')) > MAX_BODY) throw new Reject(413,'too_large');
  const reader=request.body?.getReader(); if (!reader) throw new Reject(400,'empty_body');
  let size=0; const chunks=[];
  try { while(true) { const {value,done}=await reader.read(); if(done)break; size+=value.byteLength; if(size>MAX_BODY){await reader.cancel();throw new Reject(413,'too_large');} chunks.push(value); } }
  finally {reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try { const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)); if(!value || typeof value!=='object' || Array.isArray(value))throw Error(); return value; } catch {throw new Reject(400,'invalid_json');}
}

export function validateEnquiry(d) {
  const allowed=new Set(['first','last','email','phone','message','website','token']);
  if(Object.keys(d).some(k=>!allowed.has(k)))throw new Reject(400,'unknown_field');
  const result={};
  for(const [key,min,max] of [['first',1,100],['last',1,100],['email',3,254],['phone',0,60],['message',1,5000],['website',0,200],['token',1,2048]]) {
    const value=d[key] ?? '';if(typeof value!=='string' || value.trim().length<min || value.length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new Reject(400,'invalid_'+key);
    result[key]=value.trim();
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))throw new Reject(400,'invalid_email');
  if(result.website)throw new Reject(403,'forbidden');
  return result;
}

export async function turnstile(token, env, fetcher = fetch) {
  let r;
  try {
    const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error();r=await response.json();
  } catch {throw new Reject(503,'verification_unavailable');}
  if(r.success !== true || r.hostname !== 'lessthan301.github.io' || r.action !== 'contact')throw new Reject(403,'verification_failed');
}

async function quota(DB, key, limit, expires) {
  // Atomic increment, bounded by limit. Rejected requests do not increase the counter.
  const row=await DB.prepare('INSERT INTO request_limits (key, count, expires) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count').bind(key,expires,limit).first();
  if(!row)throw new Reject(429,'try_later');
}
async function hashedIP(ip, secret, bucket) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(bucket+':'+ip));
  return Array.from(new Uint8Array(signature),x=>x.toString(16).padStart(2,'0')).join('');
}
function ready(env) {return env.CONTACT_ENABLED === 'true' && env.OWNER_LOGIN_VERIFIED === 'true' && env.PRIVACY_APPROVED === 'true' && env.DB && env.TURNSTILE_SECRET && env.RATE_HASH_SECRET?.length>=32 && env.ACCESS_AUD && env.ACCESS_ISSUER && env.ADMIN_EMAIL === OWNER && Number.isInteger(Number(env.RETENTION_DAYS)) && Number(env.RETENTION_DAYS)>=1 && Number(env.RETENTION_DAYS)<=365;}

const DASHBOARD = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Heidelberg · private enquiry inbox</title><link rel="stylesheet" href="/admin/style.css"><main><h1>Heidelberg <small>StuffToDo</small></h1><p>Private enquiry inbox · signed in through Cloudflare Access</p><p id="status" role="status"></p><button id="refresh" type="button">Refresh inbox</button><div id="inbox"></div><p>Photo uploads are deferred. No payment or booking is confirmed by an enquiry.</p></main><script src="/admin/app.js" defer></script></html>`;
const ADMIN_CSS = `body{margin:0;background:#fcf7ec;color:#302a2a;font:17px/1.6 Arial,sans-serif}main{max-width:900px;margin:auto;padding:30px}h1,h2{color:#630d34;font-family:Georgia,serif;font-weight:400}h1 small{display:block;font:20px Arial,sans-serif}article{padding:24px;background:white;margin:24px 0;border-top:3px solid #e3a83b}p{white-space:pre-wrap;overflow-wrap:anywhere}button{padding:10px;border:1px solid #630d34;background:white;color:#630d34;cursor:pointer}`;
const ADMIN_JS = `async function load(){const status=document.getElementById('status');status.textContent='Loading…';try{const r=await fetch('/admin/api/enquiries',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();const inbox=document.getElementById('inbox');inbox.replaceChildren();for(const row of data.enquiries){const card=document.createElement('article');for(const [tag,value] of [['h2',row.first_name+' '+row.last_name],['p',new Date(row.created_at).toLocaleString()],['p',row.email],['p',row.phone],['p',row.message]]){const el=document.createElement(tag);el.textContent=value||'';card.append(el);}const button=document.createElement('button');button.textContent='Delete enquiry';button.onclick=async()=>{if(!confirm('Permanently delete this enquiry?'))return;const r=await fetch('/admin/api/enquiries/'+encodeURIComponent(row.id),{method:'DELETE',credentials:'same-origin',headers:{'X-Heidelberg-Admin':'1'}});if(!r.ok){status.textContent='Could not delete. Nothing has been confirmed deleted.';return;}await load();};card.append(button);inbox.append(card);}status.textContent=data.enquiries.length?'Showing up to 100 latest enquiries.':'No enquiries.';}catch{status.textContent='Inbox unavailable. Please sign in again or retry.';}}document.getElementById('refresh').onclick=load;load();`;
const ADMIN_HEADERS = {...HEADERS, 'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'", 'X-Frame-Options':'DENY'};

// Dependencies are injectable only by local test imports, never through request/environment input.
export function createHandler({authorize=verifyOwner,verifyChallenge=turnstile} = {}) {
 return {async fetch(request, env) {
  const url=new URL(request.url); const origin=request.headers.get('Origin');
  const cors=origin===PUBLIC_ORIGIN?{'Access-Control-Allow-Origin':PUBLIC_ORIGIN,'Vary':'Origin'}:{};
  try {
   if(url.pathname==='/health' && request.method==='GET')return json({service:'heidelberg-contact',contactEnabled:Boolean(ready(env)),uploadsEnabled:false});
   if(url.pathname.startsWith('/admin')) {
    await authorize(request.headers.get('Cf-Access-Jwt-Assertion'),env);
    if(request.method==='GET' && url.pathname==='/admin')return new Response(DASHBOARD,{headers:{...ADMIN_HEADERS,'Content-Type':'text/html; charset=utf-8'}});
    if(request.method==='GET' && url.pathname==='/admin/style.css')return new Response(ADMIN_CSS,{headers:{...ADMIN_HEADERS,'Content-Type':'text/css; charset=utf-8'}});
    if(request.method==='GET' && url.pathname==='/admin/app.js')return new Response(ADMIN_JS,{headers:{...ADMIN_HEADERS,'Content-Type':'text/javascript; charset=utf-8'}});
    if(request.method==='GET' && url.pathname==='/admin/api/enquiries') {
     if(!env.DB)throw new Reject(503,'inbox_unavailable');
     const result=await env.DB.prepare('SELECT id, created_at, first_name, last_name, email, phone, message FROM enquiries WHERE expires_at > ? ORDER BY created_at DESC LIMIT 100').bind(Date.now()).all();
     return json({enquiries:result.results});
    }
    const deletion=/^\/admin\/api\/enquiries\/([a-f0-9-]{36})$/.exec(url.pathname);
    if(request.method==='DELETE' && deletion) {
     if(origin !== url.origin || request.headers.get('X-Heidelberg-Admin')!=='1')throw new Reject(403,'forbidden');
     if(!env.DB)throw new Reject(503,'inbox_unavailable');
     const result=await env.DB.prepare('DELETE FROM enquiries WHERE id = ?').bind(deletion[1]).run();
     if(!result.success)throw Error('database');return json({deleted:true});
    }
    return json({error:'not_found'},404);
   }
   // Uploads explicitly deferred; there is no upload endpoint or R2 binding.
   if(url.pathname !== '/api/enquiries')return json({error:'not_found'},404);
   if(origin !== PUBLIC_ORIGIN)throw new Reject(403,'origin_denied');
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...HEADERS,...cors,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
   if(request.method!=='POST')return json({error:'method_not_allowed'},405,cors);
   if(!ready(env))throw new Reject(503,'contact_not_active');
   const d=validateEnquiry(await limitedJSON(request));
   const ip=request.headers.get('CF-Connecting-IP');if(!ip)throw new Reject(403,'client_unverified');
   const hour=Math.floor(Date.now()/3600000), day=Math.floor(hour/24);
   const hash=await hashedIP(ip,env.RATE_HASH_SECRET,String(hour));
   await quota(env.DB,'global:'+day,200,(day+2)*86400000);
   await quota(env.DB,'client:'+hour+':'+hash,5,(hour+2)*3600000);
   await verifyChallenge(d.token,env);
   const id=crypto.randomUUID(),now=Date.now();
   const result=await env.DB.prepare('INSERT INTO enquiries (id, created_at, expires_at, first_name, last_name, email, phone, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id,now,now+Number(env.RETENTION_DAYS)*86400000,d.first,d.last,d.email,d.phone,d.message).run();
   if(!result.success)throw Error('database');
   return json({received:true,reference:id},201,cors);
  } catch(e) {return json({error:e instanceof Reject?e.message:'service_unavailable'},e instanceof Reject?e.status:503,cors);}
 }, async scheduled(_event,env) {
   if(!env.DB)return;
   const now=Date.now();
   await env.DB.batch([env.DB.prepare('DELETE FROM request_limits WHERE expires < ?').bind(now),env.DB.prepare('DELETE FROM enquiries WHERE expires_at < ?').bind(now)]);
 }};
}
export default createHandler();
