import { createSign } from 'node:crypto';
import { getVercelOidcToken } from '@vercel/oidc';
const b64=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
export async function analyticsAccessToken(env=process.env,fetcher=fetch,oidcProvider=getVercelOidcToken){
 if(!env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON)return federatedAnalyticsToken(env,fetcher,oidcProvider);
 let account;try{account=JSON.parse(env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON||'{}');}catch{throw Error('UNAVAILABLE');}
 if(!account.client_email||!account.private_key||String(account.token_uri||'https://oauth2.googleapis.com/token')!=='https://oauth2.googleapis.com/token')throw Error('UNAVAILABLE');
 const now=Math.floor(Date.now()/1000),header=b64({alg:'RS256',typ:'JWT'}),claim=b64({iss:account.client_email,scope:'https://www.googleapis.com/auth/analytics.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const input=header+'.'+claim;const signer=createSign('RSA-SHA256');signer.update(input);const jwt=input+'.'+signer.sign(account.private_key).toString('base64url');
 const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('UNAVAILABLE');const data=await response.json();if(!data.access_token)throw Error('UNAVAILABLE');return data.access_token;
}

// Keyless alternative: Google verifies Vercel's signed runtime identity against
// the one production-only provider and service-account binding configured in IAM.
async function federatedAnalyticsToken(env,fetcher,oidcProvider){
 const provider=env.GOOGLE_WIF_PROVIDER;
 const email=env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL;
 if(!/^projects\/\d+\/locations\/global\/workloadIdentityPools\/facs-vercel-ga4\/providers\/vercel-production$/.test(provider||'')||email!=='facs-ga4-reader@project-8d3ff8b3-4b81-482c-b15.iam.gserviceaccount.com')throw Error('UNAVAILABLE');
 try{
  const subjectToken=await oidcProvider();
  const exchanged=await fetcher('https://sts.googleapis.com/v1/token',{
   method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(8000),
   body:JSON.stringify({audience:'//iam.googleapis.com/'+provider,grantType:'urn:ietf:params:oauth:grant-type:token-exchange',requestedTokenType:'urn:ietf:params:oauth:token-type:access_token',scope:'https://www.googleapis.com/auth/cloud-platform',subjectTokenType:'urn:ietf:params:oauth:token-type:jwt',subjectToken}),
  });
  if(!exchanged.ok)throw Error('UNAVAILABLE');const federation=await exchanged.json();if(!federation.access_token)throw Error('UNAVAILABLE');
  // The STS scope does not grant a project role; the account has only GA4 Viewer.
  // The final access token is restricted to analytics.readonly and 15 minutes.
  const response=await fetcher('https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'+encodeURIComponent(email)+':generateAccessToken',{
   method:'POST',headers:{Authorization:'Bearer '+federation.access_token,'Content-Type':'application/json'},signal:AbortSignal.timeout(8000),
   body:JSON.stringify({scope:['https://www.googleapis.com/auth/analytics.readonly'],lifetime:'900s'}),
  });
  if(!response.ok)throw Error('UNAVAILABLE');const result=await response.json();if(!result.accessToken)throw Error('UNAVAILABLE');return result.accessToken;
 }catch{throw Error('UNAVAILABLE');}
}
