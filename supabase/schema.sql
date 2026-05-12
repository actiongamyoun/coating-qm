-- ============================================
-- 조선소 도장 품질관리 시스템 - 초기 스키마
-- Supabase SQL Editor에서 전체 실행
-- ============================================

create extension if not exists "uuid-ossp";

-- ============================================
-- 1. 마스터 테이블
-- ============================================

create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  owner_company text,
  created_at timestamptz default now()
);

create table if not exists ships (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  ship_type text,
  created_at timestamptz default now(),
  unique(project_id, name)
);

create table if not exists vendors (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  vendor_type text check (vendor_type in ('internal','external')),
  created_at timestamptz default now()
);

create table if not exists blocks (
  id uuid primary key default uuid_generate_v4(),
  ship_id uuid references ships(id) on delete cascade,
  code text not null,
  vendor_id uuid references vendors(id),
  created_at timestamptz default now(),
  unique(ship_id, code)
);

create table if not exists zones (
  id uuid primary key default uuid_generate_v4(),
  block_id uuid references blocks(id) on delete cascade,
  ship_id uuid references ships(id) on delete cascade,
  code text,
  name text not null,
  surface_prep text,
  area_total numeric,
  area_pre numeric,
  is_pspc boolean default false,
  stage text check (stage in ('선행','후행')),
  shop text check (shop in ('사내','사외')),
  created_at timestamptz default now()
);

create table if not exists paint_makers (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists coating_specs (
  id uuid primary key default uuid_generate_v4(),
  zone_id uuid references zones(id) on delete cascade,
  ship_id uuid references ships(id) on delete cascade,
  coat_order int not null check (coat_order between 1 and 99),
  coat_label text not null,
  maker_id uuid references paint_makers(id),
  paint_name text not null,
  dft_target numeric,
  wet numeric,
  tsr numeric,
  psr numeric,
  theory_qty numeric,
  actual_qty numeric,
  created_at timestamptz default now(),
  unique(zone_id, coat_order)
);

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  role text not null check (role in ('maker','qm','owner','admin')),
  maker_id uuid references paint_makers(id),
  name text not null,
  device_id text,
  created_at timestamptz default now()
);

-- ============================================
-- 2. 트랜잭션 테이블
-- ============================================

create table if not exists inspection_sessions (
  id uuid primary key default uuid_generate_v4(),
  ship_id uuid references ships(id) on delete cascade,
  block_id uuid references blocks(id) on delete cascade,
  coat_order int not null,
  coat_label text not null,
  recorded_by uuid references users(id),
  inspected_at timestamptz not null,
  visible_to_owner boolean default false,
  visible_values boolean default true,
  visible_photos boolean default false,
  visible_batch boolean default false,
  created_at timestamptz default now()
);

create table if not exists session_zones (
  session_id uuid references inspection_sessions(id) on delete cascade,
  zone_id uuid references zones(id) on delete cascade,
  primary key (session_id, zone_id)
);

create table if not exists env_measurements (
  session_id uuid primary key references inspection_sessions(id) on delete cascade,
  air_temp numeric,
  surface_temp numeric,
  humidity numeric,
  dew_point numeric,
  delta_t numeric,
  recorded_by uuid references users(id),
  created_at timestamptz default now()
);

create table if not exists batch_records (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references inspection_sessions(id) on delete cascade,
  paint_name text not null,
  base_no text,
  hardener_no text,
  recorded_by uuid references users(id),
  created_at timestamptz default now()
);

create table if not exists surface_measurements (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references inspection_sessions(id) on delete cascade,
  zone_id uuid references zones(id),
  salt numeric,
  dust_size int,
  dust_quantity int,
  profile numeric,
  recorded_by uuid references users(id),
  bt_source text,
  created_at timestamptz default now(),
  unique(session_id, zone_id)
);

create table if not exists dft_measurements (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references inspection_sessions(id) on delete cascade,
  zone_id uuid references zones(id),
  avg_value numeric,
  min_value numeric,
  max_value numeric,
  measurement_count int,
  raw_values jsonb,
  bt_source text,
  recorded_by uuid references users(id),
  created_at timestamptz default now(),
  unique(session_id, zone_id)
);

create table if not exists photos (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references inspection_sessions(id) on delete cascade,
  photo_type text check (photo_type in ('env','surface','dft','panorama','batch')),
  file_url text not null,
  taken_at timestamptz,
  uploaded_by uuid references users(id),
  created_at timestamptz default now()
);

-- ============================================
-- 3. 인덱스
-- ============================================
create index if not exists idx_ships_project on ships(project_id);
create index if not exists idx_blocks_ship on blocks(ship_id);
create index if not exists idx_zones_block on zones(block_id);
create index if not exists idx_zones_ship on zones(ship_id);
create index if not exists idx_specs_zone on coating_specs(zone_id);
create index if not exists idx_specs_ship on coating_specs(ship_id);
create index if not exists idx_sessions_ship on inspection_sessions(ship_id);
create index if not exists idx_sessions_block on inspection_sessions(block_id);
create index if not exists idx_sessions_inspected_at on inspection_sessions(inspected_at desc);
create index if not exists idx_dft_session on dft_measurements(session_id);
create index if not exists idx_surface_session on surface_measurements(session_id);

-- ============================================
-- 4. RLS 비활성화 (개발 단계)
-- ※ 운영 배포 시 반드시 재활성화 + 정책 추가 필요
-- ============================================
alter table projects disable row level security;
alter table ships disable row level security;
alter table vendors disable row level security;
alter table blocks disable row level security;
alter table zones disable row level security;
alter table paint_makers disable row level security;
alter table coating_specs disable row level security;
alter table users disable row level security;
alter table inspection_sessions disable row level security;
alter table session_zones disable row level security;
alter table env_measurements disable row level security;
alter table batch_records disable row level security;
alter table surface_measurements disable row level security;
alter table dft_measurements disable row level security;
alter table photos disable row level security;
