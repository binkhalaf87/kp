import {verifyProof} from './challenge.js';
import {db,json,device,hash,normalizePhone,captcha,sameOrigin,clientIp} from './_lib.js';
export default async function handler(req,res){if(req.method!=='POST')return json(res,405,{message:'Method not allowed'});if(!sameOrigin(req))return json(res,403,{message:'طلب غير مسموح'});try{
const body=req.body||{};const name=String(body.name||'').trim(),phone=normalizePhone(body.phone),id=String(body.artwork_id||'');
if(name.length<2||name.length>80)return json(res,400,{message:'اكتب اسم المصوّت (حرفان على الأقل)'});
if(!phone)return json(res,400,{message:'رقم الجوال غير صحيح. اكتبه بصيغة 05XXXXXXXX'});
if(!/^[a-f0-9-]{36}$/i.test(id))return json(res,400,{message:'الرسمة غير صحيحة. حدّث الصفحة وأعد المحاولة'});
const ip=clientIp(req);if(process.env.TURNSTILE_SECRET_KEY ? !(await captcha(body.turnstile_token,ip)) : !verifyProof(body.proof))return json(res,403,{message:'تعذر التحقق من الطلب. أعد المحاولة'});
const dev=device(req,res);const sql=db();
const recent=await sql`select count(*)::int as n from contest_votes where ip_hash=${hash(ip||'unknown')} and created_at>now()-interval '10 minutes'`;
if(recent[0].n>=30)return json(res,429,{message:'عدد كبير من المحاولات. حاول لاحقًا'});
const result=await sql`insert into contest_votes(group_id,artwork_id,voter_name,phone_hash,device_hash,ip_hash)
select g.id,a.id,${name},${hash(phone)},${hash(dev)},${hash(ip||'unknown')}
from contest_artworks a join contest_groups g on g.id=a.group_id
where a.id=${id}::uuid and a.guardian_consent_at is not null and g.published=true and g.starts_at<=now() and g.starts_at+interval '72 hours'>now()
on conflict do nothing returning id`;
if(result.length)return json(res,200,{message:'تم تسجيل صوتك بنجاح 🎨'});
const open=await sql`select 1 from contest_artworks a join contest_groups g on g.id=a.group_id where a.id=${id}::uuid and a.guardian_consent_at is not null and g.published=true and g.starts_at<=now() and g.starts_at+interval '72 hours'>now()`;
if(!open.length)return json(res,409,{message:'انتهى التصويت لهذه المجموعة أو الرسمة غير متاحة'});
return json(res,409,{message:'سبق التصويت في هذه المجموعة بهذا الرقم أو من هذا الجهاز'});
}catch(e){console.error('vote error',e.message);return json(res,503,{message:'تعذر تسجيل الصوت حاليًا'})}}
