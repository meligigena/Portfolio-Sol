insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'portfolio-media',
  'portfolio-media',
  true,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Portfolio admins can inspect objects" on storage.objects;
drop policy if exists "Portfolio admins can upload objects" on storage.objects;
drop policy if exists "Portfolio admins can update objects" on storage.objects;
drop policy if exists "Portfolio admins can delete objects" on storage.objects;

create policy "Portfolio admins can inspect objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'portfolio-media'
  and (select private.is_portfolio_admin())
);

create policy "Portfolio admins can upload objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'portfolio-media'
  and (select private.is_portfolio_admin())
  and exists (
    select 1 from public.portfolio_clients client
    where client.storage_prefix = (storage.foldername(name))[1]
  )
);

create policy "Portfolio admins can update objects"
on storage.objects for update to authenticated
using (
  bucket_id = 'portfolio-media'
  and (select private.is_portfolio_admin())
  and exists (
    select 1 from public.portfolio_clients client
    where client.storage_prefix = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'portfolio-media'
  and (select private.is_portfolio_admin())
  and exists (
    select 1 from public.portfolio_clients client
    where client.storage_prefix = (storage.foldername(name))[1]
  )
);

create policy "Portfolio admins can delete objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'portfolio-media'
  and (select private.is_portfolio_admin())
  and exists (
    select 1 from public.portfolio_clients client
    where client.storage_prefix = (storage.foldername(name))[1]
  )
);
