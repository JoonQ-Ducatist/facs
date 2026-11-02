export const SURVEY_EVENTS = ['photo','privacy','rating','access','browse'].map(id => `participation_barrier_${id}`);
export async function readSurveyEvents(token, property, fetcher=fetch) {
  if (!/^\d+$/.test(String(property))) throw Error('UNAVAILABLE');
  const response=await fetcher(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({dateRanges:[{startDate:'29daysAgo',endDate:'today'}],dimensions:[{name:'date'},{name:'eventName'}],metrics:[{name:'eventCount'}],dimensionFilter:{filter:{fieldName:'eventName',inListFilter:{values:SURVEY_EVENTS}}},limit:200}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('UNAVAILABLE');
  const data=await response.json();
  const rows=(data.rows||[]).map(row=>({date:row.dimensionValues?.[0]?.value,name:row.dimensionValues?.[1]?.value,count:Number(row.metricValues?.[0]?.value||0)})).filter(row=>SURVEY_EVENTS.includes(row.name)&&/^\d{8}$/.test(row.date)&&Number.isFinite(row.count)&&row.count>=0);
  return {checkedAt:new Date().toISOString(),rows,events:SURVEY_EVENTS.map(name=>({name,count:rows.filter(row=>row.name===name).reduce((sum,row)=>sum+row.count,0)})),total:rows.reduce((sum,row)=>sum+row.count,0)};
}
