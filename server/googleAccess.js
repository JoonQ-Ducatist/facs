import { createSign } from 'node:crypto';
const b64=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
export async function analyticsAccessToken(env=process.env,fetcher=fetch){
 let account;try{account=JSON.parse(env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON||'{}');}catch{throw Error('UNAVAILABLE');}
 if(!account.client_email||!account.private_key||String(account.token_uri||'https://oauth2.googleapis.com/token')!=='https://oauth2.googleapis.com/token')throw Error('UNAVAILABLE');
 const now=Math.floor(Date.now()/1000),header=b64({alg:'RS256',typ:'JWT'}),claim=b64({iss:account.client_email,scope:'https://www.googleapis.com/auth/analytics.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const input=header+'.'+claim;const signer=createSign('RSA-SHA256');signer.update(input);const jwt=input+'.'+signer.sign(account.private_key).toString('base64url');
 const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('UNAVAILABLE');const data=await response.json();if(!data.access_token)throw Error('UNAVAILABLE');return data.access_token;
}
