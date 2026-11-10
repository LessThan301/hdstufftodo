import { jwtVerify, createRemoteJWKSet } from 'jose';

// Form posts on the isolated Worker origin; custom-domain pages embed it. GitHub Pages' shared origin is never allowed for API access.
const PUBLIC_ORIGIN = 'https://heidelberg-contact.synoikon.workers.dev';
const SITE_ORIGINS = new Set([PUBLIC_ORIGIN, 'https://hdstufftodo.com', 'https://www.hdstufftodo.com']);
const FRAME_ANCESTORS = 'https://hdstufftodo.com https://www.hdstufftodo.com https://lessthan301.github.io';
const TURNSTILE_HOSTS = new Set(['heidelberg-contact.synoikon.workers.dev', 'hdstufftodo.com', 'www.hdstufftodo.com']);
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
  if(r.success !== true || !TURNSTILE_HOSTS.has(r.hostname) || r.action !== 'contact')throw new Reject(403,'verification_failed');
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
function ready(env) {return env.CONTACT_ENABLED === 'true' && env.OWNER_LOGIN_VERIFIED === 'true' && env.PRIVACY_APPROVED === 'true' && env.DB && env.TURNSTILE_SECRET && /^[a-zA-Z0-9_-]{10,100}$/.test(env.TURNSTILE_SITEKEY||'') && env.RATE_HASH_SECRET?.length>=32 && env.ACCESS_AUD && env.ACCESS_ISSUER && env.ADMIN_EMAIL === OWNER && Number.isInteger(Number(env.RETENTION_DAYS)) && Number(env.RETENTION_DAYS)>=1 && Number(env.RETENTION_DAYS)<=365;}

const DASHBOARD = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Heidelberg · private enquiry inbox</title><link rel="stylesheet" href="/admin/style.css"><main><h1>Heidelberg <small>StuffToDo</small></h1><p>Private enquiry inbox · signed in through Cloudflare Access</p><p id="status" role="status"></p><button id="refresh" type="button">Refresh inbox</button><div id="inbox"></div><p><a href="/admin/check">Check contact protection (no enquiry sent)</a></p><p>Photo uploads are deferred. No payment or booking is confirmed by an enquiry.</p></main><script src="/admin/app.js" defer></script></html>`;
const ADMIN_CSS = `body{margin:0;background:#fcf7ec;color:#302a2a;font:17px/1.6 Arial,sans-serif}main{max-width:900px;margin:auto;padding:30px}h1,h2{color:#630d34;font-family:Georgia,serif;font-weight:400}h1 small{display:block;font:20px Arial,sans-serif}article{padding:24px;background:white;margin:24px 0;border-top:3px solid #e3a83b}p{white-space:pre-wrap;overflow-wrap:anywhere}button{padding:10px;border:1px solid #630d34;background:white;color:#630d34;cursor:pointer}`;
const ADMIN_JS = `async function load(){const status=document.getElementById('status');status.textContent='Loading…';try{const r=await fetch('/admin/api/enquiries',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();const inbox=document.getElementById('inbox');inbox.replaceChildren();for(const row of data.enquiries){const card=document.createElement('article');for(const [tag,value] of [['h2',row.first_name+' '+row.last_name],['p',new Date(row.created_at).toLocaleString()],['p',row.email],['p',row.phone],['p',row.message]]){const el=document.createElement(tag);el.textContent=value||'';card.append(el);}const button=document.createElement('button');button.textContent='Delete enquiry';button.onclick=async()=>{if(!confirm('Permanently delete this enquiry?'))return;const r=await fetch('/admin/api/enquiries/'+encodeURIComponent(row.id),{method:'DELETE',credentials:'same-origin',headers:{'X-Heidelberg-Admin':'1'}});if(!r.ok){status.textContent='Could not delete. Nothing has been confirmed deleted.';return;}await load();};card.append(button);inbox.append(card);}status.textContent=data.enquiries.length?'Showing up to 100 latest enquiries.':'No enquiries.';}catch{status.textContent='Inbox unavailable. Please sign in again or retry.';}}document.getElementById('refresh').onclick=load;load();`;
function validationPage(env) {
 const key=env.TURNSTILE_SITEKEY;
 if(!/^[a-zA-Z0-9_-]{10,100}$/.test(key||''))return null;
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Heidelberg setup check</title><link rel="stylesheet" href="/admin/style.css"><main><h1>Verify contact protection</h1><p>You are signed in through the owner-only Access policy. This check sends no enquiry and writes no customer record. It verifies one real challenge and confirms the same token cannot be reused.</p><form><div class="cf-turnstile" data-sitekey="${key}" data-action="contact"></div><button type="submit">Run protection check</button></form><p id="status" role="status"></p><p><a href="/admin">Back to inbox</a></p></main><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script><script src="/admin/check.js" defer></script></html>`;
}
const VALIDATION_JS=`document.querySelector('form').addEventListener('submit',async ev=>{ev.preventDefault();const token=new FormData(ev.target).get('cf-turnstile-response');const status=document.getElementById('status');if(!token){status.textContent='Please complete the verification first.';return;}const options={method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Heidelberg-Admin':'1'},body:JSON.stringify({token})};status.textContent='Checking…';try{const first=await fetch('/admin/api/check',options);if(first.status!==200||(await first.json()).verified!==true)throw Error();const replay=await fetch('/admin/api/check',options);if(replay.status!==403||(await replay.json()).error!=='verification_failed')throw Error();status.textContent='Protection check passed: valid challenge accepted; replay rejected. No enquiry was sent. Please tell the site administrator this check passed.';}catch{status.textContent='Protection check not confirmed. Public enquiries remain disabled. Please report this result.';}finally{if(window.turnstile)window.turnstile.reset();}});`;

const ADMIN_HEADERS = {...HEADERS, 'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'", 'X-Frame-Options':'DENY'};

const CONTACT_CSS = `body{margin:0;padding:24px;color:#302a2a;background:#fcf7ec;font:16px/1.6 Arial,sans-serif}fieldset{border:0;padding:0;margin:0}legend{position:absolute;left:-10000px}h1{font:36px Georgia,serif;color:#630d34}label{display:block;margin:16px 0}input,textarea{display:block;box-sizing:border-box;width:100%;padding:10px;background:white;border:1px solid #baa9aa;font:inherit}button{padding:12px 18px;border:1px solid #630d34;background:#630d34;color:white;font:inherit;cursor:pointer}button:disabled{opacity:.6;cursor:not-allowed}.trap{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}.status{color:#630d34;font-weight:bold}`;
const CONTACT_JS = `const form=document.querySelector('form');const en=document.documentElement.lang==='en';if(form){form.querySelector('fieldset').disabled=false;form.addEventListener('submit',async ev=>{ev.preventDefault();const status=document.querySelector('[role=status]'),button=form.querySelector('button');if(!form.reportValidity())return;const values=new FormData(form);const data={first:values.get('first'),last:values.get('last'),email:values.get('email'),phone:values.get('phone'),message:values.get('message'),website:values.get('website'),token:values.get('cf-turnstile-response')||''};if(!data.token){status.textContent=en?'Please complete the verification first.':'Bitte schließen Sie zuerst die Sicherheitsprüfung ab.';return;}button.disabled=true;status.textContent=en?'Sending…':'Wird gesendet…';try{const r=await fetch('/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'omit'});const result=await r.json();if(r.status!==201||result.received!==true)throw Error();form.reset();status.textContent=en?'Your enquiry has been received. This is not a booking confirmation.':'Ihre Anfrage ist eingegangen. Dies ist noch keine Buchungsbestätigung.';}catch{status.textContent=en?'Your enquiry could not be confirmed. Please try again or use the contact details on the website.':'Der Eingang konnte nicht bestätigt werden. Bitte versuchen Sie es erneut oder nutzen Sie die Kontaktdaten auf der Website.';}finally{button.disabled=false;if(window.turnstile)window.turnstile.reset();}});}`;
function contactPage(env,lang) {
 const en=lang==='en', active=ready(env) && /^[a-zA-Z0-9_-]{10,100}$/.test(env.TURNSTILE_SITEKEY||'');
 const heading=en?'Ask about your tour':'Ihre Tour anfragen';
 const note=en?'Direct submission is being set up. No information is collected through this form yet. Please use the contact details on the website.':'Der Direktversand wird eingerichtet. Über dieses Formular werden noch keine Daten erfasst. Bitte nutzen Sie die Kontaktdaten auf der Website.';
 const labels=en?['First name','Last name','E-mail','Phone (optional)','Message']:['Vorname','Nachname','E-Mail','Telefon (optional)','Nachricht'];
 const form=active?`<form method="post" action="/api/enquiries"><fieldset disabled><legend>${en?'Tour enquiry':'Touranfrage'}</legend><label>${labels[0]}<input name="first" autocomplete="given-name" maxlength="100" required></label><label>${labels[1]}<input name="last" autocomplete="family-name" maxlength="100" required></label><label>${labels[2]}<input name="email" type="email" autocomplete="email" maxlength="254" required></label><label>${labels[3]}<input name="phone" type="tel" autocomplete="tel" maxlength="60"></label><label>${labels[4]}<textarea name="message" maxlength="5000" rows="5" required></textarea></label><label class="trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><div class="cf-turnstile" data-sitekey="${env.TURNSTILE_SITEKEY}" data-action="contact"></div><p>${en?'By submitting, we store your details (name, e-mail, optional phone, message) to answer your tour enquiry. Processing via Cloudflare (EU D1 database; Turnstile security check). Access only for the operator via the protected inbox (hdstufftodo@gmail.com). Automatic deletion after 90 days. Details: <a href=\"https://hdstufftodo.com/datenschutz.html\" target=\"_blank\" rel=\"noopener\">Privacy</a>.':'Mit dem Absenden speichern wir Ihre Angaben (Name, E-Mail, optional Telefon, Nachricht), um Ihre Touranfrage zu beantworten. Verarbeitung über Cloudflare (EU-D1-Datenbank; Turnstile-Sicherheitsprüfung). Zugriff nur für die Betreiberin über den geschützten Posteingang (hdstufftodo@gmail.com). Automatische Löschung nach 90 Tagen. Details: <a href=\"https://hdstufftodo.com/datenschutz.html\" target=\"_blank\" rel=\"noopener\">Datenschutz</a>.'}</p><p class="status" role="status" aria-live="polite"></p><button type="submit">${en?'Send enquiry':'Anfrage senden'}</button></fieldset></form><noscript><p>${en?'JavaScript is required for secure submission. Please use the contact details on the website.':'Für den sicheren Versand ist JavaScript erforderlich. Bitte nutzen Sie die Kontaktdaten auf der Website.'}</p></noscript><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script><script src="/contact/app.js" defer></script>`:`<p role="status">${note}</p>`;
 return `<!doctype html><html lang="${en?'en':'de'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title><link rel="stylesheet" href="/contact/style.css"><main><h1>${heading}</h1>${form}</main></html>`;
}
const CONTACT_HEADERS = {...HEADERS,'Content-Security-Policy':"default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors "+FRAME_ANCESTORS+"; base-uri 'none'; form-action 'none'"};

// Dependencies are injectable only by local test imports, never through request/environment input.
export function createHandler({authorize=verifyOwner,verifyChallenge=turnstile} = {}) {
 return {async fetch(request, env) {
  const url=new URL(request.url); const origin=request.headers.get('Origin');
  const cors=SITE_ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
  try {
   if(request.method==='GET' && url.pathname==='/contact')return new Response(contactPage(env,url.searchParams.get('lang')),{headers:{...CONTACT_HEADERS,'Content-Type':'text/html; charset=utf-8'}});
   if(request.method==='GET' && url.pathname==='/contact/style.css')return new Response(CONTACT_CSS,{headers:{...CONTACT_HEADERS,'Content-Type':'text/css; charset=utf-8'}});
   if(request.method==='GET' && url.pathname==='/contact/app.js')return new Response(CONTACT_JS,{headers:{...CONTACT_HEADERS,'Content-Type':'text/javascript; charset=utf-8'}});
   if(url.pathname==='/health' && request.method==='GET') { const databaseReady=Boolean(env.DB && (await env.DB.prepare('SELECT 1 AS ready').first())?.ready===1); const retentionDays=Number(env.RETENTION_DAYS); return json({service:'heidelberg-contact',contactEnabled:Boolean(ready(env)),uploadsEnabled:false,databaseReady,retentionDays:Number.isInteger(retentionDays)?retentionDays:null}); }
   if(url.pathname.startsWith('/admin')) {
    await authorize(request.headers.get('Cf-Access-Jwt-Assertion'),env);
    if(request.method==='GET' && url.pathname==='/admin/check') {
     const page=validationPage(env);if(!page)throw new Reject(503,'verification_not_configured');
     return new Response(page,{headers:{...ADMIN_HEADERS,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}});
    }
    if(request.method==='GET' && url.pathname==='/admin/check.js')return new Response(VALIDATION_JS,{headers:{...ADMIN_HEADERS,'Content-Type':'text/javascript; charset=utf-8'}});
    if(request.method==='POST' && url.pathname==='/admin/api/check') {
     if(origin!==url.origin || request.headers.get('X-Heidelberg-Admin')!=='1')throw new Reject(403,'forbidden');
     if(!env.TURNSTILE_SECRET)throw new Reject(503,'verification_not_configured');
     const body=await limitedJSON(request);if(Object.keys(body).some(k=>k!=='token') || typeof body.token!=='string' || !body.token || body.token.length>2048)throw new Reject(400,'invalid_token');
     await verifyChallenge(body.token,env);return json({verified:true,noEnquirySent:true});
    }
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
   if(!SITE_ORIGINS.has(origin))throw new Reject(403,'origin_denied');
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
