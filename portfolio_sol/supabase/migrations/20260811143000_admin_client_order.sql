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

  update public.portfolio_clients
  set sort_order = sort_order + safe_shift;

  update public.portfolio_clients as client
  set sort_order = requested.position - 1
  from unnest(p_client_ids) with ordinality as requested(client_id, position)
  where client.id = requested.client_id;
end;
$$;

revoke all on function public.admin_reorder_portfolio_clients(uuid[])
from public, anon, authenticated;
grant execute on function public.admin_reorder_portfolio_clients(uuid[])
to authenticated;

create or replace function public.admin_delete_portfolio_client(
  p_client_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  client_count integer;
  safe_shift integer;
begin
  if not (select private.is_portfolio_admin()) then
    raise exception 'portfolio admin authorization required' using errcode = '42501';
  end if;

  delete from public.portfolio_clients
  where id = p_client_id;

  if not found then
    raise exception 'portfolio client not found';
  end if;

  select
    count(*),
    coalesce(max(sort_order), -1) + count(*) + 1
  into client_count, safe_shift
  from public.portfolio_clients;

  if client_count = 0 then
    return;
  end if;

  update public.portfolio_clients
  set sort_order = sort_order + safe_shift;

  with consecutive_order as (
    select
      id,
      row_number() over (order by sort_order, id) - 1 as position
    from public.portfolio_clients
  )
  update public.portfolio_clients as client
  set sort_order = consecutive_order.position
  from consecutive_order
  where client.id = consecutive_order.id;
end;
$$;

revoke all on function public.admin_delete_portfolio_client(uuid)
from public, anon, authenticated;
grant execute on function public.admin_delete_portfolio_client(uuid)
to authenticated;
