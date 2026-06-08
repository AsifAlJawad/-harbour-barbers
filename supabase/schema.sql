-- ── Profiles (extends Supabase auth.users) ──────────────
create table if not exists profiles (
  id              uuid references auth.users primary key,
  full_name       text not null,
  phone           text,
  role            text not null default 'customer', -- customer | staff | owner
  preferred_barber_id uuid,
  loyalty_points  int  not null default 0,
  loyalty_tier    text not null default 'bronze',   -- bronze | silver | gold | platinum
  notify_email    boolean not null default true,
  notify_sms      boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ── Barbers ───────────────────────────────────────────────
create table if not exists barbers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  role       text not null default 'Barber',
  bio        text,
  photo_url  text,
  available  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Services ──────────────────────────────────────────────
create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       int  not null,  -- cents (e.g. 3500 = $35.00)
  duration    int  not null,  -- minutes
  category    text not null default 'haircut', -- haircut | beard | package
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── Appointments ──────────────────────────────────────────
create table if not exists appointments (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references profiles  not null,
  barber_id    uuid references barbers   not null,
  service_id   uuid references services  not null,
  scheduled_at timestamptz not null,
  status       text not null default 'confirmed', -- pending | confirmed | completed | cancelled | no_show
  notes        text,
  created_at   timestamptz not null default now()
);

-- ── Loyalty transactions ──────────────────────────────────
create table if not exists loyalty_transactions (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid references profiles     not null,
  appointment_id uuid references appointments,
  points         int  not null,
  description    text not null,
  created_at     timestamptz not null default now()
);

-- ── Row-level security ────────────────────────────────────
alter table profiles              enable row level security;
alter table appointments          enable row level security;
alter table loyalty_transactions  enable row level security;
alter table barbers               enable row level security;
alter table services              enable row level security;

-- profiles: users manage their own
create policy "users read own profile"   on profiles for select using (auth.uid() = id);
create policy "users update own profile" on profiles for update using (auth.uid() = id);
create policy "users insert own profile" on profiles for insert with check (auth.uid() = id);

-- appointments: customers manage their own; service role bypasses RLS
create policy "customers read own appointments"   on appointments for select using (auth.uid() = customer_id);
create policy "customers insert own appointments" on appointments for insert with check (auth.uid() = customer_id);
create policy "customers cancel own appointments" on appointments for update using (auth.uid() = customer_id);

-- loyalty: customers read their own
create policy "customers read own loyalty" on loyalty_transactions for select using (auth.uid() = customer_id);

-- barbers and services: public read
create policy "barbers public read"  on barbers  for select using (true);
create policy "services public read" on services for select using (active = true);

-- ── RPC: safe loyalty increment (avoids read-modify-write race) ──
create or replace function increment_loyalty(uid uuid, amt int)
returns void language sql security definer as $$
  update profiles
  set
    loyalty_points = loyalty_points + amt,
    loyalty_tier = case
      when loyalty_points + amt >= 1000 then 'platinum'
      when loyalty_points + amt >= 500  then 'gold'
      when loyalty_points + amt >= 200  then 'silver'
      else 'bronze'
    end
  where id = uid;
$$;

-- ── Seed barbers ──────────────────────────────────────────
insert into barbers (name, role, bio) values
  ('Marco', 'Senior Barber', 'Over 15 years crafting precise cuts and classic styles.'),
  ('James', 'Barber',        'Specialises in fades and contemporary cuts.'),
  ('Sofia', 'Barber',        'Expert in textured cuts and beard sculpting.')
on conflict do nothing;

-- ── Seed services ─────────────────────────────────────────
insert into services (name, description, price, duration, category) values
  ('Classic Haircut',  'Scissor or clipper cut, styled to perfection',        3500, 45, 'haircut'),
  ('Skin Fade',        'Zero to gradual fade, blended smooth',                4000, 50, 'haircut'),
  ('Shape Up',         'Edge work and line-up for a clean finish',            3000, 30, 'haircut'),
  ('Kids'' Cut',       'Children 12 and under',                               2500, 30, 'haircut'),
  ('Beard Trim',       'Shape, edge, and condition',                          2500, 20, 'beard'),
  ('Hot Towel Shave',  'Traditional straight razor with hot towel treatment', 5500, 60, 'beard'),
  ('Hair + Beard',     'Full service — cut and beard in one visit',           5500, 65, 'package')
on conflict do nothing;
