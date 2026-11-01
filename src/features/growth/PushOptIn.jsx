import{useEffect,useState}from'react';
import{currentPushEnabled,disablePush,enablePush,getPushConfig}from'../../services/growthApi.js';
export default function PushOptIn({locale='en'}){
 const en=locale==='en';const[available,A]=useState(false),[enabled,E]=useState(false),[busy,B]=useState(false),[message,M]=useState('');
 useEffect(()=>{let active=true;if(!('Notification'in window)||!('PushManager'in window)||!('serviceWorker'in navigator))return;
 getPushConfig().then(async c=>{if(!active||!c.available)return;A(true);const r=await navigator.serviceWorker.getRegistration();const sub=await r?.pushManager.getSubscription();if(active)E(Boolean(sub)&&await currentPushEnabled());}).catch(()=>{});return()=>{active=false;};},[]);
 if(!available)return null;
 async function toggle(){B(true);M('');try{if(enabled){await disablePush();E(false);}else E(await enablePush(locale));}catch{M(en?'Could not update notifications. Try again.':'알림 설정을 바꾸지 못했어요. 다시 시도해 주세요.');}finally{B(false);}}
 return <aside className="mb-3 rounded-lg border border-[#d7d1c5] p-3"><p className="text-xs font-bold">{en?'Know when feedback arrives':'평가가 도착하면 알려드릴까요?'}</p><p className="mt-1 text-[11px] text-[#66686d]">{en?'Optional on this device. Do not enable on a shared device. You can turn it off here.':'이 기기에서만 선택하는 알림이에요. 공용 기기에서는 켜지 마세요. 여기서 언제든 끌 수 있어요.'}</p><button type="button" disabled={busy} onClick={toggle} className="mt-2 min-h-9 text-xs font-bold underline disabled:opacity-50">{busy?(en?'Updating…':'변경 중…'):enabled?(en?'Turn off notifications':'알림 끄기'):(en?'Notify me about my posts':'내 게시물 알림 받기')}</button>{message&&<p role="status" className="mt-1 text-xs">{message}</p>}</aside>;
}
