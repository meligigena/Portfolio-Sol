begin;

alter table public.portfolio_clients
  alter column logo_path drop not null;

commit;
