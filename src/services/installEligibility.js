/** Keep installation offers away from the photo-rating task and first-use path. */
export function canOfferInstall({tab,authenticated,voteCount,policyOpen,ready}) {
 return Boolean(authenticated&&tab==='profile'&&voteCount>0&&!policyOpen&&ready);
}
