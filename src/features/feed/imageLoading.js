/** Prepare nearby photos once; do not remove their src when scrolling away. */
export function retainedImageSource(previous, url, loaded) {
  return loaded || previous === url ? url : undefined;
}

export function observeFeedImage(article, ready, environment = window) {
  const Observer = environment.IntersectionObserver;
  if (!Observer) { ready(); return () => {}; }
  const feed = article.closest('.editorial-feed--scroll');
  const main = article.closest('.editorial-main--feed');
  const root = feed && /^(auto|scroll)$/.test(environment.getComputedStyle(feed).overflowY) ? feed : main;
  const lead = Math.min(1200, Math.max(480, root?.clientHeight || environment.innerHeight || 480));
  const observer = new Observer(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    ready();
    observer.disconnect();
  }, { root, rootMargin: `${lead}px 0px`, threshold: 0 });
  observer.observe(article);
  return () => observer.disconnect();
}
