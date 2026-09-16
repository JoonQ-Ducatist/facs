# 테스트 Supabase migration 실행 runbook

이 문서는 `facs-rls-test`처럼 운영과 분리된 Supabase 프로젝트에 저장소의 migration을 적용하기 위한 절차다. 운영 프로젝트에는 사용하지 않는다. `service_role`, DB 비밀번호, OAuth secret은 필요하지 않으며 요청·기록하지 않는다.

## 1. 어떤 세트를 실행할지

### Core-only: 핵심 RLS만 확인

아래 파일 하나만 실행한다.

| 순서 | 파일 | 크기 |
| --- | --- | ---: |
| 1 | `202609050001_core_mvp.sql` | 16,002 bytes |

이 세트로 profiles, posts, private details, media metadata, votes, scraps, 기본 aggregate RPC와 핵심 RLS를 확인할 수 있다. `post_visibility = 'followers'` enum 값은 생성되지만 follows 관계와 팔로워 판별 정책은 없으므로 followers 공개범위는 검증하지 않는다.

### Full: 현재 저장소 전체 검증

아래 21개 파일을 파일명 순서대로 모두 실행한다. 각 파일을 별도 query로 붙여넣고 실행하는 방식이 실패 지점을 가장 쉽게 찾을 수 있다.

| 순서 | 파일 | 크기 |
| ---: | --- | ---: |
| 1 | `202609050001_core_mvp.sql` | 16,002 |
| 2 | `202609100001_live_reaction_events.sql` | 4,130 |
| 3 | `202609100002_media_uploads.sql` | 9,199 |
| 4 | `202609100003_public_media_reads.sql` | 666 |
| 5 | `202609100004_scraps.sql` | 1,325 |
| 6 | `202609100005_allow_self_votes.sql` | 1,052 |
| 7 | `202609100006_allow_pending_upload_links.sql` | 1,670 |
| 8 | `202609100007_public_handle_update.sql` | 1,595 |
| 9 | `202609110001_align_media_limit.sql` | 5,066 |
| 10 | `202609110002_feed_aggregates.sql` | 1,900 |
| 11 | `202609110003_my_vote_state.sql` | 986 |
| 12 | `202609110004_safety_reports_and_blocks.sql` | 10,471 |
| 13 | `202609110005_follows_and_personalized_feed.sql` | 10,348 |
| 14 | `202609110006_block_relationship_cleanup.sql` | 1,757 |
| 15 | `202609110007_feed_priority_recency.sql` | 2,014 |
| 16 | `202609120001_upload_visibility_control.sql` | 1,624 |
| 17 | `202609120002_disallow_author_votes.sql` | 1,738 |
| 18 | `202609120003_author_post_deletion.sql` | 76 |
| 19 | `202609120004_soft_hide_author_posts.sql` | 2,053 |
| 20 | `202609130001_allow_supported_mobile_image_types.sql` | 398 |
| 21 | `202609140001_profile_read_grant.sql` | 1,262 |
| 22 | `202609150001_post_boosts.sql` | 7,831 |

표의 실제 파일 수는 22개이며, 저장소의 전체 SQL 용량은 약 83,163 bytes다. 실행 전 `ls -1 supabase/migrations` 결과와 표가 일치하는지 확인한다.

## 2. SQL Editor에서 실행하는 최소 단계

1. Supabase Dashboard에서 `facs-rls-test` 프로젝트의 **SQL Editor**를 연다.
2. 운영 프로젝트가 아닌지 프로젝트 이름과 Project ID를 확인한다.
3. 위 표의 파일을 로컬에서 열고, 한 파일 전체를 SQL Editor의 새 query에 붙여넣는다.
4. **Run**을 누르고 성공 메시지를 확인한 뒤 다음 파일로 이동한다.
5. 실패하면 다음 파일로 넘어가지 않는다. 실패한 파일명과 오류 문구를 기록하고, 부분 적용 상태에서 무작정 재실행하지 않는다. 재시도는 새 테스트 프로젝트에서 처음부터 실행하는 것이 안전하다.
6. Full 세트는 1번부터 22번까지 순서대로 실행한다. 파일명 순서를 바꾸면 함수·테이블 의존성 때문에 실패할 수 있다.

현재 Supabase SQL Editor에는 로컬 `.sql` 파일을 직접 import하는 버튼이 없으므로, 기본 방법은 파일별 분할 붙여넣기다. SQL Editor 입력 한도를 넘는 경우에도 파일 하나를 여러 조각으로 붙여넣되, **Run은 파일 전체가 들어온 뒤 한 번만** 실행한다.

## 3. 단계별 성공 확인 쿼리

### Core-only 완료 확인

```sql
select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.posts') as posts,
  to_regclass('public.post_private_details') as post_private_details,
  to_regclass('public.votes') as votes,
  to_regclass('public.scraps') as scraps;

select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('profiles', 'posts', 'post_private_details', 'votes', 'scraps')
order by relname;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('get_post_aggregate', 'create_profile_for_new_user')
order by routine_name;
```

기대 결과: 각 테이블이 존재하고 `relrowsecurity`가 `true`이며 두 함수가 조회된다.

### Full 완료 확인

```sql
select
  to_regclass('public.follows') as follows,
  to_regclass('public.blocks') as blocks,
  to_regclass('public.reports') as reports,
  to_regclass('public.post_live_reaction_events') as live_reactions;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'get_personalized_feed_post_ids',
    'get_published_post_aggregates',
    'get_my_voted_post_ids',
    'create_post_upload_with_visibility',
    'hide_my_post'
  )
order by routine_name;

select schemaname, tablename, policyname
from pg_policies
where schemaname in ('public', 'storage')
  and tablename in ('follows', 'posts', 'post_media', 'media_assets', 'blocks', 'reports', 'objects')
order by schemaname, tablename, policyname;
```

기대 결과: follows·blocks·reports·live reaction 테이블과 개인화 피드·업로드·숨김 RPC가 존재하고, 관련 RLS 정책이 조회된다.

### Boost 완료 확인

```sql
select to_regclass('public.post_boosts') as post_boosts;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('get_my_boost_candidates', 'request_post_boost', 'get_personalized_feed_post_ids')
order by routine_name;

select policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'post_boosts';
```

기대 결과: `post_boosts`와 세 RPC가 존재하고, Boost 행은 요청자 본인만 읽을 수 있다. 후보 RPC는 DB 시계 기준 게시 후 1시간 이내·다른 사용자 평가 0건·기존 Boost 없음인 본인 게시물만 반환한다. 피드 RPC는 활성 Boost를 `boosted` source로 우선 반환하되 업로더 자신에게는 Boost 우선순위를 적용하지 않는다.

## 4. 적용 후 브라우저 RLS 검증 순서

1. 테스트용 이메일 두 개로 A/B 계정을 만들고 서로 다른 브라우저 프로필에서 로그인한다.
2. Core-only면 `staging-rls-verification.md`의 AUTH, POST-01~03, VOTE, RESULT, SCRAP, PRIVATE 시나리오를 실행한다.
3. Full이면 Core 시나리오에 POST-04와 FOLLOW-01~04, FEED-01~03을 추가한다.
4. 각 결과에 `core-only` 또는 `full-migration`, 실행 파일의 마지막 순서, 실패 SQL과 오류 문구를 기록한다.
5. 테스트가 끝나면 테스트 사용자와 게시물을 삭제하거나 테스트 프로젝트 자체를 폐기한다. 운영 프로젝트와 운영 사용자 데이터는 건드리지 않는다.

## 5. 승인 게이트

- 테스트 프로젝트가 운영과 분리됐는지 확인
- Core-only 또는 Full 트랙 선택
- SQL Editor에서 각 파일 실행 승인
- 성공 확인 쿼리 결과와 RLS 시나리오 결과 확인
- 운영 프로젝트에 migration을 적용할지 별도 승인
