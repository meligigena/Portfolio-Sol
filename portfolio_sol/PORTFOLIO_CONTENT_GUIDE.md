# Guía de contenidos del portfolio

> Antes de agregar o modificar un cliente del portfolio, leer este documento y respetar sus convenciones de estructura, orden, componentes y animaciones. No crear una implementación específica para un cliente si existe un componente reutilizable para ese tipo de contenido.

Este archivo es la fuente de verdad para incorporar assets y modelar case studies. `PROJECT_CONTEXT.md` resume el proyecto, pero las reglas de formatos de contenido se mantienen aquí.

## 1. Estructura estándar de assets

La fuente oficial de media de clientes será **Supabase Storage**, bucket público `portfolio-media`. La ruta de objeto conserva la estructura del cliente:

```text
portfolio-media/{cliente}/
├── logo.jpeg
├── stories/
├── posts/
├── carruseles/
│   ├── carrusel A/
│   └── carrusel B/
├── videos/
└── catalogos/
```

Estado vigente al 2026-08-11: los 144 assets modelados están migrados al bucket público `portfolio-media` y verificados por ruta, tamaño, acceso público y HTTP Range para videos. El manifiesto contiene además dos banners de Rambla en staging, aún no modelados en el frontend. Los últimos reemplazos son `maja/videos/copy_23CA139B-41CF-4ED6-8F98-FAC3BB8634F4.mov` (29.869.127 bytes, `video/quicktime`) y `sistemas-moviles/videos/0810(1).mp4` (47.236.003 bytes, `video/mp4`). El frontend usa rutas relativas y `portfolioMediaUrl()` siempre construye una URL de Supabase; no existen fallbacks locales de media modelada. La carpeta de origen `sistemas moviles/` se normaliza en Storage como `sistemas-moviles/`.

- Crear solo las carpetas correspondientes a contenido real.
- Usar siempre las categorías plurales `stories`, `posts`, `carruseles`, `videos` y `catalogos`.
- Un carrusel nunca se guarda dentro de `posts/`; cada subcarpeta de `carruseles/` representa un carrusel independiente.
- Los catálogos usan subcarpetas `catalogo1`, `catalogo2`, etc.
- Respetar nombres y extensiones reales. No renombrar, duplicar ni inventar assets para completar una estructura.
- El nombre visible, el slug y la carpeta de assets pueden diferir cuando los datos declaran la ruta real de forma explícita. Tardeo (`/portfolio/tardeo`) y Rambla (`/portfolio/rambla`) son clientes independientes.

## 2. Modelo de datos

La fuente de verdad definitiva es Supabase Database. `portfolio_clients`, `portfolio_editions`, `portfolio_sections`, `portfolio_media_groups` y `portfolio_media_items` representan metadata, orden, excepciones y rutas de Storage. `src/data/clients.js` se conserva temporalmente como fallback de migración hasta aplicar y verificar el seed remoto; no se debe mantener como segunda fuente de verdad permanente. `ClientPage` decide qué componente renderizar según `type`, nunca según el nombre del cliente.

```js
{
  slug: "cliente",
  name: "Cliente",
  year: "2026",
  disciplines: ["Disciplina"],
  cover: "cliente/logo.jpeg",
  content: [
    { type: "storySequence", items: stories },
    { type: "postGrid", items: posts },
    { type: "carouselPairs", items: carousels },
    { type: "videoStack", items: videos },
    { type: "catalogPair", items: catalogs },
  ],
}
```

- Cada asset debe incluir `id`, `src`, `alt`, `width` y `height` reales. Después de activar Storage, `src` y `cover` guardan rutas relativas de objeto; los componentes las resuelven exclusivamente mediante `portfolioMediaUrl()` de `src/lib/portfolioMedia.js`.
- No hardcodear URLs completas de Supabase ni importar `SUPABASE_SECRET_KEY` desde React.
- No renderizar bloques sin items.
- Para un case study no publicado usar `comingSoon: true`; no crear una página específica.
- Para un nuevo formato, crear primero un bloque y componente reutilizable. No agregar condicionales `client === "..."` para comportamientos comunes.
- El array exportado `clients` contiene sólo clientes publicados o explícitamente aprobados para mostrarse. No incluir clientes pendientes, placeholders, cards vacías ni inferir clientes desde carpetas o assets que no estén modelados en datos.

La lectura pública usa `src/data/portfolioDatabase.js`, transforma las filas relacionales al contrato de bloques existente y filtra `published = true` mediante RLS. El fallback está encapsulado en `PortfolioDataProvider` y debe retirarse cuando los nueve clientes hayan sido verificados visualmente desde Database.

El contenido editorial reutilizable vive en `portfolio_site_content`. La fila `content_key = 'about'` guarda un objeto JSONB con `profile`, `graphicDesign`, `videoEditing`, `keySkills`, `technicalSkills` y `languages`. Database es la única fuente de verdad de esos textos: lectura pública para `anon` y `authenticated`, y actualización sólo para sesiones incluidas en `portfolio_admins`. Storage se reserva para archivos.

## 3. Orden general

El orden definitivo de clientes publicado es:

```text
Rambla → Aqualand → Tardeo → Peumax → Desnac → Sistemas Móviles → Vectus → Maja → El Tori
```

`CLIENT_SLUG_ORDER` en `src/data/clients.js` es la única fuente de ese orden para `MIS TRABAJOS`, `Cliente anterior` y `Cliente siguiente`. Estos nueve clientes son la cartera completa visible; no existen clientes pendientes para renderizar.

La secuencia estándar implementada es:

```text
STORIES
↓
POSTS
↓
CARRUSELES
↓
VIDEOS
↓
CATÁLOGOS
```

Se omiten las categorías sin contenido. La regla obligatoria es **todos los posts antes de cualquier carrusel**: nunca se intercalan `postPair` y carruseles.

`ClientPage` ordena los bloques estándar mediante tipos, aunque los datos deben declararse ya en este orden para conservar legibilidad.

## 4. Posts

Componente general: bloque `postGrid` renderizado por `ClientPage` con `ProjectMedia`.

Desktop:

- Dos posts simultáneos y con el mismo protagonismo.
- El primero entra desde la izquierda y el segundo desde la derecha.
- El par queda centrado como conjunto respecto del viewport.
- El scroll vertical controla la transición.
- Si la cantidad es impar, el último post queda centrado y conserva un tamaño coherente.

Mobile y tablet:

- Los posts se apilan para mantener legibilidad.
- Se conserva una entrada lateral moderada.
- No debe existir overflow horizontal de página ni deformación.

## 5. Stories

Componente único: `src/components/media/StorySequence.jsx`.

- Un solo iPhone usa `public/iphone.png` como marco.
- El teléfono permanece estable y completo dentro del viewport.
- Una story 9:16 es visible por vez dentro de la pantalla enmascarada.
- El scroll vertical desplaza el track horizontalmente de derecha a izquierda.
- La story actual sale por la izquierda y la siguiente entra por la derecha.
- El label `STORY` permanece visible y fuera del track animado.
- Responsive y `prefers-reduced-motion` deben conservar acceso a todas las stories.
- GSAP debe estar scoped con `useGSAP`; limpiar timeline, ScrollTrigger y pin al desmontar o cambiar de ruta.
- El estándar sigue siendo un solo iPhone. Una presentación excepcional sólo puede existir como configuración del bloque y debe documentarse en **Excepciones controladas**; nunca se decide comparando el nombre del cliente.

## 6. Carruseles

Componente único: `src/components/media/CarouselPairs.jsx`. Tipo de bloque: `carouselPairs`.

- Los assets viven en `portfolio-media/{cliente}/carruseles/carrusel X/`.
- Cada item del bloque representa un carrusel y contiene su array de slides.
- El componente agrupa cualquier cantidad de carruseles de a dos.
- En desktop, ambos carruseles del par permanecen visibles lado a lado.
- El scroll vertical avanza los dos tracks simultáneamente.
- Cada slide actual sale hacia la izquierda y el siguiente entra desde la derecha.
- El label `CARRUSEL` queda fuera del track y visible durante toda la secuencia.
- Si las cantidades difieren, el carrusel corto conserva su último slide mientras el largo continúa.
- Cada par tiene su propio pin y secuencia. Un carrusel impar final queda centrado.
- En mobile el par se apila dentro del viewport para mantener legibilidad y sincronización.
- Con reduced motion no hay pin ni scrub; cada track queda accesible con scroll snap horizontal.
- Usar transforms y opacity, dimensiones estables y cleanup de GSAP/ScrollTrigger.

## 7. Videos

Componente principal: `src/components/media/VideoStack.jsx`. Las tiras audiovisuales especiales usan `MediaRows`, pero comparten `SoundToggleButton` y el coordinador exclusivo de sonido.

- Un video principal es visible por vez en un contenedor estable 9:16.
- El scroll vertical mueve el video actual hacia arriba y el siguiente entra desde abajo.
- Solo el video activo se reproduce; los inactivos se pausan.
- Usar `muted` inicialmente para permitir autoplay, junto con `playsInline`, `loop` y `preload="metadata"`.
- El botón SVG de sonido actúa después de interacción explícita. Al cambiar el video activo, el control vuelve a off; nunca se transfiere audio automáticamente al siguiente video.
- Solo un componente puede poseer audio desmuteado a la vez; `videoSound.js` coordina esa exclusividad.
- La visibilidad real de cada elemento `<video>` se observa desde el componente reutilizable. Al dejar de intersectar el viewport, el video se mutea y pausa inmediatamente, y se libera cualquier preferencia de sonido activa para impedir audio en background.
- Al volver a entrar, el autoplay puede reanudarse muted; nunca se reactiva sonido automáticamente. El usuario debe volver a habilitarlo de forma explícita.
- Cada item puede declarar `audioEnabled: true` o `audioEnabled: false`. Si se omite, conserva el comportamiento histórico y admite sonido.
- Un video con `audioEnabled: true` comienza muted, muestra el control compartido y sólo se desmutea después de click/tap.
- Un video con `audioEnabled: false` permanece muted, no muestra botón y no responde a la preferencia de audio de otros videos.
- No intentar autoplay con sonido antes de interacción.
- Mantener aspect ratio, preload razonable y cleanup de videos y ScrollTrigger al cambiar de ruta.
- La cantidad de slides, el recorrido y la duración se derivan de `items.length`. Cantidades impares —incluido un bloque de tres videos— deben ocupar la secuencia sin huecos ni placeholders.
- Desconectar `IntersectionObserver`, mutear y pausar videos durante el cleanup del componente.
- Con reduced motion, mantener acceso al contenido sin pinning.

## 8. Catálogos

Componente único: `src/components/media/CatalogPair.jsx`. Tipo de bloque: `catalogPair`.

```text
catalogos/
├── catalogo1/
│   ├── 01.jpeg
│   └── 02.jpeg
└── catalogo2/
    ├── 01.jpeg
    └── 02.jpeg
```

- Ordenar páginas por el nombre real del archivo.
- Dos catálogos permanecen visibles lado a lado en desktop y avanzan con el mismo scroll vertical.
- El paso de página usa GSAP, ScrollTrigger y transforms CSS 3D; no requiere PDFs.
- Si las cantidades difieren, el catálogo corto conserva su última página.
- Mantener proporciones, evitar clipping y apilar de forma legible en mobile.
- No instalar una librería page-flip sin una razón técnica real y autorización previa.

## 9. Excepciones controladas

Tardeo conserva ediciones modeladas como datos. Edición 1 muestra primero dos filas continuas de piezas audiovisuales mediante `MediaRows` y después stories mediante `StorySequence`; Edición 2 usa `comingSoon`. Esta excepción de orden no autoriza duplicar componentes ni eliminar el selector de ediciones.

En Tardeo, los seis videos de la fila 1 declaran `audioEnabled: false`. En la fila 2, sólo la primera pieza declara `audioEnabled: true`; la segunda y la tercera declaran `false`. La capacidad de audio vive en los datos y `MediaRows` la respeta sin inferirla por posición.

### Rambla — Dual Phone Stories

Rambla declara su bloque de stories con `presentation: "dualPhoneVideo"` y un `companionVideo`; `ClientPage` no compara el nombre del cliente.

- Desktop, notebook y tablet muestran dos iPhones simultáneos, del mismo tamaño, alineados y centrados como composición.
- El iPhone izquierdo reproduce el video real de `stories/` con autoplay, loop, `playsInline` y muted permanente. No expone control de sonido ni participa del coordinador global.
- El iPhone derecho reutiliza internamente `StorySequence`: un único mockup estable, label `STORY` y el track de imágenes que avanza de derecha a izquierda con GSAP + ScrollTrigger.
- En desktop se fija la composición completa durante la secuencia. En mobile los teléfonos se apilan para conservar legibilidad y se fija sólo el teléfono de stories durante su transición.
- Ambos usan `public/iphone.png`; la animación sólo transforma el contenido interior derecho y mantiene las proporciones reales.

## 10. Navegación, responsive y validación

- `Volver al portfolio` pertenece al layout compartido de `ClientPage` y permanece fixed durante todo el case study.
- Respetar safe areas, focus visible, teclado, labels accesibles y z-index sin tapar contenido importante.
- Evitar overflow horizontal: verificar `scrollWidth <= clientWidth`.
- Ejecutar `npm test`, `npm run lint` y `npm run build`.
- Validar con Playwright CLI desktop, notebook, tablet, mobile y reduced motion.
- Recorrer rutas SPA entre clientes y confirmar cleanup de pin-spacers, ScrollTriggers y videos.
- Revisar consola, requests fallidos, proporciones, labels persistentes y estados inicial/intermedio/final de cada animación.

## 11. Flujo de Supabase Storage

- Inspección local: `npm run media:inspect`.
- Manifiesto versionado de rutas y tamaños originales: `npm run media:manifest`; ejecutarlo antes de retirar copias locales nuevas. El generador rechaza reducir un manifiesto existente para evitar perder el inventario después del cleanup.
- Migración remota idempotente: `npm run media:migrate`; omite objetos existentes sólo cuando su tamaño coincide y nunca sobrescribe silenciosamente.
- Verificación: `npm run media:verify`; usa `scripts/portfolio-media-manifest.json`, compara ruta y tamaño, comprueba URLs públicas y exige HTTP Range válido para videos. Cualquier objeto remoto fuera del manifiesto se informa para impedir inventarios ambiguos.
- Archivos de hasta 6 MiB usan upload estándar. Archivos entre 6 y 50 MiB usan TUS resumible con chunks de 6 MiB, progreso, reintentos y caché local en `.cache/`. En plan Free, archivos mayores a 50 MiB se marcan `SKIPPED_SIZE_LIMIT` y permanecen locales sin modificación.
- Las credenciales server-only `SUPABASE_URL` y `SUPABASE_SECRET_KEY` viven en `.env.migration`, nunca en el frontend ni en Git. TUS obtiene un signed upload token administrativo y lo envía como `x-signature`; la secret key viaja sólo como `apikey` por el gateway y nunca como Bearer. Ver `.env.example`.
- El bucket debe ser público. El límite de carga administrativa permanece en 50 MiB (`52428800` bytes) aunque los dos videos reemplazados ya entren dentro de ese máximo.
- No retirar una copia local nueva hasta que migración, manifiesto, verificación, frontend, Playwright, tests, lint y build hayan pasado. Los objetos que superen 50 MiB se marcan `SKIPPED_SIZE_LIMIT` y no se eliminan localmente.
- La guía oficial de uploads resumibles de Supabase es `https://supabase.com/docs/guides/storage/uploads/resumable-uploads`; los límites se documentan en `https://supabase.com/docs/guides/storage/uploads/file-limits`.

## 12. Panel administrativo privado

- Ruta: `/admin`, separada del layout, navegación y animaciones públicas.
- Auth: email + password con Supabase Auth. No existe signup, register ni contraseña propia.
- Autorización: `portfolio_admins.user_id` referencia `auth.users.id`; `private.is_portfolio_admin()` valida `auth.uid()` dentro de RLS.
- La UI confirma la sesión y la fila de autorización antes de renderizar el dashboard. Una sesión expirada vuelve al login.
- Sistema tipográfico compartido: los títulos principales de pantallas y formularios usan Oswald; subtítulos, labels, instrucciones, botones, inputs, errores, nombres de archivo, metadata, previews y textos secundarios usan Montserrat. Network Free no se carga ni se utiliza dentro de `/admin`.
- Todos los cambios quedan en estado local hasta `CONFIRMAR CAMBIOS`.
- Crear: crea primero un cliente `published = false`, sube media, reemplaza metadata de forma transaccional mediante `admin_replace_portfolio_client()` y publica al final. Ante un fallo previo al commit elimina uploads nuevos y el draft.
- Actualizar: sube archivos nuevos antes del commit transaccional; las eliminaciones de objetos existentes se ejecutan después del commit y se informan si requieren limpieza manual.
- Eliminar: exige escribir el nombre en mayúsculas, oculta primero el cliente, elimina sólo las rutas de su `storage_prefix` y finalmente borra metadata en cascada.
- Uploads: click o drag & drop, preview, quitar, orden por botones y progreso por archivo. El límite frontend y de bucket es 50 MiB (`52428800` bytes) por archivo.
- Los clientes nuevos usan automáticamente Stories → Posts → Carruseles → Videos → Catálogos. Rambla y Tardeo conservan sus configuraciones/ediciones migradas.
- `EDITAR SOBRE MÍ` carga la fila `portfolio_site_content/about`, permite editar y ordenar sus listas en estado local y ejecuta un único `UPDATE` al pulsar `GUARDAR CAMBIOS`. El éxito ofrece volver al panel o abrir `/#sobre-mi`; un error conserva el borrador para reintentar.
- RLS de `portfolio_site_content`: `anon` tiene sólo `SELECT`; `authenticated` tiene `SELECT` y permiso de columna `UPDATE(content)`, pero la policy exige `private.is_portfolio_admin()`. No se conceden `INSERT` ni `DELETE` al navegador.
- `/admin` inyecta `noindex, nofollow`; esto complementa Auth/RLS y no los reemplaza.

### Aplicación reproducible

1. Aplicar, en orden, las migrations de `supabase/migrations/`.
2. Crear manualmente a Sol en Supabase Dashboard → Authentication → Users. No inventar email, password ni UUID.
3. Copiar el UUID real y ejecutar desde SQL Editor, autenticado como administradora del proyecto:

```sql
insert into public.portfolio_admins (user_id)
values ('UUID_REAL_DE_SOL');
```

4. Desactivar `Allow new users to sign up` en Authentication → Sign In / Providers → Email. Mantener también desactivado el acceso anónimo.
5. Configurar `.env.local` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_SUPABASE_STORAGE_BUCKET=portfolio-media`. Mantener `VITE_PORTFOLIO_DATABASE_ENABLED=false` durante el rollout.
6. Con `SUPABASE_URL` y `SUPABASE_SECRET_KEY` sólo en `.env.migration`, ejecutar primero `npm run db:seed` y después `npm run db:seed -- --apply`.
7. Cambiar `VITE_PORTFOLIO_DATABASE_ENABLED=true`, volver a desplegar una vez y verificar los nueve clientes, tests y Playwright antes de retirar el fallback de `clients.js`.

No se usan Edge Functions en esta versión: Auth, RLS, Storage policies y una función Postgres transaccional resuelven el flujo sin exponer la secret key al navegador.

## 13. Secciones personalizadas y banners responsive

- `portfolio_sections.sort_order` es la fuente de verdad del orden público. El frontend conserva el orden recibido y no reordena por nombre ni por cliente.
- El tipo genérico `customMedia` representa una sección nombrada desde Admin con múltiples archivos. No crear un componente por cliente; seleccionar la presentación mediante `section.config.presentation`.
- Una sección personalizada nueva usa `presentation: "mediaGrid"`. Las imágenes guardan `media_kind: "image"`; los videos siguen usando `media_kind: "video"`. Los archivos se suben bajo `{storage_prefix}/secciones/{slug-de-seccion}/`.
- Los controles de orden del Admin mueven tanto secciones estándar como personalizadas. `buildClientPayload()` serializa exactamente ese orden y omite cualquier sección o grupo con cero items activos.
- Al confirmar una edición, `admin_replace_portfolio_client()` reemplaza la estructura relacional en transacción. Si el último item fue quitado, la fila de sección anterior desaparece. La lectura y el render filtran nuevamente media sin `storage_path` válido.
- El máximo es 50 MiB por archivo para cualquier sección. Se valida antes de iniciar el upload; no hay compresión automática.
- Rambla usa `customMedia` + `responsiveBanner` antes de Stories. Los items declaran `config.viewport = "desktop"` o `"mobile"`:
  - `portfolio-media/rambla/banners/banner_horizontal.jpeg` — 1920×700, 168.916 bytes, `image/jpeg`.
  - `portfolio-media/rambla/banners/banner_vertical.png` — 1122×1402, 1.852.231 bytes, `image/png`.
- `ResponsiveBrandBanner` debe mantener `<picture>` con source mobile a `(max-width: 47.99rem)`, `object-fit: contain` y aspect ratio propio por breakpoint. No descargar ambas variantes ni transformar una composición en la otra.
- Animación aprobada: sin pin; reveal ligado al scroll. Desktop descubre izquierda → derecha; mobile descubre abajo → arriba; ambos escalan 1.04 → 1. Reduced motion deja el banner completo y estático.
- No retirar las copias locales nuevas hasta verificar migration remota, URL pública, frontend real, Playwright, tests, lint y build. Storage ya contiene y verifica los dos objetos; la limpieza local sigue condicionada al pase visual y de Database.
