create or replace function public.admin_reorder_portfolio_clients(
  p_client_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  client_count integer;
  distinct_id_count integer;
  safe_shift integer;
begin
  if not (select private.is_portfolio_admin()) then
    raise exception 'portfolio admin authorization required' using errcode = '42501';
  end if;

  if p_client_ids is null then
    raise exception 'client id list is required';
  end if;

  select count(distinct client_id)
  into distinct_id_count
  from unnest(p_client_ids) as requested(client_id);

  if cardinality(p_client_ids) <> distinct_id_count then
    raise exception 'duplicate client ids are not allowed';
  end if;

  select count(*) into client_count
  from public.portfolio_clients;

  if cardinality(p_client_ids) <> client_count then
    raise exception 'client id list must contain every portfolio client';
  end if;

  if exists (
    select 1
    from unnest(p_client_ids) as requested(client_id)
    where not exists (
      select 1
      from public.portfolio_clients as client
      where client.id = requested.client_id
    )
  ) then
    raise exception 'client id list contains an unknown portfolio client';
  end if;

  select coalesce(max(sort_order), -1) + client_count + 1
  into safe_shift
  from public.portfolio_clients;

  update public.portfolio_clients as client
  set sort_order = client.sort_order + safe_shift
  where client.id = any(p_client_ids);

  update public.portfolio_clients as client
  set sort_order = (requested.position - 1)::integer
  from unnest(p_client_ids) with ordinality as requested(client_id, position)
  where client.id = requested.client_id;
end;
$$;

revoke all on function public.admin_reorder_portfolio_clients(uuid[])
from public, anon, authenticated;
grant execute on function public.admin_reorder_portfolio_clients(uuid[])
to authenticated;
