# FACt.Smack — First Impression Data Platform

> **첫인상을 직관에서 데이터로.**  
> 사진/짧은 영상을 올리고, 실제 사람들의 빠른 평가를 통해 상황별 첫인상을 데이터로 확인하는 글로벌 플랫폼.

![FACt.Smack Preview](assets/images/card1_business.jpg)

---

## 🎯 Product Vision

FACt.Smack는 단순 SNS, 소개팅 앱, 외모 평가 앱이 아닙니다.

사용자가 특정 상황의 사진 또는 10초 이내 영상을 업로드하면 다른 사용자들이 빠르게 평가하고, 그 결과를 축적해 **상황별 First Impression Data**로 보여주는 플랫폼입니다.

핵심 질문은 하나입니다.

> **“나는 다른 사람들에게 어떻게 보일까?”**

제품의 핵심 가치는 `콘텐츠 소비 → 평가 → 업로드 → 결과 확인 → 더 많은 데이터 → 공유`의 반복 루프에서 만들어집니다.

---

## 💸 90-Day Cash Loop

현재 FACt.Smack의 최우선 목표는 기능이 많은 SNS를 완성하는 것이 아니라 **90일 안에 실제 사용자의 첫 결제와 반복 가능한 현금흐름을 검증하는 것**입니다.

```text
Feed
  ↓
Vote (YES / NO)
  ↓
"나도 궁금하다"
  ↓
Upload
  ↓
First Impression Result
  ↓
Share ───────────────→ New User → Vote
  ↓
Boost
  ↓
Premium Report
  ↓
FACS+
  ↓
Return / Re-upload
```

모든 제품 의사결정은 다음 질문을 우선합니다.

> **이 기능이 Acquisition → Engagement → Data → Monetization → Referral 중 무엇을 강화하는가?**

---

## 💰 Revenue Model

| Layer | Product | Initial Price Hypothesis | Value |
|---|---|---:|---|
| FREE | 기본 Feed / Vote / Upload / Result | ₩0 | 핵심 가치 경험 및 사용자 획득 |
| BOOST | 추가 노출 및 더 많은 평가 표본 | ₩1,900/회 우선 테스트 | 더 빠르고 많은 응답 확보 |
| REPORT | First Impression 상세 분석 | ₩5,900/회 우선 테스트 | 충분한 표본 기반의 심화 결과 |
| FACS+ | 반복 사용자 구독 | ₩7,900/월 우선 테스트 | Boost/Report 혜택, 변화 추적, Premium 기능 등 |

가격은 확정값이 아니라 실제 결제 데이터를 통해 검증할 **초기 가설**입니다.

**원칙:** 결제로 긍정적인 평가를 구매할 수 없습니다. 유료 상품은 더 많은 표본, 노출 속도, 분석 깊이와 편의성을 제공합니다. 평가 결과의 신뢰성을 수익화보다 우선합니다.

장기 Revenue Stack은 `Subscription + Boost + Report + Ads + Visual Commerce/Affiliate`로 확장합니다.

---

## 🚀 MVP Priority

### P0 — Cash Loop

- 저마찰 회원가입 / 인증
- 가입 직후 Feed 진입 (프로필 설정 강제 없음)
- 사진 및 10초 이내 영상 Feed
- **YES / NO** 빠른 평가
- 사진/영상 Upload
- 카테고리별 표준 질문
- First Impression Result
- Result Share Card / Share URL
- Guest Vote 진입 구조 검토
- Analytics / Funnel 측정
- Boost / Payment

### P1 — PMF Support

- Profile / My Page
- Comments (답글 depth 1)
- Daily / Category Ranking Top 5
- Notification

### P2 — Expansion

- Follow
- Relationship / 24h Chat
- Advanced Report / AI-assisted analysis
- Visual Commerce / Affiliate
- 사진 속 의류·신발·가방·소품 Visual Search 및 판매처 연결

---

## 🗂 MVP Category Candidates

현재 MVP 카테고리는 다음 6개입니다. 여행은 초기 MVP 범위에서 제외하며, 향후 실험 지표를 기준으로 재검토합니다.

| Category | Global Label | Example Question / Interaction |
|---|---|---|
| 오늘의 룩 | Outfit | 오늘 이 스타일, 괜찮아 보여요? |
| 데이트 | Date | 첫 만남이라면 호감이 가나요? |
| 운동 | Fitness | 건강하고 매력적인 인상을 주나요? |
| 출근 | Work | 직장에서 좋은 첫인상을 줄 것 같나요? |
| SNS 프로필 | Profile | 이 사진, 프로필 사진으로 괜찮아 보여요? |
| 몇 살로 보여? | How Old Do I Look? / `PERCEIVED_AGE` | 다른 사용자가 보이는 나이를 빠르게 선택 |

### Perceived Age 후보

`몇 살로 보여?`는 일반 YES/NO 대신 **Perceived Age(보이는 나이)**를 집단 평가로 산출하는 별도 인터랙션을 검토합니다.

- 실제 나이는 사용자가 결과 비교를 원하는 경우에만 입력하는 방향 검토
- 실제 나이를 공개 프로필에 자동 노출하지 않음
- 성인 사용자 대상 운영 방향 검토
- 결과는 참여자들의 주관적 인상임을 명확히 표시
- 향후 더 많은 표본을 위한 Boost, 사진 A/B 비교, 변화 추적 및 Premium Report 확장 가능

---

## 🗳 Evaluation Model

MVP 기본 평가 방식은 **YES / NO**입니다.

목표는 복잡한 설문이 아니라 사진을 본 순간의 첫인상을 빠르게 포착하는 것입니다.

향후 실제 데이터 기반 A/B Test 후보:

```text
YES / NO
vs.
YES / MAYBE / NO
```

`YES / SoSo / NO`도 후보로 보관하지만 글로벌 UX에서는 `MAYBE`를 우선 검토합니다. 평가 완료율, 평가시간, 업로드율, 콘텐츠 삭제율, 심리적 부담 및 중간 응답 집중 현상을 비교한 뒤 결정합니다.

---

## 🔁 Growth Loop

Result Share를 단순 공유 기능이 아니라 **핵심 Acquisition 기능**으로 설계합니다.

```text
Upload → Vote → Result → Share → New User → Guest Vote → Signup → Upload
```

외부 SNS에서 공유 결과를 본 사용자가 가능한 한 적은 마찰로 평가에 참여하고, 이후 자신의 첫인상을 확인하기 위해 가입/업로드하도록 전환하는 구조를 검증합니다.

초기 고객획득은 대규모 유료광고보다 작은 타깃 집단에서 평가 밀도를 높이는 데 집중합니다.

---

## 📊 Core Metrics

- Visitor → Signup
- Signup → First Vote
- Vote → Upload
- Upload → Result View
- D1 / D7 Retention
- Free → Paid Conversion
- ARPPU
- MRR

**North Star Metric 후보:** `Weekly Valid Votes (주간 유효 평가 수)`

사용자 수 자체보다 실제로 가치 있는 평가 데이터가 얼마나 생성되는지를 우선 측정합니다.

---

## 🗓 90-Day Execution Plan

| Phase | Period | Goal |
|---|---|---|
| Product Core | D1–14 | Signup → Feed → YES/NO → Upload → Result 동작 |
| Closed Beta | D15–30 | 실제 사용자 100명+ 및 초기 평가 데이터 확보 |
| Retention / Growth | D31–45 | Vote → Upload → Result 재방문 및 Result Share 검증 |
| First Revenue | D46–60 | Boost 도입 및 제3자의 첫 실제 결제 발생 |
| Monetization | D61–75 | First Impression Report 및 가격/전환 A/B Test |
| Recurring Revenue | D76–90 | FACS+ 도입, 첫 MRR 및 반복결제 검증 |

90일의 성공 기준은 단순 출시가 아니라 **모르는 고객이 실제 돈을 지불하고 다시 결제할 이유가 있음을 증명하는 것**입니다.

---

## 🧭 Development Stages

1. **Product Core** — 카테고리, 질문, 평가 방식, 무료/유료 경계, 가격가설 확정
2. **Core UX** — Splash → Signup → Feed → Vote → Upload → Result
3. **Working MVP** — Auth / DB / Storage / Feed / Vote / Upload / Result
4. **Closed Beta** — 실제 행동 및 Retention 검증
5. **Growth Loop** — Result Card / Share URL / Guest Vote / Referral
6. **First Revenue** — Boost / Payment
7. **Monetization** — Premium Report / Pricing Test
8. **Recurring Revenue** — FACS+
9. **Scale** — Referral / Organic Content / Paid UA 실험
10. **Expansion** — Ads / Visual Commerce / Affiliate / Relationship 기능

기능을 수평적으로 모두 만든 뒤 출시하지 않고, **Cash Loop 단위의 Vertical Slice**를 우선 완성합니다.

---

## 🎨 Design System Direction

- **Mobile-first** UI
- PC에서도 모바일 중심 레이아웃 우선
- 사진/영상이 UI보다 주인공이 되는 콘텐츠 중심 디자인
- Korean UI: **Pretendard Variable**
- English / Latin UI: **Inter Variable**
- 다국어 확장을 고려한 Locale 기반 Typography 구조

---

## 🛠 Current Prototype Stack

현재 저장소의 프로토타입은 빠른 UX 검증을 위해 다음 구조를 사용합니다.

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3
- **Styling**: Tailwind CSS
- **Storage**: Browser LocalStorage
- **Architecture**: Single Page Application (SPA)

### Target Production Architecture

프로덕션 전환 시 현재 검토 중인 기본 방향:

- **App / Client**: Flutter 중심 검토
- **Backend**: Supabase
- **Database**: PostgreSQL
- **Auth**: Supabase Auth
- **Media Storage**: Supabase Storage
- **Push**: Firebase
- **Analytics**: Firebase Analytics / 대안 분석 도구 비교 후 확정
- **Source Control**: GitHub

기술 스택은 Cash Loop 검증 속도와 운영비를 우선하여 최종 확정합니다.

---

## 🤖 One-Person Operating Model

FACt.Smack는 초기 단계에서 1인 창업자가 운영 가능한 구조를 목표로 합니다.

회원가입, Storage, 평가 집계, Result 생성, 이메일, Push, Analytics 및 운영 KPI 리포트는 가능한 범위에서 자동화합니다. AI는 고객에게 보여주기 위한 목적보다 **개발·운영·분석을 자동화하는 내부 도구**로 우선 활용합니다.

단, 신고, 미성년자 보호, 성적/유해 콘텐츠 등 **Trust & Safety는 완전 자동화 대상으로 보지 않습니다.**

---

## 💻 Getting Started

프로젝트 루트에서 Vite 개발 서버를 실행합니다.

```bash
npm run dev
```

터미널에 표시된 로컬 URL로 접속합니다.

---

## 📁 Current Prototype Structure

```text
FACt.Smack/
├── src/                  # React UI, 기능 모듈, 서비스 어댑터
├── assets/               # 목업·디자인 검증용 미디어
├── supabase/             # 마이그레이션과 서버 경계
├── memory-bank/          # 현재 제품·기술·협업 기준
├── index.html
├── vite.config.js
└── README.md
```

---

## ▶ Next Action

**MVP Category Finalization**

현재 6개 MVP 카테고리(`Outfit / Date / Fitness / Work / Profile / Perceived Age`)를 다음 기준으로 재평가합니다.

`Traffic Potential · Repeat Usage · Result Curiosity · Virality · Boost Purchase Intent · Report Expandability · Global Scalability · Safety/Risk`

이후 **Product Core → Core UX → Working MVP → Closed Beta → First Revenue** 순으로 진행합니다.
