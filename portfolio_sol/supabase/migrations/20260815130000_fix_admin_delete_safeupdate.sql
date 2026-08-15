create or replace function public.admin_delete_portfolio_client(
  p_client_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_sort_order integer;
  later_client_ids uuid[];
  safe_shift integer;
begin
  if not (select private.is_portfolio_admin()) then
    raise exception 'portfolio admin authorization required' using errcode = '42501';
  end if;

  select client.sort_order
  into deleted_sort_order
  from public.portfolio_clients as client
  where client.id = p_client_id;

  if not found then
    raise exception 'portfolio client not found';
  end if;

  delete from public.portfolio_clients
  where id = p_client_id;

  select
    array_agg(client.id order by client.sort_order, client.id),
    coalesce(max(client.sort_order), -1) + count(*) + 1
  into later_client_ids, safe_shift
  from public.portfolio_clients as client
  where client.sort_order > deleted_sort_order;

  if later_client_ids is null then
    return;
  end if;

  update public.portfolio_clients as client
  set sort_order = client.sort_order + safe_shift
  where client.id = any(later_client_ids);

  update public.portfolio_clients as client
  set sort_order = (deleted_sort_order + requested.position - 1)::integer
  from unnest(later_client_ids) with ordinality as requested(client_id, position)
  where client.id = requested.client_id;
end;
$$;

revoke all on function public.admin_delete_portfolio_client(uuid)
from public, anon, authenticated;
grant execute on function public.admin_delete_portfolio_client(uuid)
to authenticated;
