# Optional upload / A-B feed presentation pause · 2026-11-01

User requested temporary hiding, not removal: the Upload Optional fieldset (A/B and public shared-preview opt-in) and A/B cards in Feed. Preserve database records, existing consent and votes; owner profile record/deletion is unchanged. Existing normal uploads, media carousel, age ratings and result-before-vote rules are unchanged.

- `src/features/growth/availability.js`: two local presentation switches, both false. Product approval is needed before reopening. Reopen both switches together; no schema restoration is needed.
- Upload suppresses the whole optional fieldset. Effective comparison mode is null for validation, preview and submission; public-preview opt-in cannot be set by a stale hidden control. Backend capabilities remain intact.
- App filters A/B cards from visible Feed and refuses profile/scrap/notification opens into the hidden comparison screen with a bilingual notice. Profile records remain available for owner deletion. These are presentation switches, not a new security boundary.
- Feed retains pagination if an entire fetched page is hidden and exposes Load more in that case, avoiding a false terminal empty state.
- Root cause of A/B top blank: `object-fit: contain` was vertically centered within the full-height feed card. Align comparison media top; labels use a fixed feed offset instead of 15% of card height. Retained preview uses 38dvh / max320px. Ordinary media CSS is untouched.

Focused checks (4 only; no full suite/local full build):
1. Actual Upload render, English/Korean: both optional controls absent, category/question/preview/submit remain.
2. A/B excluded without mutating stored votes/media; actual normal Feed render retains YES/NO and hides aggregate before voting.
3. Empty filtered page with more pages retains sentinel/manual Load more even with IntersectionObserver support.
4. Actual ComparisonMedia + production CSS in isolated browser fixture with local synthetic SVG: 390x640 top gap223px ->0px, feed label72px, preview261.8125px (<320px). No production upload/vote used for QA.
Harness setup issues were corrected (CJS import.meta.url, whitespace in JSX text assertion, geometry percentage parser); passed cases were not rerun without a related change.

Pre-deploy target: www.factsmack.com verified on Vercel project prj_TO6nO7SfgNp0rzrBpxNDK1DMTrJq; actual Production VITE_SUPABASE_URL host rrcntobfmxlwbbjtlbge.supabase.co matches the logged-in Supabase Dashboard /project/rrcntobfmxlwbbjtlbge/sql path. No DB changes, staging restart, new credentials or paid services.

Pending separately: feed-view replacement menu proposal (not approved/implemented), SideProject moderator response, optional real-device push receipt, Nov5 free-usage decision, Nov7 campaign effect review. Legal review/recovery copy remain deferred as instructed. This pause is not another unfinished launch feature.
