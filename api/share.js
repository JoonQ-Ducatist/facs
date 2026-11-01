import{randomBytes}from'node:crypto';
import{clients,HOME,UUID}from'../server/growthCore.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function GET(request){
 const url=new URL(request.url),id=url.searchParams.get('post'),locale=url.searchParams.get('locale')==='ko'?'ko':'en',image=url.searchParams.get('image')==='1';
 if(!UUID.test(id||''))return new Response('Not found',{status:404});
 let post=null,service=null;
 try{service=clients().service;if(service){const r=await service.rpc('get_public_share_preview',{target_post_id:id});if(!r.error)post=r.data?.[0]??null;}}catch{}
 if(image){
  if(post&&service&&post.byte_size<=524288&&['image/jpeg','image/png','image/webp'].includes(post.mime_type)){try{
   const budget=await service.rpc('claim_public_preview_request');if(budget.data===true){
    const signed=await service.storage.from('facs-media').createSignedUrl(post.storage_path,60);
    if(!signed.error){
     const r=await fetch(signed.data.signedUrl,{headers:{Range:'bytes=0-524287'},signal:AbortSignal.timeout(7000)});
     const type=r.headers.get('content-type')?.split(';')[0];const length=Number(r.headers.get('content-length'));
     if(r.ok&&['image/jpeg','image/png','image/webp'].includes(type)&&length>0&&length<=524288){
      const bytes=await r.arrayBuffer();if(bytes.byteLength===Number(post.byte_size)&&bytes.byteLength<=524288)return new Response(bytes,{headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
     }else await r.body?.cancel();
    }
   }
  }catch{}}
  return Response.redirect(HOME+'/icon-512.png',302);
 }
 const target=new URL(locale==='ko'?'/ko/':'/',HOME);target.searchParams.set('post',id);target.searchParams.set('shared','1');
 const canonical=HOME+'/s/'+id;const title=post?String(post.question).slice(0,140):'FACt.Smack';const description=locale==='ko'?'사진 한 장, 다양한 시선. FACt.Smack에서 내 느낌을 나눠 보세요.':'One photo. More perspectives. Share your opinion on FACt.Smack.';
 const preview=post?HOME+'/api/share?post='+id+'&image=1':HOME+'/icon-512.png';const nonce=randomBytes(16).toString('base64');
 const html=`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><meta name="robots" content="noindex,follow"><meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${escape(preview)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:image" content="${escape(preview)}"><link rel="canonical" href="${canonical}"></head><body><main><p>FACt.Smack</p><a href="${escape(target.href)}">${locale==='ko'?'게시물 열기':'Open post'}</a></main><script nonce="${nonce}">location.replace(${JSON.stringify(target.href).replaceAll('<','\\u003c')});</script></body></html>`;
 return new Response(html,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`}});
}
