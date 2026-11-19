import {randomBytes,createHash} from 'node:crypto';
import {hash,json} from './_lib.js';
export default function handler(req,res){
 if(req.method!=='GET')return json(res,405,{message:'Method not allowed'});
 const nonce=randomBytes(16).toString('hex'),expires=Date.now()+120000;
 return json(res,200,{nonce,expires,signature:hash('pow:'+nonce+':'+expires),difficulty:3});
}
export function verifyProof(proof){
 const {nonce,expires,signature,counter}=proof||{};
 if(typeof nonce!=='string'||!/^[a-f0-9]{32}$/.test(nonce)||!Number.isSafeInteger(expires)||expires<Date.now()||expires>Date.now()+120000||typeof signature!=='string'||signature!==hash('pow:'+nonce+':'+expires)||!Number.isInteger(counter)||counter<0||counter>2000000)return false;
 return createHash('sha256').update(nonce+':'+counter).digest('hex').startsWith('000');
}