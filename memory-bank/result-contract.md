# FACt.Smack Result · Sample · Boost Contract

> 상태: **CL-02 설계안 — 사용자 승인 대기**  
> 상위 원칙: [Product Philosophy](./product-philosophy.md) · [Monetization](./monetization.md) · [90-day Cash Loop Plan](./90-day-cash-loop-plan.md)

## 1. 목적

무료 Result는 사용자가 FACt.Smack의 첫인상 데이터를 실제로 경험하는 완결된 가치여야 한다. Boost는 무료 결과를 의도적으로 불완전하게 만들거나 긍정 결과를 판매하는 도구가 아니라, 이미 확인한 결과에 대해 **더 큰 표본과 더 빠른 응답**을 원하는 사용자의 선택지다.

## 2. 유효 표본 상태

모든 숫자는 Closed Beta에서 재검증하는 초기 가설이다. `valid vote`는 로그인된 서로 다른 계정의 중복되지 않은, 서버 검증을 통과한 평가만 의미한다.

| 상태 | 유효 표본 | 무료 Result 표시 | 결제 제안 | UX 문구 원칙 |
| --- | ---: | --- | --- | --- |
| `INSUFFICIENT` | 0–9 | 결과값·긍정률·평균 나이를 확정적으로 표시하지 않음 | 원칙상 없음. 단, 게시 후 1시간 안에 다른 평가가 0개인 업로더에게만 노출 회복용 요청 가능 | “10명의 반응이 모이면 첫 경향을 알려드릴게요.” |
| `EARLY_SIGNAL` | 10–29 | YES/NO 비율 또는 평균 예상 나이를 **초기 경향**으로 표시 | Boost 노출 가능 | “현재 12명의 주관적 첫인상이에요.” |
| `BASE_RESULT` | 30–99 | 기본 Result·유효 표본·카테고리별 설명 표시 | Boost 기본 대상 | “30명의 첫인상으로 확인한 현재 결과예요.” |
| `EXPANDED_SAMPLE` | 100+ | 기본 Result·표본 변화·공유용 Result Card 표시 | Boost 종료, 향후 Report 후보 | “100명 이상의 첫인상이 모였어요.” |

### `PERCEIVED_AGE` 추가 원칙

- `EARLY_SIGNAL`부터 평균 예상 나이를 표시하되 “참여자의 주관적 첫인상”이라는 설명을 항상 함께 둔다.
- 업로더가 실제 나이를 선택 입력한 경우에도, 실제 나이와의 차이 표시는 `BASE_RESULT`부터 제공한다.
- 평가자·공개 피드·공유 카드에는 실제 나이를 절대 표시하지 않는다.

## 3. 무료 / Boost 경계

### 무료로 반드시 제공

- 게시물·사진 업로드, 유효 투표 수, 현재 상태에 맞는 Result
- `BASE_RESULT` 이후의 기본 YES/NO 비율 또는 평균 예상 나이
- 투표 무결성 안내와 Result Share 진입점
- 표본 부족 상태의 명확한 안내와 자연 유입을 위한 공유/평가 요청 동선

### Boost로 제공하는 것

- 목표 표본까지의 **추가 노출 우선순위**
- 가능한 경우 더 빠른 응답 도달을 위한 피드 배분
- 현재 표본과 목표 표본(예: `30명 → 100명`)의 진행 상태

Boost는 아래를 절대 제공하지 않는다.

- YES·긍정 평가·더 낮은 예상 나이 등 특정 결과 보장
- 가짜 평가·우호적 평가자 우선 배정·결과 조정
- Ranking 가산점·신뢰도 점수 조작

## 4. Boost 노출 조건과 문구

- `INSUFFICIENT`에는 결제형 Boost를 노출하지 않는다. 다만 게시 후 1시간 안에 다른 평가가 0개인 업로더에게만, 결제와 분리된 노출 회복용 `Boost 요청`을 한 번 제안할 수 있다.
- `EARLY_SIGNAL`과 `BASE_RESULT`에서만 한 번의 보조 CTA로 제안한다.
- 초기 목표는 **총 100명의 유효 평가**이며, 가격은 검증 가설인 **₩1,000/회**다. 목표 달성 속도와 추가 표본 수는 결제 전 명확히 고지하며, 결과 방향은 예측·보장하지 않는다.
- 가격을 올리기 전에는 Closed Beta와 실제 결제에서 평가 밀도·목표 표본 달성률·불만/환불률·재구매 의향을 함께 검토한다. 단순 가입자·노출 증가만으로는 인상하지 않는다.

권장 문구:

> 현재 30명의 첫인상이에요. 결과를 바꾸지 않고, 더 넓은 표본의 반응을 받아볼까요?

보조 문구:

> Boost는 추가 노출과 응답 기회만 늘립니다. 모든 평가는 독립적으로 집계됩니다.

## 5. Result UI 상태 계약

1. 상태 레이블은 색만으로 구분하지 않고, 표본 수와 텍스트를 같이 보여 준다.
2. Result 숫자는 상태에 맞는 표현을 사용한다. `EARLY_SIGNAL`의 값은 “초기 경향”, `BASE_RESULT` 이상은 “현재 결과”다.
3. `PERCEIVED_AGE`는 “측정”이나 “진단”이 아닌 “주관적 첫인상”으로 표현한다.
4. 부정적인 결과에도 결제를 유도하는 카피·카운트다운·반복 팝업을 사용하지 않는다.
5. Boost 구매 뒤에도 기존 결과·투표 이력·집계 방식은 유지되며, 추가 표본이 들어올 때만 Result가 갱신된다.

## 6. 분석 이벤트

| 이벤트 | 발생 시점 | 핵심 속성 |
| --- | --- | --- |
| `result_viewed` | Result 화면 열기 | `category`, `sample_status`, `valid_vote_count`, `evaluation_type` |
| `boost_offer_viewed` | 적격 Result의 CTA 노출 | `sample_status`, `valid_vote_count`, `target_votes`, `price` |
| `boost_started` | 결제 진입 | 위 속성 + `post_id` |
| `boost_purchased` | 결제 성공 | `price`, `target_votes`, `payment_id` |
| `boost_target_reached` | 목표 유효 표본 도달 | `start_votes`, `target_votes`, `elapsed_hours` |

## 7. CL-02 승인 뒤 구현 범위

1. API `sampleStatus`를 위 네 상태 enum으로 고정한다.
2. Result 화면에 상태별 카피·표본 수·Boost CTA를 구현한다.
3. mock API와 실제 API 모두에서 Boost가 평가 결과가 아니라 노출 상태만 변경하도록 분리한다.
4. Closed Beta에서 `Result View → Boost Offer → Purchase` 퍼널과 불만/환불률을 함께 측정한다.
