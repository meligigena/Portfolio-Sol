create table public.portfolio_site_content (
  content_key text primary key check (
    content_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    content_key <> 'about'
    or (
      jsonb_typeof(content -> 'profile') = 'string'
      and jsonb_typeof(content -> 'graphicDesign') = 'array'
      and jsonb_typeof(content -> 'videoEditing') = 'array'
      and jsonb_typeof(content -> 'keySkills') = 'array'
      and jsonb_typeof(content -> 'technicalSkills') = 'array'
      and jsonb_typeof(content -> 'languages') = 'array'
    )
  )
);

create trigger portfolio_site_content_set_updated_at
before update on public.portfolio_site_content
for each row execute function private.set_updated_at();

alter table public.portfolio_site_content enable row level security;

create policy "Portfolio site content is public"
on public.portfolio_site_content for select to anon, authenticated
using (true);

create policy "Portfolio admins can update site content"
on public.portfolio_site_content for update to authenticated
using ((select private.is_portfolio_admin()))
with check ((select private.is_portfolio_admin()));

revoke all on public.portfolio_site_content from anon, authenticated;
grant select on public.portfolio_site_content to anon, authenticated;
grant update (content) on public.portfolio_site_content to authenticated;

insert into public.portfolio_site_content (content_key, content)
values (
  'about',
  jsonb_build_object(
    'profile', 'PERFIL / EXPERIENCIA',
    'graphicDesign', jsonb_build_array(
      'Desarrollo de piezas visuales para marcas y redes sociales, adaptadas a las necesidades estéticas y comunicacionales de cada cliente.',
      'Conceptualización y diseño con foco en la identidad visual, asegurando coherencia, impacto y profesionalismo en cada entrega.'
    ),
    'videoEditing', jsonb_build_array(
      'Edición creativa y narrativa de contenido audiovisual para plataformas digitales, con especial atención al ritmo, estilo y mensaje.',
      'Adaptación de videos a distintos formatos y objetivos (reels, TikToks, presentaciones, contenido institucional), maximizando el engagement y la calidad visual.'
    ),
    'keySkills', jsonb_build_array(
      'Comunicación visual clara y efectiva',
      'Creatividad y pensamiento conceptual',
      'Capacidad de adaptación a diferentes estilos y marcas',
      'Resolución ágil y proactiva de problemas'
    ),
    'technicalSkills', jsonb_build_array(
      'Canva',
      'CapCut',
      'Adobe Illustrator',
      'Adobe Photoshop',
      'Adobe Premiere Pro',
      'Google Drive'
    ),
    'languages', jsonb_build_array(
      'Inglés C1 — Cambridge University',
      'Portugués conversacional'
    )
  )
);
