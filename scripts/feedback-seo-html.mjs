// Static invitation metadata never includes a member photo, question, or fragment.
export function feedbackSeoHtml(html) {
 const replaceMeta=(source,key,value)=>source.replace(new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*("\\s*\\/?>)`),`$1${value}$2`);
 let result=html.replace(/<title>[^<]*<\/title>/,'<title>FACt.Smack | Photo feedback invitation</title>');
 const title='FACt.Smack | Photo feedback invitation';
 const description='Invited to a photo? Open your invitation to give a YES/NO opinion without an account. For ages 14 and older.';
 for(const key of ['og:title','twitter:title'])result=replaceMeta(result,key,title);
 for(const key of ['description','og:description','twitter:description'])result=replaceMeta(result,key,description);
 result=replaceMeta(result,'og:url','https://www.factsmack.com/feedback');
 result=result.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/,'<link rel="canonical" href="https://www.factsmack.com/feedback" />');
 result=result.replace(/<link[^>]*hreflang=[^>]*>/g,'');
 result=result.replace(/<meta name="robots"[^>]*>/,'');
 return result.replace('</head>','<meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="no-referrer" /></head>');
}
