begin;

create or replace function public.admin_sync_portfolio_client(
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
  target_edition_id uuid;
  target_section_id uuid;
  target_group_id uuid;
  target_item_id uuid;
  kept_section_ids uuid[];
  kept_group_ids uuid[];
  kept_item_ids uuid[];
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
    logo_path = client_payload ->> 'logo_path',
    sort_order = coalesce((client_payload ->> 'sort_order')::integer, sort_order),
    published = coalesce((client_payload ->> 'published')::boolean, false),
    coming_soon = coalesce((client_payload ->> 'coming_soon')::boolean, false),
    config = coalesce(client_payload -> 'config', '{}'::jsonb)
  where id = p_client_id;

  if not found then
    raise exception 'portfolio client not found';
  end if;

  for edition_payload in
    select value
    from jsonb_array_elements(coalesce(p_payload -> 'editions', '[]'::jsonb))
  loop
    target_edition_id := null;

    if nullif(edition_payload ->> 'id', '') is not null then
      select edition.id
      into target_edition_id
      from public.portfolio_editions as edition
      where edition.id = (edition_payload ->> 'id')::uuid
        and edition.client_id = p_client_id;

      if target_edition_id is null then
        raise exception 'portfolio edition does not belong to client';
      end if;

      update public.portfolio_editions
      set
        edition_key = edition_payload ->> 'edition_key',
        label = edition_payload ->> 'label',
        sort_order = coalesce((edition_payload ->> 'sort_order')::integer, 0),
        coming_soon = coalesce((edition_payload ->> 'coming_soon')::boolean, false),
        config = coalesce(edition_payload -> 'config', '{}'::jsonb)
      where id = target_edition_id
        and (
          edition_key,
          label,
          sort_order,
          coming_soon,
          config
        ) is distinct from (
          edition_payload ->> 'edition_key',
          edition_payload ->> 'label',
          coalesce((edition_payload ->> 'sort_order')::integer, 0),
          coalesce((edition_payload ->> 'coming_soon')::boolean, false),
          coalesce(edition_payload -> 'config', '{}'::jsonb)
        );
    else
      insert into public.portfolio_editions (
        client_id, edition_key, label, sort_order, coming_soon, config
      ) values (
        p_client_id,
        edition_payload ->> 'edition_key',
        edition_payload ->> 'label',
        coalesce((edition_payload ->> 'sort_order')::integer, 0),
        coalesce((edition_payload ->> 'coming_soon')::boolean, false),
        coalesce(edition_payload -> 'config', '{}'::jsonb)
      ) returning id into target_edition_id;
    end if;

    update public.portfolio_sections
    set sort_order = sort_order + 1000000
    where edition_id = target_edition_id;

    kept_section_ids := array[]::uuid[];
    section_order := 0;
    for section_payload in
      select value
      from jsonb_array_elements(coalesce(edition_payload -> 'sections', '[]'::jsonb))
    loop
      target_section_id := null;
      if nullif(section_payload ->> 'id', '') is not null then
        select section.id
        into target_section_id
        from public.portfolio_sections as section
        where section.id = (section_payload ->> 'id')::uuid
          and section.client_id = p_client_id
          and section.edition_id = target_edition_id;
      end if;

      if target_section_id is null then
        insert into public.portfolio_sections (
          client_id, edition_id, section_type, title, sort_order, config
        ) values (
          p_client_id,
          target_edition_id,
          section_payload ->> 'section_type',
          section_payload ->> 'title',
          section_order,
          coalesce(section_payload -> 'config', '{}'::jsonb)
        ) returning id into target_section_id;
      else
        update public.portfolio_sections
        set
          section_type = section_payload ->> 'section_type',
          title = section_payload ->> 'title',
          sort_order = section_order,
          config = coalesce(section_payload -> 'config', '{}'::jsonb)
        where id = target_section_id;
      end if;
      kept_section_ids := array_append(kept_section_ids, target_section_id);

      update public.portfolio_media_items
      set sort_order = sort_order + 1000000
      where section_id = target_section_id;

      kept_item_ids := array[]::uuid[];
      item_order := 0;
      for item_payload in
        select value
        from jsonb_array_elements(coalesce(section_payload -> 'items', '[]'::jsonb))
      loop
        target_item_id := null;
        if nullif(item_payload ->> 'id', '') is not null then
          select item.id
          into target_item_id
          from public.portfolio_media_items as item
          where item.id = (item_payload ->> 'id')::uuid
            and item.section_id = target_section_id;
        end if;

        if target_item_id is null then
          insert into public.portfolio_media_items (
            section_id, group_id, media_kind, storage_path, title, alt_text,
            mime_type, width, height, sort_order, audio_enabled, config
          ) values (
            target_section_id, null, item_payload ->> 'media_kind',
            item_payload ->> 'storage_path', item_payload ->> 'title',
            coalesce(item_payload ->> 'alt_text', ''), item_payload ->> 'mime_type',
            (item_payload ->> 'width')::integer, (item_payload ->> 'height')::integer,
            item_order, (item_payload ->> 'audio_enabled')::boolean,
            coalesce(item_payload -> 'config', '{}'::jsonb)
          ) returning id into target_item_id;
        else
          update public.portfolio_media_items
          set
            media_kind = item_payload ->> 'media_kind',
            storage_path = item_payload ->> 'storage_path',
            title = item_payload ->> 'title',
            alt_text = coalesce(item_payload ->> 'alt_text', ''),
            mime_type = item_payload ->> 'mime_type',
            width = (item_payload ->> 'width')::integer,
            height = (item_payload ->> 'height')::integer,
            sort_order = item_order,
            audio_enabled = (item_payload ->> 'audio_enabled')::boolean,
            config = coalesce(item_payload -> 'config', '{}'::jsonb)
          where id = target_item_id;
        end if;
        kept_item_ids := array_append(kept_item_ids, target_item_id);
        item_order := item_order + 1;
      end loop;

      delete from public.portfolio_media_items
      where section_id = target_section_id
        and not (id = any(kept_item_ids));

      update public.portfolio_media_groups
      set sort_order = sort_order + 1000000
      where section_id = target_section_id;

      kept_group_ids := array[]::uuid[];
      group_order := 0;
      for group_payload in
        select value
        from jsonb_array_elements(coalesce(section_payload -> 'groups', '[]'::jsonb))
      loop
        target_group_id := null;
        if nullif(group_payload ->> 'id', '') is not null then
          select media_group.id
          into target_group_id
          from public.portfolio_media_groups as media_group
          where media_group.id = (group_payload ->> 'id')::uuid
            and media_group.section_id = target_section_id;
        end if;

        if target_group_id is null then
          insert into public.portfolio_media_groups (
            section_id, group_kind, label, sort_order, config
          ) values (
            target_section_id,
            group_payload ->> 'group_kind',
            group_payload ->> 'label',
            group_order,
            coalesce(group_payload -> 'config', '{}'::jsonb)
          ) returning id into target_group_id;
        else
          update public.portfolio_media_groups
          set
            group_kind = group_payload ->> 'group_kind',
            label = group_payload ->> 'label',
            sort_order = group_order,
            config = coalesce(group_payload -> 'config', '{}'::jsonb)
          where id = target_group_id;
        end if;
        kept_group_ids := array_append(kept_group_ids, target_group_id);

        update public.portfolio_media_items
        set sort_order = sort_order + 1000000
        where group_id = target_group_id;

        kept_item_ids := array[]::uuid[];
        item_order := 0;
        for item_payload in
          select value
          from jsonb_array_elements(coalesce(group_payload -> 'items', '[]'::jsonb))
        loop
          target_item_id := null;
          if nullif(item_payload ->> 'id', '') is not null then
            select item.id
            into target_item_id
            from public.portfolio_media_items as item
            where item.id = (item_payload ->> 'id')::uuid
              and item.group_id = target_group_id;
          end if;

          if target_item_id is null then
            insert into public.portfolio_media_items (
              section_id, group_id, media_kind, storage_path, title, alt_text,
              mime_type, width, height, sort_order, audio_enabled, config
            ) values (
              null, target_group_id, item_payload ->> 'media_kind',
              item_payload ->> 'storage_path', item_payload ->> 'title',
              coalesce(item_payload ->> 'alt_text', ''), item_payload ->> 'mime_type',
              (item_payload ->> 'width')::integer, (item_payload ->> 'height')::integer,
              item_order, (item_payload ->> 'audio_enabled')::boolean,
              coalesce(item_payload -> 'config', '{}'::jsonb)
            ) returning id into target_item_id;
          else
            update public.portfolio_media_items
            set
              media_kind = item_payload ->> 'media_kind',
              storage_path = item_payload ->> 'storage_path',
              title = item_payload ->> 'title',
              alt_text = coalesce(item_payload ->> 'alt_text', ''),
              mime_type = item_payload ->> 'mime_type',
              width = (item_payload ->> 'width')::integer,
              height = (item_payload ->> 'height')::integer,
              sort_order = item_order,
              audio_enabled = (item_payload ->> 'audio_enabled')::boolean,
              config = coalesce(item_payload -> 'config', '{}'::jsonb)
            where id = target_item_id;
          end if;
          kept_item_ids := array_append(kept_item_ids, target_item_id);
          item_order := item_order + 1;
        end loop;

        delete from public.portfolio_media_items
        where group_id = target_group_id
          and not (id = any(kept_item_ids));

        group_order := group_order + 1;
      end loop;

      delete from public.portfolio_media_groups
      where section_id = target_section_id
        and not (id = any(kept_group_ids));

      section_order := section_order + 1;
    end loop;

    delete from public.portfolio_sections
    where edition_id = target_edition_id
      and not (id = any(kept_section_ids));
  end loop;
end;
$$;

revoke all on function public.admin_sync_portfolio_client(uuid, jsonb) from public;
grant execute on function public.admin_sync_portfolio_client(uuid, jsonb) to authenticated;
grant execute on function public.admin_sync_portfolio_client(uuid, jsonb) to service_role;

commit;
