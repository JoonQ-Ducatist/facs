import {createHash, randomBytes} from 'node:crypto';
export const TOKEN=/^[a-f0-9]{64}$/;
export const NOTES=['clear','natural','lighting','background','crop'];
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const newToken=()=>randomBytes(32).toString('hex');
export function inputFeedback(input){
 if(!TOKEN.test(input.token||''))throw Error('INPUT');
 if(!['open','image','vote','report'].includes(input.action))throw Error('INPUT');
 if(input.action==='vote'&&(input.ageConfirmed!==true||!['yes','no'].includes(input.choice)||(input.note!=null&&!NOTES.includes(input.note))))throw Error('INPUT');
 if(input.action==='report'&&!['privacy','harassment','other'].includes(input.reason))throw Error('INPUT');
 return input;
}
export const privateHeaders={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'};
