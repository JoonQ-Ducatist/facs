/** Two original photos, same size and no aggregate result before voting. */
export default function ComparisonMedia({media=[],className=''}){
 return <div className={`comparison-media ${className}`} role="group" aria-label="A / B">{media.slice(0,2).map((item,index)=><figure key={item.id??index}><img src={item.url} alt={`Photo ${index===0?'A':'B'}`} loading="lazy" draggable="false" onContextMenu={e=>e.preventDefault()}/><figcaption>{index===0?'A':'B'}</figcaption></figure>)}</div>;
}
