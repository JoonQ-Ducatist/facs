import {useState} from 'react';
import {feedbackRpc,noteOptions} from './feedbackClient.js';
export default function QuickNote({postId,locale='en'}){
 const [saved,setSaved]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 const en=locale==='en';
 async function choose(note){if(busy||saved)return;setBusy(true);setError(false);try{await feedbackRpc('save_feedback_note',{target_post_id:postId,input_note:note});setSaved(note);}catch{setError(true);}finally{setBusy(false);}}
 return <div data-no-translate className="mt-2 rounded-xl border border-white/30 p-2 text-xs text-white"><p>{saved?(en?'Your suggestion is saved. Thank you!':'의견을 저장했어요. 고마워요!'):(en?'Optional: add one helpful suggestion':'선택: 도움이 될 의견 한 가지')}</p>{!saved&&<div className="mt-1 flex flex-wrap gap-1">{noteOptions[locale==='ko'?'ko':'en'].map(([id,text])=><button type="button" key={id} disabled={busy} onClick={()=>choose(id)} className="min-h-9 rounded-lg border border-white/50 px-2">{text}</button>)}</div>}{error&&<p role="status">{en?'Could not save. You can continue without a note.':'저장하지 못했어요. 의견 없이 계속해도 괜찮아요.'}</p>}</div>;
}
