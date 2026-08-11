# Portfolio Sol Fanara - Plan y estado del proyecto

Ultima actualizacion: 2026-08-11
Estado: los 144 assets modelados usan Supabase Storage sin fallbacks locales. Auth + Admin + Database están aplicados; Sobre mí se lee y edita desde Supabase Database.
Fuente de verdad operativa: `PROJECT_CONTEXT.md` prevalece si hay diferencias; este archivo resume plan, estado y proximos pasos.

## 1. Estado actual

- Aplicacion Vite + React funcional con rutas, estilos, animaciones, datos y tests.
- La carpeta pertenece al repositorio Git ubicado en el directorio padre.
- Se instalaron unicamente dependencias aprobadas y existe `package-lock.json`.
- Home, selector de Portfolio, paginas de cliente, Sobre mi, Contacto y Not Found estan implementados.
- `ClientPage` esta lazy-loaded mediante React Router.
- La suite automatizada cubre Admin, contenido público, RLS, media y animaciones.
- `npm run lint` pasa sin errores.
- `npm run build` pasa.
- Playwright CLI se usa mediante `npx --package @playwright/cli playwright-cli`; no esta agregado como dependencia del proyecto.
- Las capturas de validacion se guardan en `output/playwright/`.
- `/admin` está separado del portfolio, no ofrece signup y valida sesión más autorización por UUID antes de mostrar el dashboard.
- La fuente pública consulta Supabase Database primero y conserva `clients.js` sólo como fallback temporal de migración.
- El inventario modelado contiene 144 assets (116 imagenes y 28 videos), todos resueltos por Supabase Storage.
- Las nuevas versiones de Maja (29.869.127 bytes) y Sistemas Moviles (47.236.003 bytes) cumplen el máximo de 50 MiB y reemplazan los últimos fallbacks.

## 2. Objetivo

Crear un portfolio profesional para Sol Fanara, disenadora grafica y editora de video, con una identidad editorial, visual, moderna e interactiva.

La experiencia debe:

- poner piezas graficas, posts, stories, videos, campanas y clientes en primer plano;
- permitir descubrir clientes mediante una interaccion dinamica, no una grilla corporativa convencional;
- ofrecer rutas individuales para cada cliente;
- usar scroll y movimiento como recursos narrativos;
- funcionar en desktop, tablet, mobile y con `prefers-reduced-motion`;
- facilitar contacto directo por email y WhatsApp.

## 3. Stack y dependencias

Stack actual:

- Vite
- React
- JavaScript/JSX
- React Router
- GSAP
- ScrollTrigger
- `@gsap/react`
- Vitest + Testing Library + JSDOM
- ESLint
- Playwright CLI via `npx`
- Supabase JS para Storage remoto
- tus-js-client para uploads resumibles mayores a 6 MiB

Dependencias de aplicacion:

- `react`
- `react-dom`
- `react-router-dom`
- `gsap`
- `@gsap/react`
- `@fontsource/oswald`
- `@fontsource/montserrat`

Dependencias de desarrollo:

- `vite`
- `@vitejs/plugin-react`
- `eslint`
- `@eslint/js`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `globals`
- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `jsdom`

No instalar dependencias nuevas sin autorizacion previa.

## 4. Direccion visual vigente

- Identidad editorial de alto contraste: blanco, negro y bordo.
- Franja de navegacion bordo fija con `SF`, `PORTFOLIO`, `SOBRE MI` y `CONTACTO`.
- Grandes titulos display con Network Free.
- Metadata compacta en Oswald.
- Texto editorial y acciones principales en Montserrat.
- Movimiento aplicado a entrada, scroll y descubrimiento de piezas, no como decoracion gratuita.
- No usar gradientes genericos, sombras excesivas, dashboards, UI corporativa ni grillas de cards convencionales.

Tokens principales:

| Token | Valor | Uso |
|---|---:|---|
| `--color-ink` | `#080808` | Texto y fondos negros |
| `--color-wine` | `#781A34` | Navegacion y acento bordo |
| `--color-wine-deep` | `#3A0A18` | Fondos de cierre |
| `--color-paper` | `#F7F7F5` | Fondo claro general |
| `--color-proof` | `#A9A2A5` | Metadata secundaria |

## 5. Tipografias

- Display: `Network Free`, cargada desde `fonts/NetworkFreeVersion.ttf`.
- Todos sus títulos usan `.network-title`: kerning y ligaduras desactivados, tracking neutro y sin escalado horizontal para impedir superposición de letras.
- Utility: Oswald, cargada desde `@fontsource/oswald`.
- Profile/texto destacado: Montserrat, cargada desde `@fontsource/montserrat`.
- `--font-body` conserva fallback del sistema; Inter no esta instalado.

Pendiente: confirmar que `Network Free Version` es la variante deseada como Networkand y verificar licencia para publicacion web antes de despliegue publico.

## 6. Home / Hero

Estado vigente:

- Titulo exacto: `PORTFOLIO`.
- `SOL FANARA` en Oswald, alineado a la izquierda sobre el titulo.
- Fondo blanco puro.
- Sin bloque bordo detras del titulo.
- El titulo usa letras directas `.hero__letter`, sin wrappers por letra.
- Entrada de izquierda a derecha mediante `clip-path` expandido con variable CSS `--hero-title-reveal`.
- El area de clip se amplio fuera de los bounds del `h1` para que Network Free no corte trazos durante ni despues de la animacion.
- `prefers-reduced-motion: reduce` muestra el titulo directamente, sin mascara.
- ScrollTrigger `hero-compression` comprime/desplaza moderadamente el bloque del titulo al hacer scroll.

Validacion reciente:

- Hero probado con Playwright CLI en desktop, desktop angosto y mobile.
- Estados inicial/intermedio/final capturados.
- Sin clipping tipografico y sin overflow horizontal.

Capturas relevantes:

- `output/playwright/visual-fix-hero-first.png`
- `output/playwright/visual-fix-hero-mid.png`
- `output/playwright/visual-fix-hero-final.png`
- `output/playwright/visual-fix-narrow-hero.png`
- `output/playwright/visual-fix-mobile-hero.png`

## 7. Portfolio / Mis Trabajos

Estado vigente:

- Titulo visible: `MIS TRABAJOS`.
- Desktop: seccion pinned con track horizontal controlado por scroll vertical.
- Se anima el track interno, no el elemento fijado.
- Mobile, tablet y reduced motion: composicion vertical sin falso scroll horizontal.
- Previews cuadradas y consistentes por breakpoint.
- Cada preview enlaza a `/portfolio/:clientSlug`.
- Header de Portfolio esta en una capa superior (`z-index`) frente al track para que `MIS TRABAJOS` no sea tapado por cards/assets durante el recorrido horizontal.

Clientes visibles en el orden definitivo:

1. Rambla
2. Aqualand
3. Tardeo
4. Peumax
5. Desnac
6. Sistemas Móviles
7. Vectus
8. Maja
9. El Tori

`CLIENT_SLUG_ORDER` alimenta el selector y la navegación anterior/siguiente. No hay clientes pendientes, cards vacías ni placeholders visibles.

Validacion reciente:

- Recorrido horizontal probado con Playwright CLI en inicio, mitad y final pinned.
- `MIS TRABAJOS` permanece completo, incluida la `J`.
- Ninguna card queda por encima del titulo.
- Sin overflow horizontal.

Capturas relevantes:

- `output/playwright/visual-fix-portfolio-start.png`
- `output/playwright/visual-fix-portfolio-mid.png`
- `output/playwright/visual-fix-portfolio-end-pinned.png`
- `output/playwright/visual-fix-narrow-portfolio.png`
- `output/playwright/visual-fix-mobile-portfolio.png`

## 8. Clientes y case studies

La arquitectura se mantiene data-driven desde `src/data/clients.js`.

Modelo base:

```js
{
  slug,
  name,
  year,
  disciplines,
  summary,
  cover,
  projects,
  content
}
```

Tipos usados:

- `story`
- `post`
- `carouselSlide`
- `video`

Bloques de contenido usados:

- `storySequence`
- `postGrid`
- `carouselPairs`
- `videoStack`
- `catalogPair`
- `mediaRows` para la excepcion controlada de Tardeo

El orden estandar es Stories, Posts, Carruseles, Videos y Catalogos. Todos los posts preceden a todos los carruseles. `PORTFOLIO_CONTENT_GUIDE.md` es la fuente de verdad para formatos y assets.

No crear una pagina hardcodeada por cliente si el modelo de datos y los bloques reutilizables pueden representar el contenido.

## 9. Peumax

- Ruta: `/portfolio/peumax`.
- Disciplina: Repuestos de Automotores.
- Ano: 2024.
- Cover: `portfolio-media/peumax/logo.jpeg`.
- Stories: 8 archivos reales.
- Posts: 8 posts reales usados en el feed actual.
- Carruseles: dos carruseles bajo `portfolio-media/peumax/carruseles/`.
- Stories se muestran en un mockup de iPhone con secuencia pinned horizontal.
- Posts se muestran como piezas 4:5 sin telefono.
- Carruseles usan `CarouselPairs` y avanzan sincronizados dentro de un unico par.

## 10. Aqualand

- Ruta: `/portfolio/aqualand`.
- Disciplina: Venta de articulos varios.
- Ano: 2025.
- Cover: `portfolio-media/aqualand/logo.jpg`.
- Stories: 7 archivos reales.
- Posts: 4 archivos reales.
- Carruseles: dos carruseles bajo `portfolio-media/aqualand/carruseles/`.
- Usa la misma arquitectura que Peumax: stories, posts y carruseles segun datos.

## 10.1. Desnac

- Ruta: `/portfolio/desnac`.
- Ano: 2025. Disciplina: Empresa de Software.
- Assets reales: 7 stories, 6 posts, 4 carruseles y 3 videos.
- Usa `StorySequence`, posts por pares, dos secuencias `CarouselPairs` y `VideoStack`.
- El recorrido de `VideoStack` se deriva de la cantidad real y no deja huecos con cantidades impares.
- No contiene catalogos.
- No se encontro logo dentro del repositorio; la cover permanece sin inventar y usa el placeholder existente.

## 11. Vectus

- Ruta: `/portfolio/vectus`.
- Nombre: Vectus.
- Ano: 2025.
- Disciplina: Ciberseguridad.
- Cover real: `portfolio-media/vectus/logo.jpg`.

Nota: la solicitud mencionaba `logo.jpeg`, pero el archivo real inspeccionado en el proyecto es `logo.jpg`; se usa el asset existente para evitar una ruta rota.

Videos reales inspeccionados:

- `portfolio-media/vectus/videos/CONSEJOS.mp4`
- `portfolio-media/vectus/videos/Copia de riesgos vectus.mp4`
- `portfolio-media/vectus/videos/Copia de SUMMIT.mp4`
- `portfolio-media/vectus/videos/Copia de VECTUS S21.mp4`
- `portfolio-media/vectus/videos/Copia de webinar .mov`

Comportamiento:

- Vectus renderiza solo la seccion `VIDEOS`.
- No renderiza `Stories`, `Posts` ni `Carruseles` vacios.
- Usa el bloque reutilizable `videoStack`.
- Un solo video queda visible/activo por vez.
- La seccion usa pinning y movimiento vertical tipo Reels/TikTok.
- El video actual sale hacia arriba y el siguiente entra desde abajo.
- Los videos mantienen su ratio real 1080x1920.
- Videos con `muted`, `playsInline`, `loop` y `preload="metadata"`.
- La logica pausa videos no activos y reproduce solo el activo cuando el navegador lo permite.
- Todo video que sale del viewport se mutea y pausa inmediatamente mediante el observador reutilizable; al volver sólo puede retomar autoplay muted.
- El control SVG permite activar sonido tras interaccion y conserva la preferencia al cambiar de video.

Validacion reciente:

- Vectus probado desde Home, desde Aqualand por `Cliente siguiente`, y regreso a Aqualand por `Cliente anterior`.
- Se confirmo que solo hay 5 videos en DOM tras corregir duplicados.
- Se confirmo una unica reproduccion activa.
- Desktop, notebook angosta, tablet y mobile sin overflow horizontal.

Capturas relevantes:

- `output/playwright/vectus-video-active.png`
- `output/playwright/vectus-video-transition.png`
- `output/playwright/vectus-video-last.png`
- `output/playwright/vectus-mobile.png`

## 11.1. Tardeo y El Tori

- Tardeo conserva la ruta interna `/portfolio/rambla`, sus ediciones y sus assets actuales.
- Metadata confirmada de Tardeo: 2026, Eventos/Entretenimiento.
- `MediaRows` mantiene los loops visuales e incorpora el control de sonido compartido con exclusividad de audio.
- Metadata confirmada de El Tori: 2026, Restobar.
- El Tori conserva `comingSoon: true` y su case study muestra solo `Proximamente`.

## 12. Navegacion entre clientes y GSAP

Bug corregido:

- Al navegar de un cliente a otro con `Cliente anterior` o `Cliente siguiente`, React reutilizaba la ruta `/portfolio/:clientSlug` y las animaciones/ScrollTriggers no se reinicializaban correctamente.

Solucion vigente:

- `useCaseStudyMotion(client.slug)` depende del slug.
- `useGSAP()` usa `dependencies: [clientSlug]`, `scope` y `revertOnUpdate: true`.
- Al cambiar de cliente se resetea scroll a top.
- Se revierte el contexto anterior.
- Se pausa cualquier video al limpiar.
- Se ejecuta `ScrollTrigger.refresh()` despues del cambio de DOM.
- La solucion es general para clientes actuales y futuros.
- El unico enlace `Volver al portfolio` permanece fixed durante todo el case study.

Validacion reciente:

- `Home -> Peumax -> Cliente siguiente -> Aqualand`.
- Scroll de posts de Aqualand tras navegar desde Peumax.
- `Aqualand -> Cliente siguiente -> Vectus`.
- Scroll de videos de Vectus.
- `Vectus -> Cliente anterior -> Aqualand`.
- Scroll de posts de Aqualand tras volver desde Vectus.
- Consola sin errores ni warnings.

## 13. Sobre mi

Contenido vigente:

- Fotografia real: `public/fotografia_personal.jpeg`.
- Bloques: Diseno Grafico, Edicion de Video, Habilidades clave, Habilidades tecnicas e Idiomas.
- Montserrat se usa en descripciones, habilidades clave e idiomas.
- Oswald se usa en labels y metadata.
- Reveals discretos con `useSectionReveal`.
- Reduced motion deja todo visible.
- Los textos provienen de `portfolio_site_content/about`; el diseño público no cambia.
- `/admin` permite editar perfil, Diseño Gráfico, Edición de Video, habilidades clave, habilidades técnicas e idiomas, con orden local y guardado explícito.
- RLS permite lectura pública y restringe `UPDATE(content)` a UUIDs autorizados en `portfolio_admins`.

## 14. Contacto

Datos vigentes:

- Email: `fanaraasol@gmail.com`.
- Link: `mailto:fanaraasol@gmail.com`.
- WhatsApp: `https://wa.me/qr/IHDR4VMNADPMI1`.
- Texto visible: `Escribir por Whatsapp`.

Diseño vigente:

- Iconos SVG inline para email y WhatsApp.
- Ambos enlaces usan Montserrat, mismo tamano de texto e icono.
- No existe label separado `EMAIL`.
- WhatsApp abre en nueva pestana con `rel="noopener noreferrer"`.

## 15. Responsive y reduced motion

Desktop:

- Hero de gran escala.
- Portfolio pinned horizontal desde 64 rem.
- Case studies con composiciones scroll-driven.
- Videos Vectus con stack pinned.

Tablet/mobile:

- Portfolio vertical sin pinning.
- Case studies vuelven a flujo vertical cuando corresponde.
- Videos conservan la idea de un video por vez con recorrido vertical.
- No debe haber overflow horizontal.

Reduced motion:

- Sin scrub, pinning ni parallax.
- Contenido esencial siempre visible.
- Hero sin mascara animada.
- Portfolio en composicion estatica/vertical.

## 16. Performance

Reglas vigentes:

- Mantener scroll nativo.
- No agregar smooth scroll.
- Priorizar `transform` y `opacity`.
- Usar `will-change` solo en elementos animados.
- Imagens con `loading="lazy"` y `decoding="async"` donde corresponde.
- Medios con dimensiones o aspect ratio definidos.
- Videos Vectus usan `preload="metadata"` para equilibrar autoplay/experiencia.
- No instalar herramientas de optimizacion sin autorizacion.

Pendiente:

- Optimizar imagenes en WebP/AVIF o `srcset` cuando se defina flujo autorizado.
- Revisar licencia y eventual conversion de Network Free a WOFF2 si se autoriza.

## 17. Tests y validacion

Suite actual:

- Archivo: `src/test/app.test.jsx`.
- Setup: `src/test/setup.js`.
- Estado: 89 tests aprobados en 11 archivos.

Cobertura destacada:

- Home y secciones principales.
- Divisores y titulos.
- Hero sin wrappers de clipping por letra.
- Reglas anti-regresion para mascara expandida de Hero.
- Reglas anti-regresion para layer de `MIS TRABAJOS` sobre el rail.
- Metadata y previews de Peumax, Aqualand, Desnac, Vectus, Tardeo y El Tori.
- Navegacion SPA entre clientes.
- Case studies data-driven.
- Orden estandar, stories, posts, pares de carruseles, catalogos y videoStack con sonido.
- Vectus sin secciones vacias y sin videos duplicados.
- Not Found.
- Contacto y links.

Comandos obligatorios antes de cerrar cambios:

```powershell
npm test
npm run lint
npm run build
```

Playwright CLI debe usarse para cambios visuales o de ScrollTrigger. JSDOM no valida layout real, pinning ni clipping tipografico.

Validacion de esta iteracion:

- Desktop 1440x900, notebook 1024x768, tablet 768x1024 y mobile 390x844.
- `MIS TRABAJOS` muestra exactamente los nueve clientes en el orden definitivo y la navegación anterior/siguiente recorre y cierra esa misma secuencia.
- Network Free usa tracking neutro sin kerning: 0 pares solapados por línea, sin clipping ni overflow en los cuatro viewports.
- La separación mínima medida entre `MIS TRABAJOS` y previews fue 100.7 px en desktop, 109.9 px en notebook, 67.8 px en tablet y 56 px en mobile; no hubo contactos durante el rail.
- Desnac renderiza 7 stories, 6 posts, cuatro carruseles agrupados en dos pares y 3 videos 1080x1920, sin huecos ni placeholders.
- Audio: un video visible puede quedar audible; al salir por arriba o abajo queda muted y pausado, el control vuelve a off y no recupera sonido automáticamente al regresar. Nunca se detectó más de una fuente audible.
- Cleanup SPA Desnac → Sistemas Móviles: 0 triggers sobre nodos desconectados, 0 sources residuales de Desnac y 0 audios activos.
- Reduced motion: 0 ScrollTriggers, 0 pin-spacers, tres videos accesibles y muted, y 0 overflow horizontal.
- Assets modelados: 144 rutas físicas verificadas, 0 faltantes.
- Consola: 0 errores y 0 warnings. Requests HTTP 4xx/5xx: 0.

## 18. Estructura relevante

```text
src/
  animations/
    gsap.js
    useHeroMotion.js
    usePortfolioRail.js
    useCaseStudyMotion.js
    useSectionReveal.js
  app/
    App.jsx
    router.jsx
  components/
    media/
      CarouselPairs.jsx
      CatalogPair.jsx
      MediaRows.jsx
      ProjectMedia.jsx
      SoundToggleButton.jsx
      StorySequence.jsx
      VideoStack.jsx
      videoSound.js
    navigation/
      ScrollToHash.jsx
      SiteNavigation.jsx
  data/
    clients.js
    contact.js
  pages/
    ClientPage.jsx
    HomePage.jsx
    NotFoundPage.jsx
  sections/
    About.jsx
    Contact.jsx
    Hero.jsx
    PortfolioRail.jsx
  styles/
    about.css
    case-study.css
    contact.css
    global.css
    hero.css
    motion.css
    navigation.css
    portfolio.css
    tokens.css
  test/
    app.test.jsx
    setup.js
```

Assets relevantes:

```text
fonts/NetworkFreeVersion.ttf
public/fotografia_personal.jpeg
public/iphone.png
scripts/portfolio-media-manifest.json
PORTFOLIO_CONTENT_GUIDE.md
```

## 19. Restricciones

- No migrar a Next.js.
- No copiar Daniel Sun ni Spencer Gabor.
- No convertir el portfolio en dashboard o grilla corporativa generica.
- No reemplazar tipografias sin autorizacion.
- No inventar clientes, datos, fechas, campanas ni assets.
- Leer archivos reales antes de agregarlos al modelo.
- No instalar dependencias sin preguntar.
- Cuando se arregle un bug, escribir primero el test si es representable.
- No modificar secciones ajenas al pedido salvo necesidad tecnica directa.
- No dejar `markers: true`.
- No crear ScrollTriggers sin cleanup.
- No provocar overflow horizontal.
- No cortar tipografia por wrappers, mascaras o `clip-path`.
- Validar cambios visuales con Playwright CLI antes de cerrarlos.

## 20. Pendientes

### Panel administrativo y Database

- [x] Crear migrations relacionales para clientes, ediciones, secciones, grupos e items.
- [x] Crear `portfolio_admins` y helper `private.is_portfolio_admin()` basado en `auth.uid()`.
- [x] Habilitar RLS: lectura pública sólo de publicados y escritura sólo del admin.
- [x] Crear policies de Storage exclusivas del admin y acotadas al `storage_prefix` del cliente.
- [x] Configurar el bucket público con límite de 50 MiB y MIME permitidos.
- [x] Implementar login, logout, protección neutral de ruta y `noindex, nofollow`.
- [x] Implementar create/update/delete, cambios pendientes, previews, drag & drop, grupos, audio y progreso.
- [x] Crear `admin_replace_portfolio_client()` para el commit transaccional de metadata.
- [x] Crear seed dry-run/apply para los nueve clientes y todas sus excepciones.
- [x] Aplicar migrations en el Supabase real y verificar tablas/filas remotas.
- [x] Verificar que existe el UUID administrador registrado en `portfolio_admins`.
- [ ] Desactivar signup y acceso anónimo en Supabase Dashboard.
- [ ] Ejecutar `npm run db:seed -- --apply` con credenciales server-only.
- [ ] Activar `VITE_PORTFOLIO_DATABASE_ENABLED=true` sólo después del seed verificado.
- [x] Ejecutar el flujo real de edición de Sobre mí con un admin temporal, restaurar el texto y eliminar usuario/fila temporales.
- [ ] Verificar los nueve case studies desde DB y retirar el fallback de `clients.js`.
- [x] Crear `portfolio_site_content`, seed exacto, constraints, grants, RLS y policies de lectura pública/escritura administrativa.
- [x] Implementar `EDITAR SOBRE MÍ` con estado local, guardado único, error reintentable y confirmación.
- [x] Aplicar Oswald a títulos de `/admin` y Montserrat al resto mediante estilos compartidos; excluir Network Free.

### Migracion a Supabase Storage

- [x] Inspeccionar completamente `public/portfolio/`: 144 assets, 778.911 MiB, 116 imagenes y 28 videos.
- [x] Inspeccionar los reemplazos reales: Maja 29.869.127 bytes `video/quicktime`; Sistemas Moviles 47.236.003 bytes `video/mp4`; ambos dentro de 50 MiB.
- [x] Instalar `@supabase/supabase-js` y `tus-js-client` sin instalar CLI ni Docker.
- [x] Crear `src/lib/portfolioMedia.js`, scripts de inspeccion/migracion/verificacion, `.env.example` y protecciones de Git.
- [x] Implementar TUS con chunks de 6 MiB, progreso, reintentos y reanudacion persistente.
- [x] Usar credenciales reales con `SUPABASE_SECRET_KEY` exclusivamente en scripts locales y variables `VITE_*` publicas en frontend.
- [x] Reutilizar y verificar como publico el bucket `portfolio-media`.
- [x] Aplicar el limite Free: subir archivos de hasta 50 MiB y registrar los mayores como `SKIPPED_SIZE_LIMIT` sin fallo fatal.
- [x] Ejecutar la migracion idempotente de los dos reemplazos con los scripts existentes y 0 fallidos.
- [x] Verificar ambos por ruta, tamaño, URL pública, reproducción y HTTP Range.
- [x] Versionar el manifiesto original de 144 assets para permitir verificaciones posteriores a la limpieza.
- [x] Cambiar `clients.js` a rutas relativas y activar `portfolioMediaUrl()` en todos los consumidores.
- [x] Validar Maja y Sistemas Moviles con Playwright: origen Supabase, reproducción, transición, audio, salida de viewport y ausencia de 404/fallback local.
- [x] Ejecutar tests, lint y build finales y comprobar que el bundle no contiene secretos.
- [x] Eliminar las 142 copias locales migradas anteriormente.
- [x] Retirar el mapa especial de `portfolioMediaUrl()`; todos los assets modelados usan Storage.
- [x] Eliminar las dos copias locales nuevas después del último pase de tests, lint, build y Playwright.

- Confirmar Network Free/Networkand y licencia web.
- Incorporar `desnac/logo.jpeg` en Storage cuando se reciba el asset real.
- Incorporar assets reales futuros leyendo nombres y dimensiones reales.
- Redactar textos alternativos finales con contexto confirmado.
- Optimizar medios cuando se defina herramienta/proceso autorizado.
- Definir proveedor de hosting.
- Configurar fallback SPA hacia `index.html` para rutas profundas.

## 21. Proximo paso recomendado

Completar la activación de clientes desde Database y retirar el fallback temporal de metadata en `clients.js` después de verificar los nueve case studies. El límite de `/admin` continúa en 50 MiB por archivo y no se comprime automáticamente.

## 22. Iteración actual — Admin, custom sections y Rambla

- [x] Consolidar Oswald en títulos principales y Montserrat en el resto de `/admin`.
- [x] Hacer simétrico el padding interno del recuadro de acceso sin centrar el texto.
- [x] Retirar `Resumen` del Admin, contratos, seed y frontend.
- [x] Fijar `PERFIL / EXPERIENCIA` en el portfolio y retirarlo del editor.
- [x] Crear secciones personalizadas con nombre, carga múltiple y orden explícito.
- [x] Omitir y limpiar secciones sin items activos en payload, mapper y render.
- [x] Modelar `Creación de marca` antes de Stories sin condicionar por slug.
- [x] Integrar banner horizontal 1920×700 y vertical 1122×1402 mediante `<picture>`.
- [x] Implementar reveal GSAP con scrub, escala 1.04 → 1, dirección responsive, reduced motion y cleanup.
- [x] Verificar Storage: 146/146 objetos, 0 fallos; ambos banners remotos coinciden en ruta y tamaño.
- [x] Crear `20260811120000_custom_sections_rambla_admin_cleanup.sql` sin modificar migrations aplicadas.
- [x] Ejecutar 96/96 tests, lint y build.
- [ ] Aplicar la nueva migration al proyecto remoto mediante SQL Editor autenticado o Management API/CLI autorizada.
- [ ] Ejecutar Playwright CLI en desktop, laptop, tablet, mobile y navegación SPA. Requiere autorizar la descarga temporal de `@playwright/cli` en esta sesión.
- [ ] Retirar las dos copias locales sólo después de los dos puntos anteriores y una verificación final de Storage.
