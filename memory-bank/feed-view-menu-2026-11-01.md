# Feed view utility and Vercel review · 2026-11-01

User requested an example of the category-independent Feed view, execution of remaining tasks except legal review/recovery copies, and review of Vercel deployment risk. Later explicitly put the proposed new deployment restriction on hold. The new rolling24hour2release cap and enforcement scripts were removed before commit; no new frequency cap, account configuration or automatic deployment blocker is installed.

## Feed view
- A separate View button sits beside the original Feed navigation button. The original button still navigates normally. Category rail stays unchanged.
- Mobile portrait: explicit-click bottom sheet. Wide/landscape: compact anchored modal popup. Both use the existing Radix focus/escape/outside-close behavior, English/Korean labels and selected state.
- All photos / Needs feedback use existing all/waiting feed modes. Category remains selected. No new DB migration or evaluation/result rule. Existing waiting RPC includes public, not-own, not-already-rated, <=10ratings and viewing permissions. Temporarily hidden A/B remains hidden.
- Five focused cases: mobile selection/category retained; Escape closes/preserves mode/focus returns; PC English selection/popup/focus returns (fixed collapsed-trigger visibility after initial failure); landscape844x390 popup and44x52 view target; existing pre-vote counts/result-hiding contract test by exact name. Full suite/local full app build not run. Fixtures only compile menu/navigation/styles, no Supabase or production media calls.

## Vercel findings
Official docs checked https://vercel.com/docs/limits : Hobby100deployments/86400seconds(owner),100/3600seconds(owner),60/300seconds(owner). Build units may differ from observed deployment record count. https://vercel.com/docs/errors/error-list : fair-use/ToS scope blocks are separate and may prevent deployments or return451. These docs do not establish the cause of the user's historical block or guarantee safety below listed limits. Gemini's speculative alternate causes and absolute no-account-block assurance were rejected.
Actual authenticated read-only snapshot2026-11-01: Hobby team team_73YMuIOoV5ob2rEKH6sRsquE, observed last24h16 (product-test8 + otherproject8), last1h2, last5min0, allREADY, pagination complete. Blocked/paused fields absent/null are not proof of never being blocked. Connected Gmail narrow Vercel block-notice search returned no matches; not proof no notice exists in other accounts. Existing vercel.json already disables non-main/non-preview/facs branches. Git and CLI duplicate deploy remains avoided. Ignored Build Step alone is not treated as avoiding creation quotas. No new numeric release rule is active per latest user request.

## Remaining work follow-through
- Reddit original/modmail were actually checked minutes earlier (18:01KST): no reply, filter removal remains. Reuse evidence; no duplicate polling/posting. Existing monitor stays active; AlphaAndBetaUsers publication already completed.
- facs-3 Nov5 and facs-7 Nov7 ACTIVE confirmed. Nov5 same automation updated to record staging migration202611010001 history only if genuine QA triggers a permitted resume, after target guard + migration list. Do not wake paused staging merely for history or reapply SQL.
- Real push receipt remains unverified. Server readiness is already verified; actual opt-in device + genuine first-rating arrival is needed. No synthetic operational vote or disclosure of subscription endpoints for QA. Preparation in task artifact release-safety-2026-11-01/remaining-work.md.
- Legal review/recovery copies excluded as requested.
