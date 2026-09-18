-- Apply once using the Supabase SQL editor or `supabase db push`.
-- Private schema is intentionally absent from the Data API exposed schemas.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.photo_jobs (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists photo_jobs_owner_created on private.photo_jobs(owner_id, created_at desc);
create index if not exists photo_jobs_created on private.photo_jobs(created_at);
alter table private.photo_jobs enable row level security;
revoke all on private.photo_jobs from public, anon, authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('photo-designs','photo-designs',false,12582912,array['image/jpeg'])
on conflict (id) do nothing;
-- No client write policies: the authenticated Fastify server validates and
-- normalizes every image before the service-role client writes it.
-- Result downloads go through the same owner-checked server route.

create table if not exists public.photo_designs (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now(),
  document jsonb not null check (octet_length(document::text) <= 262144)
);
alter table public.photo_designs enable row level security;
create policy "Read own photo designs" on public.photo_designs for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Delete own photo designs" on public.photo_designs for delete to authenticated using ((select auth.uid()) = owner_id);
revoke all on public.photo_designs from anon, authenticated;
grant select, delete on public.photo_designs to authenticated;
create index if not exists photo_designs_owner_updated on public.photo_designs(owner_id,updated_at desc);

create or replace function public.save_photo_design(design_id uuid, document jsonb, expected_revision integer)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); changed integer;
begin
  if actor is null then raise exception 'Sign in to save photos'; end if;
  if document->>'id' is distinct from design_id::text or (document->>'revision')::integer is distinct from expected_revision + 1
    or expected_revision < 0 or octet_length(document::text) > 262144
    or jsonb_typeof(document->'results') is distinct from 'array'
    or jsonb_array_length(document->'results') > 30 then raise exception 'Invalid photo design'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  if expected_revision = 0 then
    if (select count(*) from public.photo_designs where owner_id = actor) >= 30 then raise exception 'Photo library limit reached (30 designs)'; end if;
    insert into public.photo_designs(id,owner_id,revision,document) values(design_id,actor,1,document);
  else
    update public.photo_designs set document=save_photo_design.document, revision=expected_revision+1, updated_at=now()
      where id=design_id and owner_id=actor and revision=expected_revision;
    get diagnostics changed = row_count;
    if changed <> 1 then raise exception 'This design changed in another view. Reload before saving.'; end if;
  end if;
end $$;
revoke all on function public.save_photo_design(uuid,jsonb,integer) from public, anon;
grant execute on function public.save_photo_design(uuid,jsonb,integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('photo-library','photo-library',false,12582912,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "Read own library images" on storage.objects for select to authenticated
  using (bucket_id='photo-library' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Upload own library images" on storage.objects for insert to authenticated
  with check (bucket_id='photo-library' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Delete own library images" on storage.objects for delete to authenticated
  using (bucket_id='photo-library' and (storage.foldername(name))[1]=(select auth.uid())::text);
