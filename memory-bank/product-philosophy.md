# FACt.Smack Product Philosophy — Human Desire Engine

> **Canonical Product Principle**  
> FACt.Smack의 출발점은 기능이나 기술이 아니라 인간이 반복적으로 느끼는 근원적 욕망이다.

---

## 1. Founding Thesis

FACt.Smack는 다음과 같은 인간의 기본적이고 반복적인 욕구에서 출발한다.

> **이성 · 관계 · 평가 · 자랑 · 칭찬 · 욕망**

사람은 다른 사람에게 어떻게 보이는지 궁금해하고, 관심 있는 사람에게 선택받고 싶어하며, 자신의 매력과 취향을 드러내고 싶어한다. 타인의 반응을 통해 자신을 확인하고, 좋은 반응을 받으면 그것을 공유하고 싶어하며, 그 과정에서 새로운 관계가 형성된다.

FACt.Smack는 이 행동을 억지로 만들어내는 서비스가 아니라 **이미 존재하는 인간의 욕구를 매우 짧고 쉬운 디지털 행동으로 연결하는 서비스**를 지향한다.

```text
보여주고 싶다
    ↓
남들이 어떻게 볼지 궁금하다
    ↓
평가받는다
    ↓
칭찬·인정·관심을 얻는다
    ↓
결과를 자랑·공유한다
    ↓
사람을 발견한다
    ↓
관계가 축적된다
    ↓
다시 보여주고 싶어진다
```

이 순환을 **Human Desire Loop**라고 정의한다.

---

## 2. Six Human Drivers

| Driver | Human Need | FACt.Smack Product Translation |
|---|---|---|
| **이성 / Attraction** | 매력적으로 보이고 선택받고 싶은 욕구 | Date, Outfit, Profile 등 첫인상 평가 |
| **관계 / Relationship** | 관심이 맞는 사람과 연결되고 관계를 유지하려는 욕구 | 초기에는 콘텐츠·평가·프로필, 이후 Follow/Relationship 기능 |
| **평가 / Evaluation** | 타인의 시선으로 자신을 확인하려는 욕구 | YES/NO, Perceived Age, 상황별 First Impression Data |
| **자랑 / Expression** | 자신의 좋은 모습·성과·스타일을 보여주고 싶은 욕구 | Upload, Look Book, Profile, Result Share |
| **칭찬 / Recognition** | 인정·호감·긍정적 피드백을 받고 싶은 욕구 | Result, Ranking, 긍정적 반응, 변화 추적 |
| **욕망 / Desire** | 더 매력적으로 보이고 더 많은 관심·정보·관계를 얻고 싶은 욕구 | 반복 Upload, Boost, Report, Premium experience |

이 여섯 요소는 서로 독립된 기능이 아니라 하나의 행동 엔진을 구성한다.

---

## 3. Product Identity

FACt.Smack의 표면적 기능은 사진/영상과 평가지만 제품의 본질은 다음과 같다.

> **“다른 사람의 시선을 통해 나를 확인하고, 보여주고, 인정받고, 관계로 확장하는 플랫폼.”**

따라서 FACt.Smack는 단순 SNS, 외모 점수 앱, 소개팅 앱 중 하나로 고정하지 않는다.

- **SNS적 요소:** 보여주기, 자랑, 공유, 관계 축적
- **Feedback 요소:** 타인의 즉각적인 평가
- **Data 요소:** 주관적 첫인상을 집단 데이터로 전환
- **Attraction 요소:** 이성/호감이라는 강한 참여 동기
- **Relationship 요소:** 콘텐츠와 평가를 통해 발견된 사람 사이의 관계 확장

초기 진입점은 **평가와 궁금증**, 장기적 네트워크 자산은 **관계**다.

> **콘텐츠는 소비하지만 관계는 축적된다.**

---

## 4. Human Desire Loop × Cash Loop

제품의 욕망 루프와 수익 루프를 분리하지 않는다.

```text
[Human Desire]
타인을 본다
   ↓
평가한다
   ↓
나도 어떻게 보이는지 궁금해진다
   ↓
Upload
   ↓
평가/칭찬/관심을 받는다
   ↓
더 알고 싶어진다
   ↓
결과를 공유·자랑한다
   ↓
새로운 사람/관계가 유입된다
   ↓
반복

[Cash Layer]
Result
   ↓
더 많은 평가가 궁금하다 → BOOST
   ↓
더 깊이 알고 싶다 → REPORT
   ↓
계속 확인하고 비교하고 싶다 → FACS+
```

수익화는 사용자의 불안이나 열등감을 인위적으로 키워 결제를 강요하는 방식이 아니라 **이미 발생한 궁금증에 더 많은 표본·분석·편의성을 제공하는 방식**으로 설계한다.

---

## 5. Core Experience Principles

### 5.1 Attraction is a powerful entry point, not the whole product

이성에게 어떻게 보이는지는 강한 참여 동기다. 그러나 FACt.Smack 전체를 데이팅 앱으로 한정하지 않는다. Outfit, Work, Fitness, Profile, Perceived Age 등 다양한 상황에서 동일한 욕구 구조를 사용한다.

### 5.2 Evaluation must be instant

첫인상은 장문의 리뷰가 아니다. 기본 Interaction은 빠른 YES/NO를 유지하고 실제 사용자 데이터에 따라 YES/MAYBE/NO 등 대안을 A/B Test한다.

### 5.3 Showing off must create acquisition

자랑은 단순 허영으로 취급하지 않는다. 사용자가 좋은 Result를 외부에 공유하고 싶어 하는 행동을 **Result Share → Guest Vote → New User** Growth Loop로 연결한다.

### 5.4 Recognition must create return visits

사용자는 결과가 궁금해서 돌아와야 한다. 평가 수 증가, 결과 변화, 충분한 표본 도달, 비교 결과 등이 자연스러운 재방문 이유가 되어야 한다.

### 5.5 Relationships are accumulated value

초기 MVP에서 Follow/Chat을 우선 개발하지 않더라도 장기 제품 설계에서는 사람과 사람 사이의 연결을 중요한 자산으로 유지한다. 관계 기능은 Cash Loop 검증 이후 단계적으로 도입한다.

### 5.6 Desire must never become manipulation

욕망을 제품 동력으로 사용하되 다음은 금지한다.

- 결과를 의도적으로 낮춰 결제를 유도
- 돈을 내면 YES/긍정 평가를 제공
- 가짜 투표·가짜 사용자·가짜 칭찬 생성
- 사용자의 불안/열등감을 의도적으로 자극하는 Paywall 문구
- 과도한 비교로 괴롭힘·외모 비하를 조장
- 결제를 숨기거나 해지를 어렵게 만드는 Dark Pattern

**욕망은 Acquisition/Engagement의 원천이지 사용자를 착취하기 위한 수단이 아니다.**

---

## 6. Category Design Rule

신규 카테고리는 단순히 SNS에서 인기 있는 주제인지가 아니라 다음 질문으로 판단한다.

1. 사용자가 **자신을 보여주고 싶은 상황**인가?
2. 타인이 자신을 **어떻게 평가할지 궁금한가?**
3. 긍정적 결과를 **자랑하거나 공유하고 싶은가?**
4. 동일 사용자가 **반복해서 사용할 이유**가 있는가?
5. 결과가 새로운 **관심·발견·관계**로 이어질 수 있는가?
6. 더 많은 표본이나 분석에 **돈을 지불할 이유**가 있는가?
7. 글로벌 문화에서도 이해 가능한 욕구인가?
8. Safety/Privacy/Data Integrity를 지킬 수 있는가?

현재 MVP 후보:

`Outfit / Date / Fitness / Work / Profile / Perceived Age`

이 후보들은 위 Human Desire 기준과 Cash Loop 기준으로 최종 재평가한다.

---

## 7. Feature Priority Rule

앞으로 기능 우선순위는 기존의 “SNS에 필요한 기능인가?”보다 다음 순서로 판단한다.

| Priority | Question |
|---|---|
| 1 | 인간의 기본 욕구 중 하나를 실제 행동으로 전환하는가? |
| 2 | Vote → Upload → Result 반복을 강화하는가? |
| 3 | Result Share를 통해 신규 사용자를 데려오는가? |
| 4 | 더 많은/깊은 데이터를 만들어 FACt.Smack의 데이터 자산을 강화하는가? |
| 5 | Boost / Report / FACS+의 자연스러운 결제 이유를 만드는가? |
| 6 | 장기적으로 사람과 사람 사이의 관계 자산을 축적하는가? |
| 7 | 1인 운영과 자동화가 가능한가? |
| 8 | Trust & Safety를 훼손하지 않는가? |

기능이 위 항목에 의미 있는 기여를 하지 않으면 MVP에서는 후순위로 둔다.

---

## 8. UX Direction

FACt.Smack의 UX는 사용자가 설명서를 읽고 이해하는 구조가 아니라 본능적으로 행동하는 구조를 지향한다.

```text
SEE → JUDGE → WONDER → SHOW → RECEIVE → SHARE → CONNECT → RETURN
```

- **SEE:** 다른 사람의 콘텐츠를 즉시 본다.
- **JUDGE:** 1초 안에 평가한다.
- **WONDER:** “나는 어떻게 보일까?”라는 궁금증이 생긴다.
- **SHOW:** 자신의 사진/영상을 올린다.
- **RECEIVE:** 실제 사람들의 반응과 데이터를 받는다.
- **SHARE:** 좋은 결과를 외부에 공유한다.
- **CONNECT:** 사람/취향/관심을 발견한다.
- **RETURN:** 새로운 상황에서 다시 확인한다.

---

## 9. Marketing Direction

마케팅도 기능 설명보다 인간의 궁금증을 먼저 자극한다.

좋은 방향:

- “다른 사람 눈에는 내가 어떻게 보일까?”
- “첫 만남에서 나는 어떤 인상일까?”
- “이 사진, 프로필로 써도 될까?”
- “몇 살처럼 보여?”

피해야 할 방향:

- 외모의 절대적 우열을 판정한다는 주장
- AI가 사람의 매력을 객관적으로 측정한다는 주장
- 낮은 점수를 수치심으로 연결하는 마케팅
- 데이팅/성적 욕망만을 서비스 전체 정체성으로 과도하게 강조

---

## 10. Long-Term Product Arc

```text
Phase 1 — Curiosity
다른 사람을 평가하고 나의 결과를 확인

Phase 2 — Identity
카테고리별 First Impression Data와 Profile 축적

Phase 3 — Recognition
Result / Ranking / Share / 비교를 통한 인정과 표현

Phase 4 — Relationship
Follow / Discovery / Relationship / 제한적 Chat 등 관계 축적

Phase 5 — Commerce
사용자의 스타일·관심·콘텐츠 맥락에서 Visual Commerce/Affiliate 확장
```

기술은 이 흐름을 가능하게 하는 수단이다. AI 역시 제품의 존재 이유가 아니라 개발·운영·분석·향후 필요한 사용자 가치 구현을 위한 도구로 취급한다.

---

## 11. Canonical One-Line Principle

> **FACt.Smack는 이성·관계·평가·자랑·칭찬·욕망이라는 인간의 반복적인 욕구를 ‘보여주기 → 평가 → 데이터 → 공유 → 관계’로 연결하고, 그 과정에서 더 많은 표본·분석·편의성에 대한 자연스러운 결제를 만드는 글로벌 First Impression Platform이다.**

---

## 12. Governance

이 문서는 FACt.Smack의 **상위 Product Philosophy 문서**다.

향후 `service-design-rule.md`, `feature-backlog.md`, `90-day-cash-loop-plan.md`, `monetization.md`, UX/UI, DB/API 및 마케팅 의사결정이 이 철학과 충돌할 경우 다음 순서로 판단한다.

1. Trust & Safety / 법률 / 개인정보 보호
2. 이 문서의 Human Desire Product Philosophy
3. Cash Loop / Monetization Strategy
4. MVP 실행 속도
5. 개별 기능 요구사항

새로운 제품 결정은 단기 Engagement만이 아니라 **Human Desire Loop → Cash Loop → Relationship Asset**의 장기 구조에 어떤 영향을 주는지 함께 검토한다.
