import{useEffect,useState}from'react';
import{currentPushEnabled,disablePush,enablePush,getPushConfig,sendDevicePushTest}from'../../services/growthApi.js';
export default function PushOptIn({locale='en',canTest=false}){
 const en=locale==='en';const[available,A]=useState(false),[enabled,E]=useState(false),[busy,B]=useState(false),[message,M]=useState('');
 useEffect(()=>{let active=true;if(!('Notification'in window)||!('PushManager'in window)||!('serviceWorker'in navigator))return;
 getPushConfig().then(async c=>{if(!active||!c.available)return;A(true);const r=await navigator.serviceWorker.getRegistration();const sub=await r?.pushManager.getSubscription();if(active)E(Boolean(sub)&&await currentPushEnabled());}).catch(()=>{});return()=>{active=false;};},[]);
 useEffect(()=>{if(!canTest||!('serviceWorker'in navigator))return;
 const received=event=>{if(event.data?.type==='facs-push-test-received'&&event.source?.scriptURL===new URL('/sw.js',location.origin).href)M(en?'Test notification reached this device.':'이 기기에 테스트 알림이 도착했어요.');};
 navigator.serviceWorker.addEventListener('message',received);return()=>navigator.serviceWorker.removeEventListener('message',received);
 },[canTest,en]);
 if(!available)return null;
 async function testDevice(){B(true);M(en?'Sending a clearly labeled test to this device…':'이 기기에 테스트 알림을 보내고 있어요…');try{const r=await sendDevicePushTest(locale);M(current=>current.includes(en?'reached this device':'도착했어요')?current:r.ok?(en?'Push service accepted the test. Waiting for device receipt.':'푸시 서비스가 접수했어요. 기기 수신을 기다립니다.'):r.code==='RATE_LIMITED'?(en?'Today’s test was already sent. Try tomorrow (Korean time).':'오늘 테스트는 이미 발송했어요. 내일 다시 확인할 수 있어요.'):en?'Could not send the test. Check notification permission.':'테스트를 보내지 못했어요. 알림 권한을 확인해 주세요.');}catch{M(en?'Could not send the test.':'테스트를 보내지 못했어요.');}finally{B(false);}}

 async function toggle(){B(true);M('');try{if(enabled){await disablePush();E(false);}else E(await enablePush(locale));}catch{M(en?'Could not update notifications. Try again.':'알림 설정을 바꾸지 못했어요. 다시 시도해 주세요.');}finally{B(false);}}
 return <aside className="mb-3 rounded-lg border border-[#d7d1c5] p-3"><p className="text-xs font-bold">{en?'Know when feedback arrives':'평가가 도착하면 알려드릴까요?'}</p><p className="mt-1 text-[11px] text-[#66686d]">{en?'Optional on this device. Do not enable on a shared device. You can turn it off here.':'이 기기에서만 선택하는 알림이에요. 공용 기기에서는 켜지 마세요. 여기서 언제든 끌 수 있어요.'}</p><button type="button" disabled={busy} onClick={toggle} className="mt-2 min-h-9 text-xs font-bold underline disabled:opacity-50">{busy?(en?'Updating…':'변경 중…'):enabled?(en?'Turn off notifications':'알림 끄기'):(en?'Notify me about my posts':'내 게시물 알림 받기')}</button>{canTest&&enabled&&<button type="button" disabled={busy} onClick={testDevice} className="ml-3 mt-2 min-h-9 text-xs underline disabled:opacity-50">{en?'Send test to this device':'이 기기로 테스트 알림 보내기'}</button>}{message&&<p role="status" className="mt-1 text-xs">{message}</p>}</aside>;
}
