# 🚢 조선소 도장 품질관리 시스템 (Coating QM)

조선소에서 선주 없이도 객관적 데이터로 도장 품질을 관리하는 웹앱.

## 🛠️ 기술 스택

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS v4
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel

## 📁 폴더 구조

```
coating-qm/
├── src/
│   ├── app/
│   │   ├── admin/master/     # 관리자: 마스터 데이터 입력
│   │   ├── maker/            # 도료사: 검사 입력
│   │   │   └── new/          # 7-Step 마법사
│   │   ├── qm/               # QM: 검토
│   │   ├── owner/            # 선주: 조회
│   │   ├── signup/           # 최초 등록
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── supabase/         # Supabase 클라이언트
│   │   └── actions/          # Server Actions
│   └── types/
└── supabase/
    └── schema.sql            # DB 스키마
```

## 🚀 로컬 설치

### 1) 의존성 설치

```bash
npm install
```

### 2) Supabase 설정

1. https://supabase.com 에서 새 프로젝트 생성 (Region: Northeast Asia)
2. `Settings > API`에서 URL과 키 복사
3. `.env.local.example`을 `.env.local`로 복사:
   ```bash
   cp .env.local.example .env.local
   ```
4. 복사한 키를 `.env.local`에 입력

### 3) DB 스키마 생성

Supabase 대시보드의 **SQL Editor**에서 `supabase/schema.sql` 내용 전체를 실행.

### 4) 개발 서버 실행

```bash
npm run dev
```

→ http://localhost:3000 접속

## 🌐 Vercel 배포

### 1) GitHub에 푸시

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/coating-qm.git
git push -u origin main
```

### 2) Vercel에 import

1. https://vercel.com/new 접속
2. GitHub 저장소 선택
3. **환경변수 입력 (중요!)**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
4. Deploy 클릭

→ 약 2분 후 배포 완료

## 📱 사용 방법

### 1) 최초 등록 (`/signup`)
- 역할 선택: 도료사 / QM / 선주
- 도료사면 메이커 선택 (KCC / IPK / Jotun / CMP / 노로코트 / 정석케미컬)
- 이름 입력 → 시작하기

### 2) 관리자: 마스터 데이터 입력 (`/admin/master`)
- Excel에서 복사한 데이터 Ctrl+V 붙여넣기
- 21개 컬럼 (프로젝트, 호선, BLOCK, 부위명, 도료, DFT 등)
- "데모" 버튼으로 샘플 데이터 로드

### 3) 도료사: 검사 입력 (`/maker/new`)
- 7-Step 마법사
- Step 1: 블록·회차 선택
- Step 2: 구역 선택 (본인 메이커 도료만)
- Step 3: 환경 측정 (자동 이슬점 계산)
- Step 4: Batch No.
- Step 5: 측정 (1ST=Salt/Dust/Profile, 2ND~=DFT)
- Step 7: 저장

## 🗂️ DB 구조

15개 테이블, 마스터/트랜잭션 분리 정규화:

**마스터** (변경 적음):
- projects, ships, vendors, blocks, zones
- paint_makers, coating_specs, users

**트랜잭션** (실측 데이터):
- inspection_sessions, session_zones
- env_measurements, batch_records
- surface_measurements, dft_measurements, photos

## 📝 추후 추가 예정

- [ ] QM 대시보드 (미입력 알림, 협력사 관리)
- [ ] 선주 뷰 (객관 데이터만 공개)
- [ ] CTF 자동 생성 (PDF)
- [ ] Elcometer BT 연동
- [ ] Batch OCR
- [ ] 사진 첨부 (Supabase Storage)
- [ ] 관리자 로그인 화면
- [ ] Row Level Security 재활성화

## 📞 문의

이슈는 GitHub Issues에 등록해주세요.
