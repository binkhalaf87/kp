import pg from 'pg';
import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:8000,ssl:{rejectUnauthorized:false}});
export function db(){
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL missing');
 return async function sql(strings,...values){
  let query='';
  for(let i=0;i<strings.length;i++){query+=strings[i];if(i<values.length)query+='$'+(i+1)}
  const r=await pool.query(query,values);
  return r.rows;
 };
}
export function secret(){if(!process.env.CONTEST_SECRET||process.env.CONTEST_SECRET.length<32)throw Error('CONTEST_SECRET missing');return process.env.CONTEST_SECRET}
export function hash(value){return createHmac('sha256',secret()).update(value).digest('hex')}
export function cookies(req){const out={};for(const part of (req.headers.cookie||'').split(';')){const i=part.indexOf('=');if(i>0)out[part.slice(0,i).trim()]=part.slice(i+1).trim()}return out}
export function device(req,res){let id=cookies(req).kp_art_device;if(!id||!/^[a-f0-9]{64}$/.test(id)){id=randomBytes(32).toString('hex');res.setHeader('Set-Cookie','kp_art_device='+id+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000')}return id}
export function admin(req){const token=cookies(req).kp_art_admin||'';const [expiry,sig]=token.split('.');if(!/^\d{13}$/.test(expiry||'')||Number(expiry)<Date.now()||!sig||!/^[a-f0-9]{64}$/.test(sig))return false;return timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(hash('admin:'+expiry),'hex'))}
export function loginCookie(){const expiry=String(Date.now()+8*3600*1000);return 'kp_art_admin='+expiry+'.'+hash('admin:'+expiry)+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800'}
export function json(res,status,body){res.status(status).setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(body))}
export function normalizePhone(v){const s=String(v||'').replace(/[\s-]/g,'');const p=s.startsWith('05')?'+966'+s.slice(1):s;return /^\+9665\d{8}$/.test(p)?p:null}
export function sameOrigin(req){const origin=req.headers.origin;if(!origin)return true;try{const u=new URL(origin);return u.protocol==='https:'&&u.hostname===String(req.headers.host||'').split(':')[0]}catch{return false}}
export async function captcha(token,ip){if(!process.env.TURNSTILE_SECRET_KEY)return false;const body=new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:token||'',remoteip:ip||''});const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body,signal:AbortSignal.timeout(6000)});return !!(await r.json()).success}
