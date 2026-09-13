# 격리된 무료 Supabase 권한 검증

이 문서는 운영 프로젝트를 건드리지 않고, 별도의 무료 Supabase 프로젝트에서 인증·RLS·공개범위·스크랩 권한을 확인하기 위한 실행 순서다. 테스트 프로젝트의 URL과 키는 운영 Vercel 변수에 넣지 않는다.

## 1. 테스트 프로젝트 준비

사용자가 직접 해야 하는 작업:

1. Supabase Dashboard에서 새 조직 또는 기존 무료 조직의 **새 프로젝트**를 만든다. 프로젝트 이름에는 `facs-rls-test`처럼 운영과 분리된 이름을 사용한다.
2. 결제수단 등록이나 Pro 전환을 선택하지 않는다. 현재 무료 플랜은 활성 프로젝트를 최대 2개까지 제공하지만, 7일 비활성 시 자동 일시정지될 수 있다.
3. 아래 두 검증 트랙 중 하나를 선택해 SQL Editor에서 실행한다. 운영 프로젝트의 SQL Editor에서는 실행하지 않는다.
   - **Core-only 트랙**: `202609050001_core_mvp.sql`만 실행한다. 초기 핵심 권한과 투표·스크랩 경계만 검증한다.
   - **Full-migration 트랙**: `supabase/migrations/`의 파일을 파일명 순서대로 최신 파일까지 모두 실행한다. 현재 저장소에는 `202609110005_follows_and_personalized_feed.sql`을 포함해 팔로우·팔로워 공개범위·개인화 피드 마이그레이션이 포함되어 있다.
4. 테스트 프로젝트의 Project URL과 publishable/anon 키만 PM에게 전달한다. service-role 키와 OAuth secret은 전달하지 않는다.

비용 게이트: 무료 한도를 넘기거나 자동 일시정지를 피하려고 Pro로 전환하는 것은 별도 승인 없이는 하지 않는다. 무료 프로젝트는 비활성 상태에서 일시정지될 수 있으므로 테스트 기간이 길어지면 사용자가 Dashboard에서 직접 재개한다.

## 2. 테스트 사용자

사용자가 직접 Magic Link를 요청할 테스트 주소 두 개를 준비한다. 운영 고객 주소와 실제 개인정보를 쓰지 않는다. 각 사용자는 서로 다른 브라우저 프로필에서 로그인해 `A`와 `B`로 구분한다. 테스트가 끝나면 Auth Users에서 두 계정과 테스트 게시물을 직접 삭제하거나 프로젝트 전체를 폐기한다.

## 3. 핵심 시나리오

| ID | 확인 내용 | 기대 결과 |
| --- | --- | --- |
| AUTH-01 | A 가입 | `auth.users` 생성과 동시에 A의 `profiles` 행이 생성된다. |
| AUTH-02 | A가 자신의 `profiles` 수정 | display name 등 일반 필드는 수정되지만 `role`을 admin으로 바꾸는 UPDATE는 거부된다. |
| POST-01 | A가 자신의 draft 생성 | author_id가 A이고 status가 draft인 행만 생성된다. |
| POST-02 | B가 A의 draft 조회 | 조회되지 않는다. A 본인은 자신의 draft를 볼 수 있다. |
| POST-03 | A가 게시물을 published/public로 만든 뒤 B가 조회 | B는 공개 게시물만 조회할 수 있다. |
| POST-04 | 공개 게시물을 followers로 변경 | **Core-only**에서는 follow 관계 테이블·정책이 없어 검증하지 않는다. **Full-migration**에서는 A가 B를 팔로우한 뒤 B가 A의 followers 게시물을 조회할 수 있고, 팔로우하지 않은 사용자는 조회할 수 없어야 한다. |
| VOTE-01 | B가 A의 published 게시물에 yes/no 투표 | 한 번만 성공한다. |
| VOTE-02 | B가 같은 게시물에 두 번째 투표 | unique 제약으로 거부된다. |
| VOTE-03 | A가 자신의 게시물에 투표 | 트리거에서 거부된다. |
| VOTE-04 | B가 draft 게시물에 투표 | published가 아니므로 거부된다. |
| VOTE-05 | 익명 세션이 raw votes SELECT 시도 | SELECT 정책이 없어 행을 읽을 수 없다. |
| RESULT-01 | B가 `get_post_aggregate` 실행 | 집계 수치만 반환되고 voter_id·원본 선택값은 반환되지 않는다. |
| RESULT-02 | 로그아웃 상태에서 RPC 실행 | authenticated 권한이 없어 실행되지 않는다. |
| SCRAP-01 | B가 자신의 게시물을 스크랩 | 자신의 user_id로만 생성된다. |
| SCRAP-02 | A가 B의 스크랩 조회·삭제 시도 | RLS가 거부한다. |
| SCRAP-03 | 공개 게시물이 삭제/비공개 전환된 뒤 B가 스크랩 조회 | 접근 가능한 게시물만 반환되므로 목록에서 사라진다. |
| PRIVATE-01 | A가 `post_private_details.actual_age` 작성·조회 | A만 볼 수 있고 B는 읽을 수 없다. |
| PRIVATE-02 | B가 A의 private details를 추측한 post_id로 조회 | 거부된다. |

## 4. Full-migration 전용 시나리오

아래 항목은 `202609110005_follows_and_personalized_feed.sql`까지 모든 마이그레이션을 순서대로 적용한 경우에만 실행한다.

| ID | 확인 내용 | 기대 결과 |
| --- | --- | --- |
| FOLLOW-01 | A가 B를 팔로우 | `follows(follower_id=A, followed_id=B)`가 생성된다. 자신의 계정을 팔로우하거나 차단된 상대를 팔로우하는 요청은 거부된다. |
| FOLLOW-02 | A가 자신의 팔로우를 삭제 | A가 만든 자신의 관계만 삭제된다. B의 관계나 다른 회원의 관계는 삭제할 수 없다. |
| FOLLOW-03 | A가 B의 followers 게시물 조회 | 팔로우 중에는 게시물·연결 미디어를 조회할 수 있다. |
| FOLLOW-04 | A가 B를 언팔로우한 뒤 같은 게시물 조회·투표·스크랩 | 더 이상 접근할 수 없고 새 투표·스크랩도 거부된다. 차단 상태가 되면 팔로우 여부와 관계없이 거부된다. |
| FEED-01 | A가 `get_personalized_feed_post_ids` 실행 | 팔로우한 작성자의 게시물이 먼저 나오고, 이후 A의 투표 이력에서 많이 나타난 카테고리와 발견 게시물이 이어진다. 반환값에는 `post_id`와 `source`만 포함된다. |
| FEED-02 | A가 카테고리 필터와 페이지 크기를 지정 | 지정 카테고리만 반환되고 페이지 크기는 1~50 범위로 제한된다. |
| FEED-03 | 로그아웃 상태에서 개인화 피드 RPC 실행 | `authenticated` 권한이 없어 실행되지 않는다. |

## 5. 검증 트랙별 범위와 보류

- **Core-only 트랙의 한계**: `202609050001_core_mvp.sql`만 적용하면 `post_visibility = followers` enum 값은 존재하지만 `follows` 관계 테이블·정책과 팔로워 판별 함수가 없다. 따라서 followers 공개범위는 의도적으로 보류하고, POST-04는 “추가 마이그레이션 필요”로 기록한다.
- **Full-migration 트랙의 기준**: 현재 저장소의 모든 migration을 순서대로 적용하면 `follows` RLS, followers 공개범위 판별, 팔로우 우선 개인화 피드 함수까지 포함된다. 이 경우 POST-04와 FOLLOW/FEED 시나리오를 실행해 전체 권한 경계를 확인한다.
- 이 문서는 SQL 소스 기준의 검증 계획이다. 별도의 테스트 프로젝트에 어떤 트랙을 적용했는지가 실제 검증 결과의 전제이므로, 결과 보고서에 `core-only` 또는 `full-migration`을 반드시 표시한다.
- `media_assets`, `post_media`, `facs-media` Storage 검증은 이번 핵심 RLS 테스트와 분리한다. 업로드 Edge Function과 signed URL이 준비되기 전에는 브라우저 업로드를 검증하지 않는다.
- OAuth Google/Kakao 자격증명 입력, SMTP, 운영 환경변수, 결제·Pro 전환은 이 절차에 포함하지 않는다.

## 5. 승인 게이트

1. **테스트 프로젝트 생성**: 사용자가 새 무료 프로젝트 이름과 보존 기간을 승인해야 한다.
2. **SQL 적용**: 테스트 프로젝트임을 확인한 뒤 사용자가 실행을 승인해야 한다.
3. **검증 트랙 선택**: Core-only인지 Full-migration인지 사용자가 선택하고, Full-migration을 선택하면 최신 migration까지 실행할 것을 승인해야 한다.
4. **팔로우 공개범위**: Full-migration 시나리오 증적을 확인한 뒤 운영 반영을 별도 승인한다.
5. **Storage/Edge Function**: 업로드 정책과 signed URL 설계가 승인된 뒤 별도 검증한다.
6. **운영 반영**: 테스트 증적, 롤백 담당자, migration 버전을 PM이 확인하고 별도 승인한다.

공식 참고: [Supabase 무료 플랜·프로젝트 한도](https://supabase.com/docs/guides/platform/billing-on-supabase), [무료 프로젝트 일시정지](https://supabase.com/docs/guides/platform/free-project-pausing), [RLS 운영 체크리스트](https://supabase.com/docs/guides/deployment/going-into-prod).
