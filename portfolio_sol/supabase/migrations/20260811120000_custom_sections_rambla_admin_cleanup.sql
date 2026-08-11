alter table public.portfolio_sections
  drop constraint if exists portfolio_sections_section_type_check;
alter table public.portfolio_sections
  add constraint portfolio_sections_section_type_check check (
    section_type in (
      'storySequence', 'postGrid', 'carouselPairs',
      'videoStack', 'catalogPair', 'mediaRows', 'customMedia'
    )
  );

alter table public.portfolio_media_items
  drop constraint if exists portfolio_media_items_media_kind_check;
alter table public.portfolio_media_items
  add constraint portfolio_media_items_media_kind_check check (
    media_kind in (
      'story', 'post', 'carouselSlide', 'video', 'catalogPage', 'image'
    )
  );

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.portfolio_site_content'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%profile%'
  loop
    execute format(
      'alter table public.portfolio_site_content drop constraint %I',
      constraint_name
    );
  end loop;
end;
$$;

update public.portfolio_site_content
set content = content - 'profile'
where content_key = 'about';

alter table public.portfolio_site_content
  add constraint portfolio_site_content_about_shape_check check (
    content_key <> 'about'
    or (
      jsonb_typeof(content -> 'graphicDesign') = 'array'
      and jsonb_typeof(content -> 'videoEditing') = 'array'
      and jsonb_typeof(content -> 'keySkills') = 'array'
      and jsonb_typeof(content -> 'technicalSkills') = 'array'
      and jsonb_typeof(content -> 'languages') = 'array'
    )
  );

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
      p_client_id, null, section_payload ->> 'section_type',
      section_payload ->> 'title', section_order,
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
        section_id, null, item_payload ->> 'media_kind',
        item_payload ->> 'storage_path', item_payload ->> 'title',
        coalesce(item_payload ->> 'alt_text', ''), item_payload ->> 'mime_type',
        (item_payload ->> 'width')::integer, (item_payload ->> 'height')::integer,
        item_order, (item_payload ->> 'audio_enabled')::boolean,
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
          null, group_id, item_payload ->> 'media_kind',
          item_payload ->> 'storage_path', item_payload ->> 'title',
          coalesce(item_payload ->> 'alt_text', ''), item_payload ->> 'mime_type',
          (item_payload ->> 'width')::integer, (item_payload ->> 'height')::integer,
          item_order, (item_payload ->> 'audio_enabled')::boolean,
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
      p_client_id, edition_payload ->> 'edition_key', edition_payload ->> 'label',
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
        p_client_id, edition_id, section_payload ->> 'section_type',
        section_payload ->> 'title', section_order,
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

alter table public.portfolio_clients drop column summary;

do $$
declare
  rambla_id uuid;
  brand_section_id uuid;
begin
  select id into rambla_id
  from public.portfolio_clients
  where slug = 'rambla';

  if rambla_id is not null then
    update public.portfolio_sections
    set sort_order = sort_order + 1000
    where client_id = rambla_id and edition_id is null;

    update public.portfolio_sections
    set sort_order = sort_order - 999
    where client_id = rambla_id and edition_id is null;

    insert into public.portfolio_sections (
      client_id, edition_id, section_type, title, sort_order, config
    ) values (
      rambla_id, null, 'customMedia', 'CreaciÃ³n de marca', 0,
      '{"presentation":"responsiveBanner"}'::jsonb
    ) returning id into brand_section_id;

    insert into public.portfolio_media_items (
      section_id, group_id, media_kind, storage_path, title, alt_text,
      mime_type, width, height, sort_order, audio_enabled, config
    ) values
      (
        brand_section_id, null, 'image',
        'rambla/banners/banner_horizontal.jpeg', 'Banner horizontal de Rambla',
        'PresentaciÃ³n horizontal de la identidad de marca de Rambla.',
        'image/jpeg', 1920, 700, 0, null,
        '{"presentation":"raw","viewport":"desktop"}'::jsonb
      ),
      (
        brand_section_id, null, 'image',
        'rambla/banners/banner_vertical.png', 'Banner vertical de Rambla',
        'PresentaciÃ³n vertical de la identidad de marca de Rambla.',
        'image/png', 1122, 1402, 1, null,
        '{"presentation":"raw","viewport":"mobile"}'::jsonb
      );
  end if;
end;
$$;
