import { useSyncExternalStore } from 'react';
export const WIDE_NAVIGATION_QUERY = '(min-width: 1024px), (orientation: landscape)';
function subscribe(callback) {
 const media=window.matchMedia(WIDE_NAVIGATION_QUERY);
 media.addEventListener('change',callback);
 return()=>media.removeEventListener('change',callback);
}
export function useWideNavigation() {
 return useSyncExternalStore(subscribe,()=>window.matchMedia(WIDE_NAVIGATION_QUERY).matches,()=>false);
}
