create or replace function public.admin_replace_portfolio_client(
  p_client_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  client_payload jsonb := p_payload -> 'client';
  edition_payload jsonb;
  section_payload jsonb;
  group_payload jsonb;
  item_payload jsonb;
  edition_id uuid;
  section_id uuid;
  group_id uuid;
  section_order integer;
  group_order integer;
  item_order integer;
begin
  if not (select private.is_portfolio_admin())
    and coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'portfolio admin authorization required' using errcode = '42501';
  end if;

  update public.portfolio_clients
  set
    slug = client_payload ->> 'slug',
    storage_prefix = client_payload ->> 'storage_prefix',
    name = client_payload ->> 'name',
    year = client_payload ->> 'year',
    disciplines = array(select jsonb_array_elements_text(client_payload -> 'disciplines')),
    summary = nullif(client_payload ->> 'summary', ''),
    logo_path = client_payload ->> 'logo_path',
    sort_order = coalesce((client_payload ->> 'sort_order')::integer, sort_order),
    published = coalesce((client_payload ->> 'published')::boolean, false),
    coming_soon = coalesce((client_payload ->> 'coming_soon')::boolean, false),
    config = coalesce(client_payload -> 'config', '{}'::jsonb)
  where id = p_client_id;

  if not found then
    raise exception 'portfolio client not found';
  end if;

  delete from public.portfolio_editions where client_id = p_client_id;
  delete from public.portfolio_sections where client_id = p_client_id;

  section_order := 0;
  for section_payload in
    select value from jsonb_array_elements(coalesce(p_payload -> 'sections', '[]'::jsonb))
  loop
    insert into public.portfolio_sections (
      client_id, edition_id, section_type, title, sort_order, config
    ) values (
      p_client_id,
      null,
      section_payload ->> 'section_type',
      section_payload ->> 'title',
      section_order,
      coalesce(section_payload -> 'config', '{}'::jsonb)
    ) returning id into section_id;

    item_order := 0;
    for item_payload in
      select value from jsonb_array_elements(coalesce(section_payload -> 'items', '[]'::jsonb))
    loop
      insert into public.portfolio_media_items (
        section_id, group_id, media_kind, storage_path, title, alt_text,
        mime_type, width, height, sort_order, audio_enabled, config
      ) values (
        section_id,
        null,
        item_payload ->> 'media_kind',
        item_payload ->> 'storage_path',
        item_payload ->> 'title',
        coalesce(item_payload ->> 'alt_text', ''),
        item_payload ->> 'mime_type',
        (item_payload ->> 'width')::integer,
        (item_payload ->> 'height')::integer,
        item_order,
        (item_payload ->> 'audio_enabled')::boolean,
        coalesce(item_payload -> 'config', '{}'::jsonb)
      );
      item_order := item_order + 1;
    end loop;

    group_order := 0;
    for group_payload in
      select value from jsonb_array_elements(coalesce(section_payload -> 'groups', '[]'::jsonb))
    loop
      insert into public.portfolio_media_groups (
        section_id, group_kind, label, sort_order, config
      ) values (
        section_id,
        group_payload ->> 'group_kind',
        group_payload ->> 'label',
        group_order,
        coalesce(group_payload -> 'config', '{}'::jsonb)
      ) returning id into group_id;

      item_order := 0;
      for item_payload in
        select value from jsonb_array_elements(coalesce(group_payload -> 'items', '[]'::jsonb))
      loop
        insert into public.portfolio_media_items (
          section_id, group_id, media_kind, storage_path, title, alt_text,
          mime_type, width, height, sort_order, audio_enabled, config
        ) values (
          null,
          group_id,
          item_payload ->> 'media_kind',
          item_payload ->> 'storage_path',
          item_payload ->> 'title',
          coalesce(item_payload ->> 'alt_text', ''),
          item_payload ->> 'mime_type',
          (item_payload ->> 'width')::integer,
          (item_payload ->> 'height')::integer,
          item_order,
          (item_payload ->> 'audio_enabled')::boolean,
          coalesce(item_payload -> 'config', '{}'::jsonb)
        );
        item_order := item_order + 1;
      end loop;
      group_order := group_order + 1;
    end loop;
    section_order := section_order + 1;
  end loop;

  for edition_payload in
    select value from jsonb_array_elements(coalesce(p_payload -> 'editions', '[]'::jsonb))
  loop
    insert into public.portfolio_editions (
      client_id, edition_key, label, sort_order, coming_soon, config
    ) values (
      p_client_id,
      edition_payload ->> 'edition_key',
      edition_payload ->> 'label',
      coalesce((edition_payload ->> 'sort_order')::integer, 0),
      coalesce((edition_payload ->> 'coming_soon')::boolean, false),
      coalesce(edition_payload -> 'config', '{}'::jsonb)
    ) returning id into edition_id;

    section_order := 0;
    for section_payload in
      select value from jsonb_array_elements(coalesce(edition_payload -> 'sections', '[]'::jsonb))
    loop
      insert into public.portfolio_sections (
        client_id, edition_id, section_type, title, sort_order, config
      ) values (
        p_client_id,
        edition_id,
        section_payload ->> 'section_type',
        section_payload ->> 'title',
        section_order,
        coalesce(section_payload -> 'config', '{}'::jsonb)
      ) returning id into section_id;

      item_order := 0;
      for item_payload in
        select value from jsonb_array_elements(coalesce(section_payload -> 'items', '[]'::jsonb))
      loop
        insert into public.portfolio_media_items (
          section_id, group_id, media_kind, storage_path, title, alt_text,
          mime_type, width, height, sort_order, audio_enabled, config
        ) values (
          section_id, null, item_payload ->> 'media_kind', item_payload ->> 'storage_path',
          item_payload ->> 'title', coalesce(item_payload ->> 'alt_text', ''),
          item_payload ->> 'mime_type', (item_payload ->> 'width')::integer,
          (item_payload ->> 'height')::integer, item_order,
          (item_payload ->> 'audio_enabled')::boolean,
          coalesce(item_payload -> 'config', '{}'::jsonb)
        );
        item_order := item_order + 1;
      end loop;

      group_order := 0;
      for group_payload in
        select value from jsonb_array_elements(coalesce(section_payload -> 'groups', '[]'::jsonb))
      loop
        insert into public.portfolio_media_groups (
          section_id, group_kind, label, sort_order, config
        ) values (
          section_id, group_payload ->> 'group_kind', group_payload ->> 'label',
          group_order, coalesce(group_payload -> 'config', '{}'::jsonb)
        ) returning id into group_id;

        item_order := 0;
        for item_payload in
          select value from jsonb_array_elements(coalesce(group_payload -> 'items', '[]'::jsonb))
        loop
          insert into public.portfolio_media_items (
            section_id, group_id, media_kind, storage_path, title, alt_text,
            mime_type, width, height, sort_order, audio_enabled, config
          ) values (
            null, group_id, item_payload ->> 'media_kind', item_payload ->> 'storage_path',
            item_payload ->> 'title', coalesce(item_payload ->> 'alt_text', ''),
            item_payload ->> 'mime_type', (item_payload ->> 'width')::integer,
            (item_payload ->> 'height')::integer, item_order,
            (item_payload ->> 'audio_enabled')::boolean,
            coalesce(item_payload -> 'config', '{}'::jsonb)
          );
          item_order := item_order + 1;
        end loop;
        group_order := group_order + 1;
      end loop;
      section_order := section_order + 1;
    end loop;
  end loop;
end;
$$;

revoke all on function public.admin_replace_portfolio_client(uuid, jsonb)
  from public, anon;
grant execute on function public.admin_replace_portfolio_client(uuid, jsonb)
  to authenticated;
grant execute on function public.admin_replace_portfolio_client(uuid, jsonb)
  to service_role;
