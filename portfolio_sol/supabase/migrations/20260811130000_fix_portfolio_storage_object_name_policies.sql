drop policy if exists "Portfolio admins can upload objects" on storage.objects;
drop policy if exists "Portfolio admins can update objects" on storage.objects;
drop policy if exists "Portfolio admins can delete objects" on storage.objects;

create policy "Portfolio admins can upload objects"
on storage.objects for insert to authenticated
with check (
  storage.objects.bucket_id = 'portfolio-media'
  and (select private.is_portfolio_admin())
  and exists (
    select 1
    from public.portfolio_clients as client
    where client.storage_prefix =
      (storage.foldername(storage.objects.name))[1]
  )
);

create policy "Portfolio admins can update objects"
on storage.objects for update to authenticated
using (
  storage.objects.bucket_id = 'portfolio-media'
  and (select private.is_portfolio_admin())
  and exists (
    select 1
    from public.portfolio_clients as client
    where client.storage_prefix =
      (storage.foldername(storage.objects.name))[1]
  )
)
with check (
  storage.objects.bucket_id = 'portfolio-media'
  and (select private.is_portfolio_admin())
  and exists (
    select 1
    from public.portfolio_clients as client
    where client.storage_prefix =
      (storage.foldername(storage.objects.name))[1]
  )
);

create policy "Portfolio admins can delete objects"
on storage.objects for delete to authenticated
using (
  storage.objects.bucket_id = 'portfolio-media'
  and (select private.is_portfolio_admin())
  and exists (
    select 1
    from public.portfolio_clients as client
    where client.storage_prefix =
      (storage.foldername(storage.objects.name))[1]
  )
);
