begin;

alter table public.portfolio_sections
  drop constraint if exists portfolio_sections_section_type_check;
alter table public.portfolio_sections
  add constraint portfolio_sections_section_type_check check (
    section_type in (
      'storySequence', 'videoStory', 'postGrid', 'carouselPairs',
      'videoStack', 'catalogPair', 'mediaRows', 'customMedia', 'banners'
    )
  );

commit;
