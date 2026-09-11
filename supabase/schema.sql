-- 人生账本 · 云同步所需的表与权限
-- 在 Supabase 控制台的 SQL Editor 里整段粘贴执行一次即可，重复执行也安全。
--
-- 设计：所有记录放在一张表里，用 store 区分是哪一类数据，data 存整条记录的 JSON。
-- 这样应用里已有的数据模型不用改，加字段也不用改表结构。

-- ---------------------------------------------------------------- 数据表

create table if not exists public.ll_items (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  store      text        not null,
  id         text        not null,
  data       jsonb,
  updated_at timestamptz not null default now(),
  deleted    boolean     not null default false,
  primary key (user_id, store, id)
);

comment on table public.ll_items is '人生账本同步表：store + id 唯一，data 为整条记录';

create index if not exists ll_items_user_updated_idx
  on public.ll_items (user_id, updated_at desc);

-- ---------------------------------------------------------------- 行级权限
-- 每个账号只能看到、只能写入自己的数据。

alter table public.ll_items enable row level security;

drop policy if exists "ll_items_select_own" on public.ll_items;
create policy "ll_items_select_own" on public.ll_items
  for select using (auth.uid() = user_id);

drop policy if exists "ll_items_insert_own" on public.ll_items;
create policy "ll_items_insert_own" on public.ll_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "ll_items_update_own" on public.ll_items;
create policy "ll_items_update_own" on public.ll_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ll_items_delete_own" on public.ll_items;
create policy "ll_items_delete_own" on public.ll_items
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------- 照片存储

insert into storage.buckets (id, name, public)
values ('ll-photos', 'll-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "ll_photos_select_own" on storage.objects;
create policy "ll_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'll-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "ll_photos_insert_own" on storage.objects;
create policy "ll_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'll-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "ll_photos_update_own" on storage.objects;
create policy "ll_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'll-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "ll_photos_delete_own" on storage.objects;
create policy "ll_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'll-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 完成。回到应用：Me → 云同步，填入 Project URL 和 anon key，注册一个邮箱账号即可。
