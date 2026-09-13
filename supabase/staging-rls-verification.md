# 격리된 무료 Supabase 권한 검증

이 문서는 운영 프로젝트를 건드리지 않고, 별도의 무료 Supabase 프로젝트에서 인증·RLS·공개범위·스크랩 권한을 확인하기 위한 실행 순서다. 테스트 프로젝트의 URL과 키는 운영 Vercel 변수에 넣지 않는다.

## 1. 테스트 프로젝트 준비

사용자가 직접 해야 하는 작업:

1. Supabase Dashboard에서 새 조직 또는 기존 무료 조직의 **새 프로젝트**를 만든다. 프로젝트 이름에는 `facs-rls-test`처럼 운영과 분리된 이름을 사용한다.
2. 결제수단 등록이나 Pro 전환을 선택하지 않는다. 현재 무료 플랜은 활성 프로젝트를 최대 2개까지 제공하지만, 7일 비활성 시 자동 일시정지될 수 있다.
3. SQL Editor에서 검토한 `202609050001_core_mvp.sql`을 실행한다. 운영 프로젝트의 SQL Editor에서는 실행하지 않는다.
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
| POST-04 | 공개 게시물을 followers로 변경 | 현재 마이그레이션에는 follow 관계 테이블·정책이 없으므로 팔로워 전용 접근을 승인된 기능으로 간주하면 안 된다. 이 항목은 **차단/추가 마이그레이션 필요**다. |
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

## 4. 현재 범위와 보류

- 현재 마이그레이션에는 `post_visibility = followers` enum 값은 있지만 `follows`/`followers` 관계 테이블과 정책은 없다. 따라서 팔로우 기반 공개범위는 아직 검증 가능한 기능이 아니며, 별도 설계·마이그레이션·승인이 필요하다.
- `media_assets`, `post_media`, `facs-media` Storage 검증은 이번 핵심 RLS 테스트와 분리한다. 업로드 Edge Function과 signed URL이 준비되기 전에는 브라우저 업로드를 검증하지 않는다.
- OAuth Google/Kakao 자격증명 입력, SMTP, 운영 환경변수, 결제·Pro 전환은 이 절차에 포함하지 않는다.

## 5. 승인 게이트

1. **테스트 프로젝트 생성**: 사용자가 새 무료 프로젝트 이름과 보존 기간을 승인해야 한다.
2. **SQL 적용**: 테스트 프로젝트임을 확인한 뒤 사용자가 실행을 승인해야 한다.
3. **팔로우 공개범위**: 관계 테이블·정책 설계가 확정된 뒤 별도 승인이 필요하다.
4. **Storage/Edge Function**: 업로드 정책과 signed URL 설계가 승인된 뒤 별도 검증한다.
5. **운영 반영**: 테스트 증적, 롤백 담당자, migration 버전을 PM이 확인하고 별도 승인한다.

공식 참고: [Supabase 무료 플랜·프로젝트 한도](https://supabase.com/docs/guides/platform/billing-on-supabase), [무료 프로젝트 일시정지](https://supabase.com/docs/guides/platform/free-project-pausing), [RLS 운영 체크리스트](https://supabase.com/docs/guides/deployment/going-into-prod).
