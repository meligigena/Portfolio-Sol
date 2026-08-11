# Contexto del proyecto — Portfolio Sol Fanara

Última actualización: 2026-08-11

> **Instrucción permanente:** Al comenzar una nueva sesión de trabajo sobre este proyecto, leer este archivo antes de modificar código. Si durante la sesión se toman decisiones permanentes que cambian arquitectura, contenido, identidad visual, assets, rutas o comportamiento, actualizar este documento antes de finalizar.

Este documento es la fuente de verdad operativa del proyecto. Describe el código y las decisiones vigentes; no conserva alternativas que ya fueron descartadas.

## 1. Objetivo del proyecto

Construir el portfolio profesional de Sol Fanara, diseñadora gráfica y editora de video.

La experiencia debe ser visual, editorial, dinámica e interactiva. Los clientes, campañas, flyers, posts, stories, videos y demás piezas gráficas son el contenido protagonista; la interfaz debe funcionar como soporte y no competir con ellos.

Daniel Sun y Spencer Gabor son referencias conceptuales por su escala, aire, jerarquía, protagonismo de las piezas y uso narrativo del movimiento. No se deben copiar sus identidades, layouts, paletas, recursos gráficos ni comportamientos específicos.

## 2. Stack y herramientas actuales

- Vite 8.
- React 19 con JavaScript y JSX.
- React DOM 19.
- React Router DOM 7.
- GSAP 3 y ScrollTrigger.
- `@gsap/react` para `useGSAP()` y cleanup integrado con React.
- Vitest 4, Testing Library, jest-dom y JSDOM para tests automatizados.
- ESLint 10 con plugins de React Hooks y React Refresh.
- Playwright CLI para inspección y validación en navegador real. Se ejecuta mediante `npx --package @playwright/cli playwright-cli`; no es una dependencia de `package.json`.
- `@fontsource/oswald` y `@fontsource/montserrat` para fuentes locales empaquetadas.
- `@supabase/supabase-js` para administrar el bucket remoto y uploads estándar desde scripts locales.
- `tus-js-client` como dependencia de desarrollo para uploads TUS resumibles de archivos mayores a 6 MiB.

No existe una librería de UI, iconos, smooth scroll ni mockups. No instalar dependencias nuevas sin autorización previa.

Comandos habituales:

```powershell
npm run dev
npm test
npm run test:watch
npm run lint
npm run build
npm run preview
npm run media:inspect
npm run media:manifest
npm run media:migrate
npm run media:verify
```

La fuente activa de los 144 assets modelados de clientes es exclusivamente el bucket público `portfolio-media`. Las nuevas versiones de Maja y Sistemas Móviles entran dentro del máximo de 50 MiB, fueron migradas y verificadas por ruta, tamaño, URL pública, reproducción y HTTP Range. `scripts/portfolio-media-manifest.json` conserva 146 objetos remotos: los 144 modelados más dos banners de Rambla en staging, todavía no conectados al frontend. `portfolioMediaUrl()` ya no tiene mapa ni ramas de fallback local.

## 3. Skills disponibles

Antes de trabajar, consultar y aplicar las skills que correspondan al alcance:

- `frontend-design` — `.agents/skills/frontend-design/SKILL.md`: dirección de arte, tipografía, jerarquía y decisiones visuales no genéricas.
- `react` / `gsap-react` — `.agents/skills/react/SKILL.md`: `useGSAP()`, refs, scopes y cleanup correcto en React.
- `performance` / `gsap-performance` — `.agents/skills/performance/SKILL.md`: transforms, opacity, capas y prevención de layout thrashing.
- `scrolltrigger` / `gsap-scrolltrigger` — `.agents/skills/scrolltrigger/SKILL.md`: scrub, pinning, triggers, refresh, responsive y cleanup.
- `playwright-cli` — la skill disponible actualmente se llama `playwright` y está en `C:/Users/Usuario/.codex/skills/playwright/SKILL.md`: validación real de páginas, scroll, rutas, consola y capturas.

Las skills no sustituyen las instrucciones específicas de la usuaria. Si una tarea visual incluye GSAP o validación real, deben utilizarse las skills relacionadas.

## 4. Dirección visual vigente

La identidad es editorial, directa y de alto contraste:

- blanco como campo principal;
- negro para texto y fondos invertidos;
- bordó como acento estructural;
- grandes títulos display;
- metadata compacta;
- mucho aire y composiciones asimétricas controladas;
- animaciones intencionales ligadas a la entrada o al descubrimiento del trabajo.

Se debe evitar una apariencia corporativa, de dashboard, de plantilla genérica o de grilla de cards convencional. No usar gradientes genéricos, sombras excesivas ni decoración que compita con las piezas.

Tokens actuales en `src/styles/tokens.css`:

| Token | Valor | Uso principal |
|---|---:|---|
| `--color-ink` | `#080808` | Texto y fondos negros |
| `--color-wine` | `#781a34` | Header y acento bordó |
| `--color-wine-deep` | `#3a0a18` | Fondo de Contacto |
| `--color-paper` | `#f7f7f5` | Fondo claro general |
| `--color-proof` | `#a9a2a5` | Metadata secundaria |

El Hero usa actualmente blanco puro `#fff`, decisión deliberada distinta de `--color-paper`.

## 5. Tipografías

### Network Free

- Archivo: `fonts/NetworkFreeVersion.ttf`.
- Se carga con `@font-face` en `src/styles/tokens.css`.
- Family CSS: `"Network Free"`.
- Peso cargado: 400 normal.
- Token: `--font-display`.
- Uso: títulos display de gran escala, incluidos `PORTFOLIO`, `MIS TRABAJOS`, títulos principales de secciones y nombres de case studies.
- Tratamiento reusable: clase `.network-title`, con kerning y ligaduras desactivados y `letter-spacing: 0`. No aplicar tracking negativo ni transforms horizontales a títulos Network; la composición debe permanecer compacta sin superponer glifos.

La fuente fue solicitada también como Networkand, pero el archivo disponible declara internamente Network Free. No renombrarla ni sustituirla sin autorización. **Pendiente:** confirmar que la licencia permite su publicación mediante `@font-face` en web y conservar evidencia/licencia antes del despliegue público.

### Oswald

- Cargada desde `@fontsource/oswald` en pesos 400 y 500, variante latin.
- Token: `--font-utility`.
- Uso: navegación, labels, metadata, subtítulos, captions y `SOL FANARA`.

### Montserrat

- Cargada desde `@fontsource/montserrat`, peso 400 latin.
- Token: `--font-profile`.
- Uso actual: descripciones de Diseño Gráfico y Edición de Video, Habilidades clave, Idiomas y las dos acciones principales de Contacto.

En `/admin` rige un sistema aislado y compartido: Oswald para títulos principales de pantallas y formularios; Montserrat para subtítulos y todo el resto de la interfaz, incluidos labels, controles, ayudas, errores, archivos, metadata y previews. Network Free no se utiliza en el panel administrativo.

### Fuente de cuerpo general

`--font-body` declara `Inter, Arial, Helvetica, sans-serif`, pero Inter no está instalada ni importada. Por lo tanto, el cuerpo general usa actualmente Arial/Helvetica según disponibilidad del sistema. No documentar Inter como fuente efectivamente cargada.

## 6. Estructura actual del sitio y rutas

La Home contiene, en este orden:

1. Home / Hero.
2. Mis Trabajos.
3. Sobre mí.
4. Contacto.

Además existen páginas individuales de cliente y una página Not Found.

Rutas reales en `src/app/router.jsx`:

- `/` — Home completa.
- `/portfolio/:clientSlug` — case study individual.
- `/portfolio` — redirección a `/#portfolio`.
- `/admin` — panel privado separado; muestra login sin sesión y dashboard sólo después de validar Auth + `portfolio_admins`.
- `*` — Not Found con enlace de regreso a Portfolio.

Todos los case studies renderizan un único enlace compartido `Volver al portfolio`, fijo durante todo el recorrido y protegido por safe areas en mobile.

`ClientPage` se carga con `React.lazy()` y `Suspense`. En producción, el hosting deberá tener fallback SPA hacia `index.html` para soportar recargas de rutas profundas.

## 7. Home / Hero

- Título exacto: `PORTFOLIO`.
- Presentación: `SOL FANARA`, en Oswald, por encima y alineado a la izquierda.
- `SOL FANARA` conserva su escala y se desplaza sutilmente hacia arriba para dar más aire respecto de `PORTFOLIO`.
- Fondo blanco puro y texto negro.
- Header fijo bordó con `SF`, `PORTFOLIO`, `SOBRE MÍ` y `CONTACTO`. `SF` conserva la misma tipografía y escala, con un marco blanco fino sin relleno.
- El título es deliberadamente sobredimensionado, ocupa casi todo el ancho y mantiene una composición editorial en la zona central/inferior del viewport.
- No existe un rectángulo bordó detrás del título.
- Cada letra de `PORTFOLIO` es un `.hero__letter` directo. No reintroducir wrappers con `overflow: hidden`, máscaras o alturas rígidas que puedan cortar los trazos.
- El contenedor y el título permiten overflow visual para evitar clipping, pero la página no debe generar overflow horizontal.

Animaciones en `useHeroMotion.js`:

- timeline de entrada para `SOL FANARA`, letras y footer;
- entrada de letras mediante `yPercent`, opacity y stagger;
- compresión moderada del bloque del título al hacer scroll, con `scale` y `yPercent`;
- ScrollTrigger `hero-compression` con `scrub: 0.7`;
- refresh después de cargar las fuentes;
- sin animación si `prefers-reduced-motion: reduce`.

En mobile se reduce la escala del título y aumenta el espacio inferior, manteniendo todas las letras completas.

## 8. Mis Trabajos

- El título visible de la sección es `MIS TRABAJOS`.
- La cartera visible contiene exactamente nueve clientes, en este orden definitivo: Rambla, Aqualand, Tardeo, Peumax, Desnac, Sistemas Móviles, Vectus, Maja y El Tori.
- `CLIENT_SLUG_ORDER` define la secuencia compartida por el rail y la navegación anterior/siguiente. No se renderizan clientes pendientes, placeholders, cards vacías ni carpetas de assets no declaradas.
- El título y el rail conservan su composición aprobada con una separación vertical sutil adicional; el header permanece por encima de las previews durante todo el pin.
- La navegación superior conserva el texto `PORTFOLIO`.
- Los clientes se presentan mediante previews cuadradas, redondeadas y consistentes por breakpoint.
- Los nueve clientes usan sus logos reales como preview; no existe una variante placeholder en el rail publicado.
- Cada preview muestra cliente, año y disciplina, en ese orden, y enlaza a `/portfolio/<slug>`.
- El item completo reserva espacio para preview y metadata; la metadata no debe quedar cortada verticalmente durante el scroll horizontal.
- El viewport del rail puede recortar offsets horizontales transitorios, pero no debe recortar verticalmente los datos de cliente.
- En desktop con pin horizontal, cada cliente activo debe entrar como unidad completa de imagen + metadata dentro del viewport antes de llegar a Sobre mí.

Desktop, desde 64 rem y sin reduced motion:

- el viewport de Portfolio se fija temporalmente;
- el track interno se desplaza horizontalmente con scroll vertical;
- se anima el track, no el elemento fijado;
- ScrollTrigger usa `scrub: 0.8` y actualiza el contador activo.

Tablet, mobile y reduced motion:

- no hay pinning ni falso scroll horizontal;
- los clientes se apilan en un recorrido vertical accesible.

## 9. Modelo de clientes y proyectos

La fuente de verdad definitiva es Supabase Database. `PortfolioDataProvider` consulta los clientes publicados cuando `VITE_PORTFOLIO_DATABASE_ENABLED=true`, `portfolioDatabase.js` transforma el modelo relacional al contrato actual y `getClientBySlug` deja de ser la dependencia de las rutas. `src/data/clients.js` permanece como fallback temporal sólo para metadata de clientes hasta completar esa activación. `PORTFOLIO_CONTENT_GUIDE.md` sigue siendo la fuente de verdad para estructura, orden de bloques y animaciones. `src/lib/portfolioMedia.js` construye exclusivamente URLs públicas del bucket `portfolio-media`; no conserva excepciones locales.

Tablas versionadas:

- `portfolio_admins`: UUID autorizado vinculado a `auth.users`.
- `portfolio_clients`: metadata, `storage_prefix`, orden y estado `published`.
- `portfolio_editions`: ediciones especiales como Tardeo.
- `portfolio_sections`: bloques reutilizables.
- `portfolio_media_groups`: carruseles, catálogos, filas y companion de stories.
- `portfolio_media_items`: metadata, MIME, dimensiones, audio, orden y ruta Storage.
- `portfolio_site_content`: contenido editorial reutilizable por `content_key`; la fila `about` guarda el objeto JSONB editable de Sobre mí.

Estructura actual:

```js
{
  slug,
  name,
  year,
  disciplines: [],
  summary,
  cover,
  projects: [],
  content: [
    { type: "storySequence", items: [] },
    { type: "postGrid", items: [] },
    { type: "carouselPairs", items: [] },
    { type: "videoStack", items: [] },
    { type: "catalogPair", items: [] }
  ]
}
```

El orden estándar es Stories → Posts → Carruseles → Videos → Catálogos, omitiendo categorías vacías. Todos los posts se muestran antes de cualquier carrusel. `CarouselPairs` agrupa carruseles de a dos y sincroniza sus slides; `VideoStack` centraliza reproducción activa y preferencia de sonido. Los videos pueden declarar `audioEnabled`; `false` fuerza muted permanente y elimina el control, mientras que `true` o la omisión conservan el audio activable por interacción. `useVideoViewportVisibility` observa cada video real: al salir completamente del viewport lo mutea y pausa, libera su estado audible y sólo permite retomar autoplay muted al volver.

Los clientes con variantes internas pueden declarar `editions`. Cada edición define su `id`, `label` y bloques `content`, o `comingSoon: true`. Tardeo es la excepción controlada de orden. Los bloques `storySequence` pueden declarar la presentación controlada `dualPhoneVideo` y un `companionVideo`; Rambla usa esta configuración sin condiciones por nombre.

Tipos usados o previstos: `story`, `post`, `poster`, `square`, `wide`, `video` y `mockup`. Presentaciones actuales: `phone`, `raw`, `overlap` y `fullBleed`.

Para agregar un cliente:

1. Preparar temporalmente `public/portfolio/<cliente>/` con un slug estable y minúsculo.
2. Organizar assets reales únicamente en `stories/`, `posts/`, `carruseles/`, `videos/` y `catalogos/`, según corresponda.
3. Medir las dimensiones reales de cada archivo; no inferirlas ni deformarlas.
4. Migrar y verificar Storage, regenerar el manifiesto y añadir un objeto a `clients` con rutas relativas `cliente/...`.
5. Elegir `type` y `presentation` según el formato real.
6. Proporcionar `alt` descriptivo con información confirmada.
7. Validar la nueva preview, ruta, navegación anterior/siguiente, responsive y reduced motion.

No crear un componente completamente nuevo por cliente si el modelo y `ProjectMedia` pueden representar el contenido. Se permiten composiciones específicas cuando el material real lo justifique.

## 10. Peumax

- Nombre: Peumax.
- Disciplina: Repuestos de Automotores.
- Año: 2024.
- Ruta: `/portfolio/peumax`.

Assets incorporados:

- `portfolio-media/peumax/stories/`: 8 archivos, numerados del 69 al 76, 1080×1920.
- `portfolio-media/peumax/posts/`: 8 archivos, numerados del 62 al 69, 1080×1350.
- `portfolio-media/peumax/carruseles/`: carrusel A con 3 slides y carrusel B con 2.

Composición vigente:

- Las stories se muestran dentro de un único mockup de iPhone usando `public/iphone.png`.
- La pantalla conserva 9:16; las imágenes no se deforman.
- El iPhone se escala según el alto útil del viewport para verse completo durante todo el pin de Stories, desde la primera hasta la última story antes de Posts.
- Los posts aparecen como piezas 4:5 independientes, sin teléfono, en una composición editorial alternada.
- Stories y posts se descubren progresivamente mediante ScrollTrigger con scrub, cambios de posición, escala, rotación moderada y opacity.
- Las animaciones utilizan transforms y opacity, están limitadas al scope de la página y se limpian al desmontar.
- El case study usa `overflow-x: clip` para contener únicamente los offsets transitorios de entrada y evitar scroll horizontal accidental.

Assets compartidos:

- `public/iphone.png` es el marco único usado por `StorySequence`.
- `portfolio-media/peumax/logo.jpeg` es la preview de Peumax en Mis Trabajos.

### Tardeo

- Nombre visible: Tardeo. Disciplina: Eventos/Entretenimiento. Año: 2026. Ruta: `/portfolio/tardeo`.
- Es un único cliente con ediciones modeladas en `src/data/clients.js`.
- Edición 1 muestra primero dos filas continuas de videos 9:16 (6 y 3 piezas) y después 7 stories 1080×1920.
- En desktop cada fila ocupa el ancho disponible sin gaps; en anchos menores usa scroll horizontal contenido para conservar todas las piezas sin overflow de página.
- Edición 2 sólo muestra `Próximamente`.
- Los assets y la cover se sirven desde `portfolio-media/tardeo/`.
- `MediaRows` reinicia explícitamente la reproducción al montar y al volver por navegación SPA. Los seis videos de fila 1 y los dos últimos de fila 2 usan `audioEnabled: false`; sólo el primero de fila 2 permite audio y usa el coordinador exclusivo.

### Sistemas Móviles

- Nombre: Sistemas Móviles. Año: 2025. Disciplina: Sistemas de Seguridad. Ruta: `/portfolio/sistemas-moviles`.
- Ruta de Storage: `portfolio-media/sistemas-moviles/`; cover `logo.jpg` 1080×1350. La versión vigente `videos/0810(1).mp4` pesa 47.236.003 bytes, es `video/mp4` y mide 720×1280.
- Assets reales disponibles: 3 stories 1080×1920, 4 posts 1080×1350, un carrusel de 2 slides 1080×1350 y 2 videos verticales.
- Usa `StorySequence`, posts estándar, `CarouselPairs` y `VideoStack` en el orden estándar.

### Rambla

- Nombre: Rambla. Año: 2026. Disciplina: Eventos/Entretenimiento. Ruta: `/portfolio/rambla`.
- Es independiente de Tardeo. Cover `logo.jpg` 1241×1170.
- Assets reales disponibles: 5 imágenes de stories 1080×1920, un video de stories 1080×1920 y 4 videos estándar; hoy no existen carpetas `posts/` ni `carruseles/`.
- Su bloque `storySequence` usa `presentation: "dualPhoneVideo"`: en desktop se fijan dos iPhones iguales; el izquierdo reproduce el companion video siempre muted y el derecho reutiliza el track estándar GSAP. En mobile se apilan y se fija sólo el teléfono de stories.
- Sus videos restantes usan `VideoStack`; uno mide 1080×1936 y los demás 1080×1920.

### Maja

- Nombre: Maja. Año: 2024. Disciplina: Estética. Ruta: `/portfolio/maja`.
- Cover `logo.png` 1254×1254.
- Storage contiene 4 videos; la versión vigente `videos/copy_23CA139B-41CF-4ED6-8F98-FAC3BB8634F4.mov` pesa 29.869.127 bytes, es `video/quicktime` y mide 1080×1920. No contiene `stories/`, `posts/` ni `carruseles/`, por lo que esos bloques se omiten sin inventar assets.
- Usa `VideoStack` sin excepciones visuales.

### El Tori

- Cliente data-driven con ruta `/portfolio/el-tori`, cover `portfolio-media/tori/logo.jpeg`, año 2026, disciplina Restobar y estado reutilizable `comingSoon`.
- Su case study sólo muestra `Próximamente` y la navegación entre clientes.

### Desnac

- Nombre: Desnac. Año: 2025. Disciplina: Empresa de Software. Ruta: `/portfolio/desnac`.
- Assets reales: 7 stories, 6 posts, 4 carruseles y 3 videos.
- Usa los bloques estándar `storySequence`, `postGrid`, `carouselPairs` y `videoStack`, sin lógica específica por cliente.
- `VideoStack` deriva su recorrido de los tres items reales, sin cuarto espacio ni placeholder.
- `portfolio-media/desnac/logo.jpg` está disponible en 1080×1350 y se usa como cover real en Mis Trabajos.

### Catálogos de Aqualand

- `CatalogPair` renderiza dos catálogos en paralelo dentro del case study y usa GSAP + ScrollTrigger para un paso de página 3D controlado por scroll.
- `catalogo1` contiene 9 páginas y `catalogo2` 8, ordenadas numéricamente desde sus archivos `.jpg` reales.
- En mobile los catálogos se apilan; reduced motion reemplaza el pin por páginas desplazables horizontalmente.

## 11. Sobre mí

Jerarquía actual:

```text
SOBRE MÍ
PERFIL / EXPERIENCIA

fotografía + contenido
```

El título y subtítulo están alineados a la izquierda. La fotografía real está en `public/fotografia_personal.jpeg`, conserva un formato horizontal 5:4 mediante `object-fit: cover`, tiene marco bordó y se integra junto al contenido sin invadirlo. La grilla desktop mantiene la foto y los textos cerca, con gaps compactos para evitar huecos grandes debajo o a la derecha de la imagen.

Los títulos de cada bloque aparecen por encima de una línea horizontal separadora. Las descripciones principales, Habilidades clave e Idiomas usan Montserrat 400. Habilidades técnicas, labels y metadata usan Oswald.

### Diseño Gráfico

- Desarrollo de piezas visuales para marcas y redes sociales, adaptadas a las necesidades estéticas y comunicacionales de cada cliente.
- Conceptualización y diseño con foco en la identidad visual, asegurando coherencia, impacto y profesionalismo en cada entrega.

### Edición de Video

- Edición creativa y narrativa de contenido audiovisual para plataformas digitales, con especial atención al ritmo, estilo y mensaje.
- Adaptación de videos a distintos formatos y objetivos (reels, TikToks, presentaciones, contenido institucional), maximizando el engagement y la calidad visual.

### Habilidades clave

- Comunicación visual clara y efectiva.
- Creatividad y pensamiento conceptual.
- Capacidad de adaptación a diferentes estilos y marcas.
- Resolución ágil y proactiva de problemas.

### Habilidades técnicas

- Canva.
- CapCut.
- Adobe Illustrator.
- Adobe Photoshop.
- Adobe Premiere Pro.
- Google Drive.

### Idiomas

- Inglés C1 — Cambridge University.
- Portugués conversacional.

Los bloques usan reveals discretos con `useSectionReveal`; reduced motion deja todo visible sin animación.

Estos textos ya no están hardcodeados en React. `PortfolioDataProvider` lee públicamente `portfolio_site_content/about` y `About` conserva el mismo DOM, layout, tipografías públicas, fotografía, responsive y animaciones. El JSONB contiene `profile`, los arrays `graphicDesign` y `videoEditing`, las listas ordenadas `keySkills`, `technicalSkills` y `languages`. `/admin` precarga esa fila, mantiene un borrador local y guarda una sola vez al confirmar.

La migration `20260811020000_portfolio_site_content.sql` crea tabla, constraints, trigger, seed exacto, grants, RLS y policies. `anon` sólo puede leer; un usuario autenticado sólo puede actualizar `content` cuando `private.is_portfolio_admin()` devuelve true. `20260811020100_portfolio_site_content_service_role.sql` conserva acceso server-only para tareas reproducibles. Ambas están aplicadas en el proyecto remoto.

## 12. Contacto

Datos vigentes en `src/data/contact.js`:

- Email: `fanaraasol@gmail.com`.
- Enlace: `mailto:fanaraasol@gmail.com`.
- WhatsApp: `https://wa.me/qr/IHDR4VMNADPMI1`.
- Texto visible exacto: `Escribir por Whatsapp`.

Diseño vigente:

- título `CONTACTO` y subtítulo alineados a la izquierda;
- icono SVG inline de mail a la izquierda del correo;
- icono SVG inline de WhatsApp a la izquierda del texto;
- ambos enlaces usan Montserrat con el mismo tamaño, peso, interlineado y tamaño de icono;
- no existe el label independiente `EMAIL`;
- todo el conjunto de cada fila es clickeable;
- WhatsApp abre una pestaña nueva con `rel="noopener noreferrer"`.

## 13. Animaciones

Reglas permanentes:

- Registrar GSAP, `useGSAP` y ScrollTrigger una sola vez en `src/animations/gsap.js`.
- Usar `useGSAP()` con un ref como scope.
- Dejar que el contexto revierta tweens y ScrollTriggers al desmontar.
- Usar `contextSafe` para callbacks asíncronos que creen o invoquen lógica GSAP después del montaje.
- Crear triggers en orden visual y evitar duplicados.
- Priorizar `transform` y `opacity`; no animar `width`, `height`, `top`, `left`, margin o padding si existe una solución por transform.
- Usar `will-change` sólo en elementos realmente animados.
- No combinar `scrub` y `toggleActions` en el mismo trigger.
- Pin, scrub, parallax, reveals y superposiciones sólo se usan cuando mejoran la lectura del contenido.
- No animar cada elemento por costumbre.
- Respetar `prefers-reduced-motion` sin ocultar contenido esencial.

Animaciones concretas implementadas:

- Hero: entrada escalonada y compresión con scroll.
- Portfolio desktop: track horizontal pinned con scrub.
- Sobre mí y Contacto: reveals verticales discretos al entrar en viewport.
- Case studies genéricos: reveal vertical de medios.
- Stories estándar de Peumax, Aqualand, Desnac, Sistemas Móviles y Tardeo: un único iPhone pinned con track horizontal de derecha a izquierda y scrub.
- Stories de Rambla: presentación data-driven con dos iPhones pinned en desktop; el video izquierdo queda estable y muted, mientras sólo el track interior derecho avanza de derecha a izquierda.
- Carruseles de Peumax, Aqualand y Desnac: pares pinned, visibles en simultáneo y sincronizados; el más corto conserva su último slide.
- Videos de Rambla, Desnac, Sistemas Móviles, Vectus y Maja: stack vertical pinned tipo Reels con un único video activo; sólo puede emitir sonido mientras intersecta el viewport y nunca lo recupera automáticamente al volver.
- Catálogos de Aqualand: dos libros sincronizados y pinned con paso de página 3D; el de menor cantidad conserva su última página.
- Posts: pares centrados con entrada alternada, traslación, escala y opacity con scrub.

## 14. Responsive

### Desktop

- Hero de gran escala.
- Portfolio pinned con track horizontal desde 64 rem.
- Case study en dos columnas, con metadata sticky.
- Stories usan un único iPhone completo y estable; posts existentes conservan sus composiciones aprobadas.
- Rambla muestra dos iPhones completos y alineados en una fila.
- Carruseles se muestran de a dos; cada par tiene una secuencia sincronizada.
- Sobre mí combina fotografía y contenido en columnas.

### Tablet

- Se reducen distancias y escalas mediante `clamp()`.
- Portfolio abandona el tramo horizontal por debajo de 64 rem.
- Se limitan las superposiciones y se prioriza lectura vertical.

### Mobile

- Navegación compacta pero siempre visible.
- Hero mantiene `PORTFOLIO` completo sin clipping.
- Portfolio es una lista vertical.
- Case study pierde la columna sticky y vuelve al flujo normal.
- Stories mantienen dos columnas compactas; posts ocupan una columna.
- La presentación dual de Rambla apila ambos iPhones; el segundo conserva la secuencia GSAP estándar sin reducirlos hasta volverlos ilegibles.
- Los pares de carruseles se apilan dentro de un único recorrido para conservar legibilidad.
- Sobre mí apila fotografía y contenido.
- Contacto conserva iconos y textos en una sola línea mientras el ancho lo permita, sin overflow.

Con reduced motion no hay pinning, scrub ni parallax; el contenido permanece estático y navegable.

## 15. Performance

- Mantener scroll nativo; no añadir smooth scrolling.
- `ClientPage` está lazy-loaded.
- Imágenes de proyectos y previews usan `loading="lazy"` y `decoding="async"`.
- Todos los proyectos deben declarar `width`, `height` y/o `aspect-ratio` para reducir layout shifts.
- Los videos futuros deben usar poster, controles accesibles y `preload="none"`.
- Controlar la cantidad de ScrollTriggers y evitar animaciones fuera de scope.
- Usar scrub moderado y propiedades compatibles con compositor.
- Ejecutar `ScrollTrigger.refresh()` sólo cuando cambie el layout; el Hero ya refresca después de cargar fuentes.
- No deformar imágenes: `object-fit` y proporciones deben corresponder al asset real.
- Evitar overflow horizontal; comprobar `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
- La migración preserva archivos originales. El script usa upload estándar hasta 6 MiB y TUS resumible por encima de ese umbral, con chunks de 6 MiB, reintentos, progreso y caché persistente ignorada por Git.
- Los JPG actuales de Peumax todavía no tienen variantes WebP/AVIF ni `srcset`. Su optimización es **pendiente** y no autoriza instalar herramientas nuevas.
- Network Free sigue en TTF. Una conversión a WOFF2 es **pendiente** y depende de licencia/herramientas autorizadas.

## 16. Playwright CLI

Playwright debe usarse durante el desarrollo, no sólo al finalizar. El flujo recomendado es abrir la app local, fijar el viewport, tomar snapshot antes de usar refs, recorrer la interacción, medir el DOM cuando sea necesario y guardar capturas en `output/playwright/`.

Ya se utilizó para inspeccionar directamente:

- `danielsun.space`: se tomó como referencia la gran escala tipográfica, el aire y la jerarquía. No se adoptaron el amarillo, los rayos, la navegación, overlays ni objetos 3D.
- `spencergabor.work`: se tomó como referencia el protagonismo de las piezas y el desplazamiento horizontal ligado al scroll. No se adoptaron su física de colisiones, hero, grillas, paneles superpuestos ni footer revelado.

Después de cambios visuales importantes, revisar como mínimo:

- desktop y mobile;
- scroll completo y posiciones intermedias de ScrollTrigger;
- hover, focus y navegación por teclado cuando corresponda;
- navegación interna, rutas profundas y regreso desde un cliente;
- consola y requests fallidos;
- overflow horizontal;
- clipping tipográfico;
- deformación o recorte accidental de imágenes;
- superposiciones y líneas sobre textos;
- creación y cleanup de pin-spacers/ScrollTriggers;
- reduced motion.

Para `/admin`, validar sin credenciales que nunca aparezca el dashboard, que el login no ofrezca registro y que exista `noindex, nofollow`. Los flujos CRUD reales requieren el usuario de Sol y las migrations aplicadas; nunca guardar esas credenciales en fixtures versionados.

Validación más reciente: Playwright CLI en 1440×900, 1024×768, 768×1024 y 390×844 confirmó nueve clientes en orden, 0 solapamientos Network por línea, separación positiva entre `MIS TRABAJOS` y previews, tres videos de Desnac, audio silenciado/pausado fuera del viewport, 0 overflow horizontal, cleanup sin triggers obsoletos y reduced motion sin pin-spacers. Consola: 0 errores y 0 warnings; assets modelados: 144 rutas, 0 faltantes.

## 17. Tests y validación

Herramientas: Vitest, Testing Library, jest-dom y JSDOM. La validación actual reúne 89 tests en 11 archivos, incluidos Admin, contenido público desde Database, permisos, Storage y sonido.

Cobertura actual:

- render de Home, títulos y fotografía;
- orden correcto de divisores y títulos;
- Hero sin wrappers que recorten letras;
- contenido de Sobre mí e idiomas;
- estructura uniforme de acciones de Contacto y ausencia del label `EMAIL`;
- metadata real de Peumax;
- navegación desde Peumax y regreso a Portfolio;
- 8 stories dentro de teléfonos y 9 posts sin teléfonos;
- atributos 1080×1920 y 1080×1350 de los assets;
- páginas de clientes construidas desde datos;
- orden estándar, pares de carruseles, Desnac, metadata de Tardeo/El Tori, navegación fija y controles de sonido;
- metadata y contenido real de Sistemas Móviles, Rambla y Maja; composición dual de Rambla; cover real de Desnac; audio permitido por item en Tardeo;
- Not Found para slugs desconocidos;
- comportamiento de hash al regresar a Portfolio.

Antes de considerar terminada una modificación:

```powershell
npm test
npm run lint
npm run build
```

Además, todo cambio visual relevante debe pasar Playwright en desktop y mobile. JSDOM no valida layout, GSAP ni ScrollTrigger visualmente.

Regla de trabajo: al corregir un bug, escribir primero el test que lo reproduce cuando sea técnicamente representable en la suite. Los problemas exclusivamente geométricos deben reproducirse y medirse primero con Playwright.

## 18. Estructura relevante del repositorio

```text
portfolio_sol/
├── .agents/skills/           # Skills locales de diseño y GSAP
├── fonts/
│   └── NetworkFreeVersion.ttf
├── public/
│   ├── fotografia_personal.jpeg
│   └── portfolio/             # Staging local opcional; nunca fuente runtime ni fallback
├── src/
│   ├── lib/
│   │   └── portfolioMedia.js  # Helper central de URLs públicas Supabase
│   ├── animations/           # Registro GSAP y hooks de movimiento
│   ├── app/                  # App y configuración del router
│   ├── components/
│   │   ├── media/            # Render genérico de piezas y teléfonos
│   │   └── navigation/       # Header y scroll por hash
│   ├── data/                 # Clientes, proyectos y contacto
│   ├── pages/                # Home, cliente y Not Found
│   ├── sections/             # Hero, Mis Trabajos, Sobre mí y Contacto
│   ├── styles/               # Tokens y CSS por sección
│   └── test/                 # Setup y suite automatizada
├── output/playwright/        # Capturas de validación; no es código fuente
├── scripts/                  # Inspección, manifiesto, migración TUS y verificación
├── PROJECT_CONTEXT.md        # Esta fuente de verdad
├── PORTFOLIO_CONTENT_GUIDE.md # Fuente de verdad para formatos de clientes
├── PROJECT_PLAN.md           # Plan histórico/estado anterior
├── package.json
└── vite.config.js
```

Responsabilidades:

- `src/data`: contenido editable sin acoplarlo al layout.
- `src/pages`: composición de rutas completas.
- `src/sections`: secciones principales de la Home.
- `src/components`: UI reutilizable, especialmente medios y navegación.
- `src/animations`: hooks GSAP compartidos; `StorySequence` encapsula su propio ScrollTrigger y cleanup.
- `src/styles`: tokens globales y reglas visuales por área.
- `public/portfolio`: staging local opcional para una migración; el frontend no lee media desde esta carpeta.
- `scripts`: inventario, migración idempotente y verificación remota de `portfolio-media`.
- `src/lib/portfolioMedia.js`: construcción central de URLs públicas; no usa service role.
- `.agents/skills`: instrucciones que deben leerse cuando la tarea las active.

## 19. Restricciones que no deben romperse

- No migrar a Next.js.
- No copiar Daniel Sun ni Spencer Gabor.
- No convertir el portfolio en una grilla corporativa genérica.
- No reemplazar Network Free, Oswald o Montserrat sin autorización.
- No asumir que Network Free puede publicarse sin comprobar su licencia.
- No inventar clientes, campañas, proyectos, experiencia, fechas o datos personales.
- No inventar nombres ni cantidades de assets; leer los archivos reales.
- No deformar imágenes ni sacrificar sus proporciones para llenar un contenedor.
- No instalar dependencias, librerías de iconos o herramientas de optimización sin autorización.
- No modificar secciones ajenas cuando el pedido está limitado a un área concreta.
- No introducir nuevas animaciones si el pedido sólo solicita estilo o alineación.
- Mantener enlaces, anchors y rutas salvo pedido explícito.
- Mantener accesibilidad: HTML semántico, alt, focus visible, teclado, contraste y reduced motion.
- No dejar `markers: true`, triggers duplicados, animaciones sin cleanup ni pin-spacers huérfanos.
- No introducir overflow horizontal, clipping tipográfico o líneas que atraviesen títulos.
- Validar cambios visuales con Playwright antes de darlos por terminados.
- Preservar cambios existentes de la usuaria y evitar operaciones destructivas.

## 20. Estado actual y próximos pasos

### Implementado

- Aplicación Vite + React funcional.
- Header fijo bordó y navegación interna.
- Hero editorial con animación y reduced motion.
- Mis Trabajos con selector horizontal desktop y vertical responsive.
- Rutas individuales, lazy loading y Not Found.
- Rambla, Aqualand, Tardeo, Peumax, Desnac, Sistemas Móviles, Vectus, Maja y El Tori integrados en su orden definitivo con composiciones data-driven.
- Assets estandarizados con `carruseles/` separado de `posts/` y orden Stories → Posts → Carruseles → Videos → Catálogos.
- `CarouselPairs` agrupa cualquier cantidad de carruseles de a dos, sincroniza cantidades desiguales y centra el impar final.
- `VideoStack`, `MediaRows`, `SoundToggleButton` y `videoSound.js` mantienen autoplay muted, audio por interacción, exclusividad de sonido y capacidad `audioEnabled` por item.
- El enlace `Volver al portfolio` permanece fijo en todos los case studies.
- Tardeo incorpora ediciones, filas continuas de videos con audio selectivo y el componente común de stories; Rambla incorpora la presentación controlada `dualPhoneVideo` dentro de `StorySequence`.
- Aqualand incorpora `CatalogPair`; El Tori usa el estado genérico `comingSoon`.
- Sobre mí conserva el diseño público y obtiene perfil, servicios, habilidades e idiomas desde `portfolio_site_content/about`.
- Contacto completo con email, WhatsApp y SVG inline.
- Suite automatizada con 89 pruebas y cobertura de metadata, Storage, orden definitivo, navegación, medios, Admin, Sobre mí desde Database, permisos y audio ligado a visibilidad.
- Validación Playwright real de `/admin`, actualización/restauración pública de Sobre mí, Maja y Sistemas Móviles con media remota, audio y cleanup.
- Los 146 objetos inventariados del bucket público `portfolio-media` están verificados por tamaño y URL pública; los 28 videos pasan HTTP Range. El frontend sigue modelando 144 assets; los dos banners de Rambla permanecen en staging.
- Frontend migrado a rutas relativas mediante `portfolioMediaUrl()`.
- `/admin`: login Supabase, autorización por UUID, dashboard, create/update/delete de clientes y edición de Sobre mí, previews, drag & drop, reordenado, confirmación final, progreso y rollback. Oswald se limita a títulos y Montserrat al resto.
- Migrations aplicadas y versionadas de tablas, constraints, índices, helper de autorización, RLS de DB, policies de Storage, contenido del sitio y límite de 50 MiB.
- Fuente pública DB-first con fallback temporal de `clients.js` y transformación a los componentes actuales.
- Seed idempotente y seguro: inventario dry-run de 9 clientes, 21 secciones, 14 grupos y 135 items, más 9 covers.
- Las dos últimas copias locales de video fueron retiradas después de validar sus reemplazos; no quedan fallbacks runtime.

### En progreso

- Activación definitiva de clientes desde Database y retiro posterior del fallback temporal de metadata en `clients.js`.

### Pendiente

- Confirmar que Network Free/Networkand es la variante deseada y verificar su licencia para web.
- Definir textos alternativos finales con contexto suficiente para cada pieza.
- Incorporar videos reales si corresponde.
- Optimizar imágenes y definir formatos responsive sin instalar herramientas no autorizadas.
- Definir proveedor de hosting y configurar fallback SPA.
- Desactivar `Allow new users to sign up` y sign-ins anónimos en Supabase Dashboard.
- Tras verificar DB + Playwright con los nueve clientes, retirar el fallback temporal de `clients.js`.

### Próximo paso recomendado

Leer este archivo y luego pedir el contenido confirmado del siguiente cliente. Inspeccionar sus assets reales, actualizar primero los tests y el modelo de `src/data/clients.js`, reutilizar la arquitectura existente, adaptar la composición sólo si las proporciones lo justifican y cerrar con tests, lint, build y Playwright desktop/mobile.

## 21. Inconsistencias verificadas

- La indicación de que Playwright CLI está “instalado” no se refleja en `package.json`. La situación real y suficiente es que está disponible mediante `npx`; no debe añadirse como dependencia sin autorización.
- `public/iphone.png` permanece como asset UI local. Dentro de `public/portfolio/` no hay dependencias runtime ni fallbacks de clientes.
- Durante esta validación aparecieron dos banners de Rambla agregados en paralelo. El script existente los subió y quedaron incorporados al manifiesto remoto, pero no están modelados en el frontend; sus copias locales se preservan hasta que su incorporación sea confirmada.
- `--font-body` menciona Inter, pero no existe dependencia ni import de Inter; el fallback real es Arial/Helvetica.
- `PROJECT_PLAN.md` sigue siendo útil como registro anterior, pero `PROJECT_CONTEXT.md` debe prevalecer cuando ambos difieran porque fue contrastado con la implementación actual.

## 22. Actualización Admin, secciones personalizadas y Rambla

Esta sección prevalece sobre referencias anteriores a los banners como staging o a `profile`/`summary` como campos editables.

- `/admin` usa un sistema compartido y aislado: Oswald sólo en títulos principales (`h1`) y Montserrat en subtítulos, secciones, labels, campos, botones, mensajes, metadata, archivos y ayudas. Network Free no se usa en Admin.
- El recuadro de acceso usa `--admin-inline-padding` para aplicar el mismo padding izquierdo y derecho a todo el bloque, sin cambiar la alineación de texto, el borde ni su tamaño general.
- `Resumen` fue retirado del formulario, del draft, del payload, del mapper público, del fallback y del seed. La migration `20260811120000_custom_sections_rambla_admin_cleanup.sql` elimina la columna `portfolio_clients.summary` y redefine el RPC sin ese campo.
- `PERFIL / EXPERIENCIA` es un subtítulo estructural fijo de `About.jsx`; no se lee ni se escribe como contenido editable. La misma migration elimina `profile` del JSONB `portfolio_site_content/about` y actualiza su constraint.
- El Admin mantiene `sectionOrder` como lista explícita y persistida. Incluye las secciones estándar y claves `custom:<id>`; los controles Subir/Bajar permiten insertar una sección personalizada en cualquier posición.
- Una sección personalizada guarda nombre, orden, configuración y múltiples items dentro de `portfolio_sections` y `portfolio_media_items`. Usa `section_type = 'customMedia'`; las imágenes genéricas usan `media_kind = 'image'` y los videos conservan `media_kind = 'video'`.
- El límite sigue siendo 50 MiB por archivo. `FileDropzone` rechaza el lote antes del upload si algún archivo excede el máximo o no tiene un MIME permitido; no comprime.
- `buildClientPayload()` no serializa secciones directas ni grupos sin items activos. El RPC reemplaza en transacción la estructura anterior, por lo que las secciones que quedan vacías se eliminan de Database. `portfolioDatabase.js` y `ClientPage` vuelven a filtrar bloques sin rutas válidas: no se crea heading, wrapper, espacio ni ScrollTrigger.
- Rambla incorpora `Creación de marca` con orden 0, inmediatamente antes de Stories. Es una sección `customMedia` con `presentation = 'responsiveBanner'`, no una condición por cliente.
- Desktop/tablet grande usa `rambla/banners/banner_horizontal.jpeg` (1920×700, 168.916 bytes, `image/jpeg`). Mobile usa `rambla/banners/banner_vertical.png` (1122×1402, 1.852.231 bytes, `image/png`). Ambas rutas pertenecen al bucket público `portfolio-media` y fueron verificadas por objeto, tamaño y URL pública.
- `ResponsiveBrandBanner` usa `<picture>` para seleccionar una sola composición. GSAP + ScrollTrigger revela de izquierda a derecha desde 48rem y de abajo hacia arriba por debajo de 48rem, mientras escala 1.04 → 1. No usa pin, no agrega espacio, respeta reduced motion y se limpia mediante `useGSAP()` + `gsap.matchMedia()`.
- El manifiesto remoto contiene 146 objetos y `media:verify` confirma 146/146 accesibles. La migración de Storage es idempotente y omite ambos banners cuando su tamaño coincide.
- La migration de Database está versionada pero requiere aplicación remota antes de considerar habilitado el CRUD real de `customMedia`. Las copias locales de los dos banners se conservan hasta completar esa aplicación y Playwright desktop/mobile.
- Suite vigente: 96 tests en 11 archivos; lint y build pasan. El build conserva el warning informativo existente sobre el chunk principal mayor a 500 kB.
