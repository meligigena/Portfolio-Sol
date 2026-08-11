begin;

alter table public.portfolio_sections
  drop constraint if exists portfolio_sections_section_type_check;
alter table public.portfolio_sections
  add constraint portfolio_sections_section_type_check check (
    section_type in (
      'storySequence', 'postGrid', 'carouselPairs',
      'videoStack', 'catalogPair', 'mediaRows', 'customMedia', 'banners'
    )
  );

alter table public.portfolio_media_items
  drop constraint if exists portfolio_media_items_media_kind_check;
alter table public.portfolio_media_items
  add constraint portfolio_media_items_media_kind_check check (
    media_kind in (
      'story', 'post', 'carouselSlide', 'video', 'catalogPage', 'image',
      'banner'
    )
  );

do $$
declare
  rambla_id uuid;
  banner_section_id uuid;
begin
  select id
  into rambla_id
  from public.portfolio_clients
  where slug = 'rambla';

  if rambla_id is null then
    raise exception 'Rambla client was not found';
  end if;

  select section.id
  into banner_section_id
  from public.portfolio_sections as section
  where section.client_id = rambla_id
    and section.edition_id is null
    and section.section_type in ('customMedia', 'banners')
    and section.config ->> 'presentation' = 'responsiveBanner'
    and exists (
      select 1
      from public.portfolio_media_items as item
      where item.section_id = section.id
        and item.storage_path = 'rambla/banners/banner_horizontal.jpeg'
    )
    and exists (
      select 1
      from public.portfolio_media_items as item
      where item.section_id = section.id
        and item.storage_path = 'rambla/banners/banner_vertical.png'
    );

  if banner_section_id is null then
    raise exception 'The existing Rambla responsive banner section was not found';
  end if;

  update public.portfolio_sections as section
  set section_type = 'banners'
  where section.id = banner_section_id
    and section.client_id = rambla_id;

  update public.portfolio_media_items as item
  set media_kind = 'banner'
  where item.section_id = banner_section_id
    and item.storage_path in (
      'rambla/banners/banner_horizontal.jpeg',
      'rambla/banners/banner_vertical.png'
    );

  with story_order as (
    select min(section.sort_order) as sort_order
    from public.portfolio_sections as section
    where section.client_id = rambla_id
      and section.edition_id is null
      and section.section_type = 'storySequence'
  ),
  requested_order as (
    select
      section.id,
      row_number() over (
        order by
          case
            when section.id = banner_section_id
              then coalesce((select sort_order from story_order), section.sort_order) - 0.5
            else section.sort_order::numeric
          end,
          section.id
      ) - 1 as sort_order
    from public.portfolio_sections as section
    where section.client_id = rambla_id
      and section.edition_id is null
  )
  update public.portfolio_sections as section
  set sort_order = requested_order.sort_order
  from requested_order
  where section.id = requested_order.id
    and section.client_id = rambla_id;
end;
$$;

commit;
