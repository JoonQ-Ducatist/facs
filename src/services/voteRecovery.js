/** Read only this authenticated voter's immutable receipt after an uncertain insert. */
export async function recoverSavedVote(client, postId, userId, error) {
  if (error?.code && !['23505','PGRST000'].includes(error.code)) return null;
  try {
    const identity=await client.auth.getUser();
    if(identity.error||identity.data?.user?.id!==userId)return null;
    const receipt=await client.from('votes').select('choice,perceived_age').eq('post_id',postId).eq('voter_id',userId).maybeSingle();
    if(receipt.error||!receipt.data)return null;
    const row=receipt.data;
    if(row.choice==='yes'||row.choice==='no')return row.choice;
    return Number.isInteger(row.perceived_age)&&row.perceived_age>=18&&row.perceived_age<=99?row.perceived_age:null;
  } catch { return null; }
}
