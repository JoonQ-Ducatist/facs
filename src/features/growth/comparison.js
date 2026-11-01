export function isComparison(card){return card?.comparisonMode==='A_B';}
export function binaryLabels(card){return isComparison(card)?['A','B']:['YES','NO'];}
export function validateComparison(mode,media,evaluationType){
 return mode!=='A_B'||(evaluationType!=='NUMERIC_AGE'&&Array.isArray(media)&&media.length===2&&media.every(m=>m.type==='image'));
}
