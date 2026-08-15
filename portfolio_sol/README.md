# Interactive Design Portfolio

Portfolio profesional e interactivo de Sol Fanara, diseñadora gráfica y editora de video. El sitio presenta una selección de trabajos organizados por cliente mediante una experiencia editorial, visual y responsive en la que las piezas gráficas, campañas y videos son el contenido principal.

Además del sitio público, incluye un panel privado en `/admin` para administrar clientes, proyectos, medios, ediciones y el contenido de la sección “Sobre mí”.

## Funcionalidad principal

La página pública se divide en cuatro secciones:

1. **Hero:** presentación de Sol Fanara y del portfolio.
2. **Mis trabajos:** recorrido por los clientes y acceso a sus casos de estudio.
3. **Sobre mí:** perfil, servicios, habilidades e idiomas.
4. **Contacto:** enlaces directos a Gmail y WhatsApp.

Cada cliente dispone de una ruta independiente:

```text
/portfolio/:clientSlug
```

Los casos de estudio se construyen dinámicamente a partir de bloques reutilizables:

- Stories.
- Posts.
- Carruseles.
- Videos.
- Catálogos.
- Filas de medios.
- Banners responsive.
- Secciones multimedia personalizadas.
- Ediciones internas de un mismo evento o cliente.

El sistema omite automáticamente las secciones vacías. Cuando un cliente o una edición no tiene medios renderizables, muestra el estado “Próximamente”.

La navegación entre clientes es circular: cada caso de estudio ofrece accesos al cliente anterior, al siguiente y al portfolio principal.

## Rutas

| Ruta | Función |
|---|---|
| `/` | Página principal completa |
| `/portfolio/:clientSlug` | Caso de estudio de un cliente |
| `/portfolio` | Redirección a la sección “Mis trabajos” |
| `/sobre-mi` | Redirección a la sección “Sobre mí” |
| `/contacto` | Redirección a la sección de contacto |
| `/admin` | Panel administrativo privado |
| Cualquier otra ruta | Página de error 404 |

React Router controla la navegación como una SPA. Las páginas de cliente y administración se cargan con `React.lazy()` para evitar incluirlas inmediatamente en el paquete inicial.

El despliegue está preparado para Vercel mediante una reescritura de todas las rutas hacia `index.html`, permitiendo recargar directamente rutas como `/portfolio/rambla` o `/admin`.

## Arquitectura y lógica de datos

La aplicación se encuentra en el directorio `portfolio_sol/` y utiliza una arquitectura basada en componentes de React:

```text
portfolio_sol/
├── scripts/                 # Migración, inventario y verificación de medios
├── supabase/migrations/     # Esquema, funciones y políticas de Supabase
├── src/
│   ├── admin/               # Panel administrativo y servicios de escritura
│   ├── animations/          # Hooks y configuración de GSAP
│   ├── app/                 # Router y layout principal
│   ├── components/          # Navegación, tipografía y presentaciones multimedia
│   ├── data/                # Catálogo, consultas y transformación de datos
│   ├── lib/                 # Cliente de Supabase y URLs de Storage
│   ├── pages/               # Home, casos de estudio y 404
│   ├── sections/            # Hero, portfolio, perfil y contacto
│   ├── styles/              # CSS global y estilos por sección
│   └── test/                # Pruebas de integración
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

### Carga del portfolio

`PortfolioDataProvider` centraliza los datos públicos.

Cuando la variable `VITE_PORTFOLIO_DATABASE_ENABLED` vale `true`, consulta en Supabase los clientes publicados y transforma las filas relacionales al modelo de componentes utilizado por React.

Si la consulta no está habilitada o no devuelve clientes, se conserva un catálogo local en `src/data/clients.js` como fallback temporal.

La sección “Sobre mí” se consulta desde la tabla `portfolio_site_content`. Si la consulta falla, el error se registra y no se sustituuye silenciosamente por contenido hardcodeado.

### Renderizado de casos de estudio

`ClientPage` identifica al cliente por su `slug` y selecciona el componente apropiado para cada tipo de sección. Esta arquitectura evita crear una página diferente para cada cliente.

Los principales bloques son:

- `StorySequence`: stories dentro de presentaciones tipo teléfono.
- `CarouselPairs`: pares de carruseles con slides sincronizados.
- `VideoStack`: videos superpuestos que cambian durante el scroll.
- `CatalogPair`: catálogos con transición de páginas.
- `MediaRows`: filas horizontales de piezas audiovisuales.
- `ResponsiveBrandBanner`: banner horizontal o vertical según el viewport.
- `ProjectMedia`: presentación genérica de imágenes y videos.

Las rutas de los medios se guardan como rutas relativas. `portfolioMediaUrl()` las valida, codifica cada segmento y construye la URL pública de Supabase Storage. No se aceptan segmentos vacíos, `.` ni `..`.

### Gestión de video y sonido

Los videos se reproducen inicialmente silenciados para respetar las políticas de autoplay del navegador.

Un `IntersectionObserver` detecta si cada video está dentro del viewport. Cuando sale completamente:

- Se silencia.
- Se pausa.
- Libera el estado de audio activo.

Sólo un bloque puede reclamar el sonido a la vez. Al cambiar el video activo se exige una nueva interacción del usuario para volver a habilitarlo.

## Diseño visual

El diseño está construido con CSS propio, sin librerías de componentes, iconos o sistemas de UI externos.

La dirección visual es editorial y de alto contraste:

- Fondo claro y secciones oscuras.
- Bordó como color estructural.
- Títulos display sobredimensionados.
- Metadata compacta.
- Composiciones asimétricas.
- Uso amplio de espacio negativo.
- Imágenes y videos como protagonistas.

Los principales tokens son:

| Token | Valor | Uso |
|---|---|---|
| `--color-ink` | `#080808` | Texto y fondos negros |
| `--color-wine` | `#781a34` | Navegación y acentos |
| `--color-wine-deep` | `#3a0a18` | Fondo de contacto |
| `--color-paper` | `#f7f7f5` | Fondo general |
| `--color-proof` | `#a9a2a5` | Metadata secundaria |

Se utilizan CSS Grid, Flexbox, `clamp()`, relaciones de aspecto, variables CSS y breakpoints específicos para adaptar las composiciones.

### Tipografías

- **Network Free:** títulos display del portfolio.
- **Oswald:** navegación, labels y metadata.
- **Montserrat:** textos de perfil y elementos del panel administrativo.
- **Arial/Helvetica:** fallback del cuerpo general.

La fuente Network Free se carga localmente desde `fonts/NetworkFreeVersion.ttf`. Oswald y Montserrat se empaquetan mediante Fontsource.

## Animaciones

Las animaciones utilizan:

- **GSAP 3**
- **ScrollTrigger**
- **`@gsap/react`**
- Transforms y opacidad en CSS

Entre los comportamientos principales se encuentran:

- Entrada animada del Hero.
- Compresión del título durante el scroll.
- Rail horizontal de clientes con pinning en escritorio.
- Recorrido vertical accesible en tablet y móvil.
- Revelado progresivo de secciones.
- Entrada alternada de posts.
- Stories presentadas dentro de mockups de teléfono.
- Videos apilados y controlados por scroll.
- Carruseles sincronizados.
- Cambio de páginas de catálogos mediante rotación 3D.
- Revelado de banners mediante `clip-path`.

Las animaciones se encapsulan en hooks y componentes. `useGSAP()` proporciona scope y cleanup cuando se desmonta una página.

`gsap.matchMedia()` adapta el movimiento a cada breakpoint. Si el usuario tiene activado `prefers-reduced-motion: reduce`, se desactivan el pinning y las animaciones no esenciales.

## Base de datos y almacenamiento

El backend utiliza **Supabase**, que proporciona:

- PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Row Level Security.
- Funciones RPC de PostgreSQL.

### Tablas

| Tabla | Responsabilidad |
|---|---|
| `portfolio_admins` | Usuarios autorizados para administrar |
| `portfolio_clients` | Metadata, orden y publicación de clientes |
| `portfolio_editions` | Ediciones internas de un cliente |
| `portfolio_sections` | Secciones reutilizables de contenido |
| `portfolio_media_groups` | Carruseles, catálogos, filas y companions |
| `portfolio_media_items` | Imágenes, videos y metadata de medios |
| `portfolio_site_content` | Contenido editorial general, como “Sobre mí” |

Las tablas utilizan UUID, claves foráneas con eliminación en cascada, restricciones de formato, orden explícito y campos JSONB para configuraciones visuales que no justifican nuevas columnas.

Las migraciones se encuentran versionadas en `supabase/migrations/`.

### Supabase Storage

Los medios se almacenan en el bucket público:

```text
portfolio-media
```

Los objetos se organizan bajo el prefijo estable de cada cliente:

```text
<storage_prefix>/stories/
<storage_prefix>/posts/
<storage_prefix>/videos/
<storage_prefix>/carruseles/
<storage_prefix>/catalogos/
<storage_prefix>/banners/
<storage_prefix>/ediciones/
```

El bucket tiene un límite de 50 MiB por archivo. Los scripts de mantenimiento pueden realizar uploads estándar o resumibles mediante TUS para archivos mayores a 6 MiB.

## Panel privado `/admin`

`/admin` es una aplicación administrativa separada visualmente del sitio público.

Un visitante sin sesión sólo puede ver el formulario de acceso. Para entrar al dashboard se requieren dos condiciones:

1. Una sesión válida de Supabase Auth.
2. Que el UUID del usuario exista en `portfolio_admins`.

Si la cuenta está autenticada pero no autorizada, la aplicación cierra la sesión y vuelve al login.

El dashboard permite:

- Crear clientes.
- Modificar clientes.
- Eliminar clientes.
- Reordenar clientes.
- Editar la sección “Sobre mí”.
- Crear múltiples ediciones.
- Añadir, quitar y ordenar secciones.
- Añadir stories, posts, carruseles, videos y catálogos.
- Crear banners desktop/mobile.
- Crear secciones multimedia personalizadas.
- Ordenar archivos dentro de cada sección.
- Configurar si un video puede utilizar audio.
- Sustituir o eliminar logos y medios existentes.

Los nuevos clientes se crean inicialmente como no publicados mientras se suben sus archivos. Al completarse correctamente la sincronización final, se guarda su contenido y se activa su publicación.

### Validación de archivos

El administrador acepta:

- Imágenes JPEG, PNG y WebP.
- Videos MP4 H.264.
- Archivos de hasta 50 MiB.

Los videos se inspeccionan internamente para validar:

- Contenedor MP4 real.
- Codec H.264.
- Ausencia de HEVC.
- Audio compatible.
- Configuración Fast Start.

Cuando un MP4 H.264 válido no tiene Fast Start, el navegador intenta mover la metadata `moov` antes de los datos `mdat` y corregir los offsets sin recodificar el video.

### Guardado y eliminación

Los archivos nuevos se suben primero con nombres normalizados y tokens únicos. Después, una función RPC sincroniza las tablas relacionales.

Si el guardado falla antes del commit, el servicio intenta eliminar los archivos recién subidos y borrar cualquier cliente provisional.

La eliminación de un cliente requiere escribir su nombre en mayúsculas como confirmación. El proceso oculta primero el cliente, elimina únicamente los objetos que pertenecen a su prefijo y finalmente borra la metadata mediante una RPC que normaliza el orden restante.

## Seguridad

La seguridad efectiva se encuentra principalmente en Supabase, no sólo en la interfaz.

### Autenticación y autorización

- Supabase Auth gestiona email, contraseña y sesión.
- El frontend utiliza exclusivamente una publishable key.
- Las credenciales secretas de migración no se leen desde variables `VITE_*`.
- `portfolio_admins` funciona como lista explícita de usuarios autorizados.
- La autorización se vuelve a comprobar en las políticas y funciones de la base de datos.

### Row Level Security

RLS está habilitado en todas las tablas del portfolio.

Las reglas principales son:

- Los visitantes anónimos sólo pueden leer clientes publicados y sus relaciones.
- Los usuarios autenticados sin autorización administrativa no pueden escribir.
- Sólo los administradores pueden crear, modificar o eliminar contenido.
- Cada RPC administrativa comprueba `private.is_portfolio_admin()`.
- Las funciones utilizan un `search_path` fijo y permisos de ejecución explícitos.

### Seguridad de Storage

- Las lecturas del bucket son públicas porque los medios forman parte del portfolio.
- Las escrituras requieren un usuario autenticado y autorizado.
- El primer segmento de la ruta debe coincidir con el `storage_prefix` de un cliente existente.
- El servicio también valida que una eliminación permanezca dentro del prefijo seleccionado.
- Se rechazan slugs y rutas inseguras.
- Los uploads no sobrescriben archivos existentes (`upsert: false`).

### Otras medidas

- `/admin` añade `noindex, nofollow`; esto evita indexación, pero no reemplaza la autenticación.
- Las credenciales incorrectas muestran un mensaje genérico.
- Las operaciones destructivas requieren confirmación explícita.
- Los enlaces externos utilizan `noopener noreferrer`.
- Existen enlaces de salto, estados de foco, HTML semántico, tabs accesibles y soporte para movimiento reducido.

El repositorio no implementa middleware HTTP propio para ocultar `/admin`, Content Security Policy, MFA ni rate limiting personalizado. La protección de datos y escrituras depende de Supabase Auth, la lista de administradores, RLS y las políticas de Storage.

## Variables de entorno

Variables públicas utilizadas por Vite:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
VITE_SUPABASE_STORAGE_BUCKET=portfolio-media
VITE_PORTFOLIO_DATABASE_ENABLED=true
```

Herramientas locales de migración:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=<server-only-secret>
VITE_SUPABASE_STORAGE_BUCKET=portfolio-media
```

`SUPABASE_SECRET_KEY` debe permanecer en un entorno local o servidor seguro y nunca debe llevar el prefijo `VITE_`.

## Desarrollo

La aplicación requiere Node.js y npm.

```bash
cd portfolio_sol
npm install
npm run dev
```

Comandos disponibles:

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run preview      # Vista previa del build
npm run lint         # ESLint
npm test             # Tests con Vitest
npm run test:watch   # Tests en modo watch
npm run db:seed      # Migración del catálogo a la base de datos
npm run media:inspect
npm run media:manifest
npm run media:migrate
npm run media:verify
```

## Calidad y pruebas

El proyecto utiliza:

- Vitest.
- Testing Library.
- jest-dom.
- JSDOM.
- ESLint.
- Playwright CLI.

Las pruebas cubren rutas, componentes públicos, accesibilidad, comportamiento responsive, audio y video, transformación de datos, panel administrativo, validación de archivos, rollback, políticas de Storage, migraciones SQL y prevención de credenciales secretas dentro del frontend.