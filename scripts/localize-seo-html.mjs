import { DISCOVERY_CONTENT, renderDiscoveryBody } from '../src/services/discoveryContent.js';

/** Generate localized visible text, metadata and the WebPage entity together. */
export function localizeSeoHtml(html, locale) {
  const copy = DISCOVERY_CONTENT[locale];
  if (!copy) throw new Error('Unsupported discovery locale');
  const home = `https://www.factsmack.com/${locale === 'ko' ? 'ko/' : ''}`;
  const attribute = (v) => v.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const replace = (pattern, value) => {
    if (!pattern.test(html)) throw new Error(`Missing SEO template field: ${pattern}`);
    html = html.replace(pattern, () => value);
  };
  replace(/<html lang="[^"]+">/, `<html lang="${locale}">`);
  replace(/<link rel="manifest" href="[^"]*"\s*\/>/, `<link rel="manifest" href="${locale === 'ko' ? '/manifest-ko.webmanifest' : '/manifest.webmanifest'}" />`);
  replace(/<title>[^<]*<\/title>/, `<title>${attribute(copy.title)}</title>`);
  replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${attribute(copy.description)}" />`);
  replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${home}" />`);
  for (const [key, value] of Object.entries({ title: copy.title, description: copy.description, url: home, locale: locale === 'ko' ? 'ko_KR' : 'en_US', 'locale:alternate': locale === 'ko' ? 'en_US' : 'ko_KR' })) {
    replace(new RegExp(`<meta property="og:${key}" content="[^"]*"\\s*\\/>`), `<meta property="og:${key}" content="${attribute(value)}" />`);
  }
  for (const [key, value] of [['title', copy.title], ['description', copy.description]]) {
    replace(new RegExp(`<meta name="twitter:${key}" content="[^"]*"\\s*\\/>`), `<meta name="twitter:${key}" content="${attribute(value)}" />`);
  }
  replace(/<!-- public-discovery:start -->[\s\S]*?<!-- public-discovery:end -->/, `<!-- public-discovery:start -->\n      ${renderDiscoveryBody(locale)}\n      <!-- public-discovery:end -->`);
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Missing structured data');
  const schema = JSON.parse(match[1]);
  const page = schema['@graph'].find((node) => node['@type'] === 'WebPage');
  if (!page) throw new Error('Missing WebPage entity');
  Object.assign(page, { '@id': `${home}#webpage`, url: home, name: copy.title, description: copy.description, inLanguage: locale });
  replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`);
  return html;
}
