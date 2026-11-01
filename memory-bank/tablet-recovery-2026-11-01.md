# Tablet layout and entry recovery — 2026-11-01

Owner Codex. Scope: requested iPad 10th generation portrait/landscape defects, login PWA prompt and About Us startup flash. Existing main e528ed8 and working tree were compared once; no unrelated changes present. Existing emergency production-fix authorization used; one Git production release. No DB, auth contract, language defaults, evaluation result access, media deletion or paid-service changes.

## Evidence and changes
- User images and CSS agree: 600–1023px app-canvas was explicitly capped at 430px, plus auth/splash width cap began at 600px. Removed tablet app-canvas cap; full-width auth/splash remain on touch devices while hover desktop >=1024px retains its existing centered auth treatment.
- Narrow landscape navigation formerly required max-height 599px, leaving taller landscape tablets on the bottom-menu shell. Extended the existing <=1023px landscape contract to taller devices; >=1024px continues existing desktop sidebar.
- Auth-entry branch explicitly mounted PwaInstallSheet. Removed that mount entirely; signed-in feed/ranking/profile eligibility, upload exclusion, 5-second timing and dismiss/suppress behavior retained.
- Visible About Us main was static #root HTML before React startup. Wrapped the public-discovery fallback in noscript, including localization output. JS-enabled startup never paints that main; no-JS description, metadata, JSON-LD, canonical, localized discovery content and existing About Us dialog remain. Search ranking/reverification is not guaranteed by this change.

## Focused verification (5 selected checks)
Two existing layout contract cases passed: narrow landscape phone navigation and portrait/desktop navigation. Two entry contracts passed: no PWA mount in auth branch while signed-in gates remain; English/Korean entry fallback is no-JS only with metadata preserved. One native Chrome component/geometry fixture matrix passed at 820x1050 auth/feed, 1180x700 feed, 960x700 feed, 390x744 feed, 915x412 feed and 1440x900 feed. Tablet portrait canvas/main/card 820px; 1180px landscape sidebar 76px/main/card 700px; narrow landscape sidebar216px/main430px; desktop centered three-column layout retained. Synthetic fixture uses actual AuthEntryView/FeedView and production CSS with shell structure; no live authentication/upload/vote or physical iPad Safari QA claimed. Initial harness newline listener error, missing shell flex-col class and overly strict desktop-left-zero assertion were corrected in fixture only; production code was not repeatedly changed to satisfy fixture mistakes. Final matrix evidence stored under chat artifact tablet-recovery-2026-11-01/layout-matrix.txt.
No full local build, full test suite, preview deployment or new QA server. Production Git build is the only release build; diff whitespace check passed.

## Production target guard
Vercel www.factsmack.com domain -> product-test / prj_TO6nO7SfgNp0rzrBpxNDK1DMTrJq under team_73YMuIOoV5ob2rEKH6sRsquE. Production VITE_SUPABASE_URL hostname rrcntobfmxlwbbjtlbge.supabase.co matched the open FACt.Smack main PRODUCTION Dashboard ref. No SQL executed.
Release SHA/state and follow-up audit: chat artifact tablet-recovery-2026-11-01/completion.md, recorded after release without second documentation deployment.
