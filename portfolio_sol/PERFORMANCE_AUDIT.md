# Auditoría de carga de imágenes y videos

Fecha: 5 de octubre de 2026. Sitio público: https://solfanara.com. Código medido: versión previa publicada y build local con estos cambios. No se desplegó ni se modificaron datos de producción.

## Método y alcance

Se inspeccionaron `/`, `/portfolio`, Rambla, Tardeo, Aqualand, Vectus y Peumax (cliente con muchas imágenes) en Chromium, con Network del navegador y caché del navegador desactivada. Se midieron 1440 × 900, 390 × 844 y, para Rambla, 375 × 667. El recorrido incluyó entrada, espera de 3,5 s, salto a las secciones y comprobación de medios visibles. También se recorrieron completamente las secciones fijadas de Aqualand y Rambla: terminaron con todas las imágenes solicitadas y sin errores de página. Se contrastó el baseline de un build de `HEAD` con el build modificado, ambos conectados a los mismos datos publicados de Supabase, y se hizo una pasada independiente por `solfanara.com`.

Los valores son **una muestra por ruta**, con la red real disponible desde este equipo en Argentina y sin estrangulación simulada; sirven para identificar causas y dirección del cambio, no como percentiles de usuarios. La métrica «MiB a 3,5 s» suma bytes recibidos hasta ese instante; en MP4 varía con la reproducción, las solicitudes Range y la velocidad de la red. LCP suele ser texto de introducción y no demuestra que un video o toda una galería estén listos. La caché desactivada hace que la comparación de primera visita sea consistente, pero no mide visitas repetidas.

## Diagnóstico

- El inventario publicado contiene **140 imágenes, 100,5 MiB**, y **30 videos, 415,6 MiB** (170 rutas únicas; las referencias repetidas se cuentan una sola vez). Algunas imágenes individuales pesan más de 2 MiB; varios MP4 verticales superan los 20 MiB y 6 Mb/s. El tamaño original sigue siendo el principal límite de las piezas históricas.
- Los carruseles y secuencias montaban `src` de imágenes lejanas antes de llegar al panel correspondiente. En Aqualand se pidieron 36 imágenes durante el recorrido medido, aunque el usuario solo veía una parte cada vez.
- Mientras llegaba la respuesta de Supabase, la página empezaba a reproducir videos del contenido de respaldo; el reemplazo posterior reiniciaba medios. En Tardeo se observaron 15 solicitudes MP4 en el baseline de video y varias cancelaciones.
- En el sitio desplegado, `index.html` y los assets versionados de `/assets/` devolvían `Cache-Control: public, max-age=0, must-revalidate`. Es correcto revalidar el HTML, pero los JS, CSS y fuentes con hash pueden conservarse un año. La fuente Network Free ocupa 462,78 kB y se carga una vez; Montserrat y Oswald en WOFF2 suman aproximadamente 44 kB para las variantes utilizadas. El JS principal sigue ocupando aproximadamente 199,7 kB gzip, sin cambio material por esta intervención.
- Las imágenes de Supabase observadas con **GET del navegador** tienen `public, max-age=31536000` y `cf-cache-status: HIT` en los ejemplos publicados. Una subida reciente del administrador tenía una hora de caché. Las respuestas **206 Range de video** observadas mostraron `no-cache` para el navegador, aunque Cloudflare registró `HIT`; esto no se corrige cambiando la política de Vercel. Las respuestas HEAD aisladas del Storage mostraron `no-cache`, por lo que se usaron GET reales para concluir sobre caché de imágenes.
- El endpoint `/storage/v1/render/image/...` respondió `403 FeatureNotEnabled` en el proyecto. Las transformaciones de imagen de Supabase requieren un plan que las incluya; no se apoyó la solución en ese servicio. Referencias: [transformaciones de imágenes de Supabase](https://supabase.com/docs/guides/storage/serving/image-transformations), [precios de Supabase](https://supabase.com/pricing) y [caché de Vercel](https://vercel.com/docs/caching/cache-control-headers).

## Diez imágenes más pesadas

Tamaños de `Content-Length` y dimensiones del inventario publicado. La columna «pedido anterior» describe el comportamiento original: las dos primeras imágenes de una secuencia o carrusel se pedían al entrar en la ruta; las demás, al iniciar la sección o su carga diferida. La edición 2 de Tardeo requiere seleccionarla y no formó parte del recorrido de tiempos; aquí se informa inventario y punto de solicitud, no una latencia inventada. `MiB` significa 1 048 576 bytes.

| # | Cliente / bloque | Ruta de Storage | Formato / px | MiB | Pedido anterior y causa |
|---|---|---|---|---:|---|
| 1 | El Tori / stories | `tori/stories/a2cc548c-0aa0-4dd0-a5cf-7116b24ed061-historias-tori-3.jpg` | JPEG 1080×1920 | 2,11 | Al montar la secuencia; original completo sin variante. |
| 2 | Tardeo / edición 2 stories | `tardeo/ediciones/edicion-2/stories/337c1015-8af8-49b5-bc90-f02a1b73b63e-brunch-and-sunset-lune-up.jpg` | JPEG 1080×1920 | 2,06 | Tras seleccionar edición 2 y llegar a stories; original completo. |
| 3 | Tardeo / edición 2 stories | `tardeo/ediciones/edicion-2/stories/2829b886-01f5-44ed-b997-c4ca62347e59-mati-marquez.png` | PNG 1080×1920 | 1,94 | Tras seleccionar edición 2 y llegar a stories; PNG completo. |
| 4 | Rambla / banner | `rambla/banners/banner_vertical.png` | PNG 1122×1402 | 1,77 | Entrada móvil; banner visible de inmediato. |
| 5 | Tardeo / edición 1 stories | `tardeo/edicion 1/stories/tardeo (98).jpg` | JPEG 1080×1920 | 1,58 | Al iniciar stories de edición 1; secuencia montada con `src`. |
| 6 | Tardeo / edición 1 stories | `tardeo/edicion 1/stories/tardeo (94).jpg` | JPEG 1080×1920 | 1,58 | Al iniciar stories de edición 1; secuencia montada con `src`. |
| 7 | Rambla / stories | `rambla/stories/historias rambla (63).jpg` | JPEG 1080×1920 | 1,52 | Al iniciar stories; secuencia montada con `src`. |
| 8 | Tardeo / edición 2 stories | `tardeo/ediciones/edicion-2/stories/49dbd682-6da5-4da1-8ed2-a2272c0ebe67-brunch-80.jpg` | JPEG 1080×1920 | 1,52 | Tras seleccionar edición 2 y llegar a stories. |
| 9 | Tardeo / edición 2 posts | `tardeo/ediciones/edicion-2/posts/32c7b0a4-c866-4a4b-8432-fa0a1c2cf8a4-brunch-and-sunset.jpg` | JPEG 1080×1350 | 1,51 | Tras seleccionar edición 2; grilla de posts diferida por navegador. |
| 10 | Tardeo / edición 2 posts | `tardeo/ediciones/edicion-2/posts/18bf5d29-8534-49fb-a799-d9ac8147ccb0-save-the-date.jpg` | JPEG 1080×1350 | 1,46 | Tras seleccionar edición 2; grilla de posts diferida por navegador. |

Muestras de conversión **solo en memoria**, sin sobrescribir Storage: Rambla story de 1,52 MiB produjo WebP de 168 kB a 720 px y 254 kB a 960 px; el banner PNG de 1,77 MiB produjo 119 y 174 kB; una story de Aqualand de 1,01 MiB produjo 92 y 128 kB. Se inspeccionaron capturas lado a lado a tamaño de visualización, sin diferencias llamativas. Son estimaciones para nuevas subidas; **los originales históricos no fueron convertidos ni reemplazados**.

## Diez videos más pesados

Se verificaron tamaño, resolución, duración y tasa con `ffprobe` sobre las URL públicas. Todos son MP4 H.264/AAC; el tamaño es el archivo completo, aunque la primera visita normalmente descarga solo rangos. El pedido anterior de `videoStack` comienza con el video activo de la sección; `mediaRows` puede pedir varios videos visibles a la vez. Maja no se incluyó en los tiempos de ruta.

| # | Cliente / bloque | Ruta de Storage | Px | MiB | Duración / Mb/s | Momento de pedido |
|---|---|---|---|---:|---:|---|
| 1 | Vectus / videoStack | `vectus/videos/Copia de SUMMIT-web-h264.mp4` | 1080×1920 | 39,53 | 49,8 s / 6,66 | Al entrar en Vectus, video activo. |
| 2 | Maja / videoStack | `maja/videos/copy_23CA139B-41CF-4ED6-8F98-FAC3BB8634F4-web-h264.mp4` | 1080×1920 | 33,85 | 58,7 s / 4,83 | Al entrar en Maja, si es el activo. |
| 3 | Maja / videoStack | `maja/videos/copy_349D56FE-B414-4951-96AF-7B78D52889BF-web-h264.mp4` | 1080×1908 | 32,17 | 58,4 s / 4,62 | Al activar su panel. |
| 4 | Maja / videoStack | `maja/videos/copy_75EBDB0E-FA48-4E6B-8826-7A4370218237-web-h264.mp4` | 1080×1920 | 28,74 | 59,8 s / 4,03 | Al activar su panel. |
| 5 | Rambla / videoStack | `rambla/videos/Copia de rambla 2.0-web-h264.mp4` | 1080×1920 | 27,73 | 25,3 s / 9,19 | Al activar su panel. |
| 6 | Vectus / videoStack | `vectus/videos/Copia de VECTUS S21-web-h264.mp4` | 1080×1920 | 27,40 | 44,4 s / 5,17 | Al activar el segundo panel. |
| 7 | Rambla / videoStack | `rambla/videos/ff23007e-f87c-4bc9-a0ed-d8edc03d6967-rambla-good-girls.mp4` | 1080×1920 | 21,22 | 14,4 s / 12,38 | Al activar su panel. |
| 8 | Rambla / videoStory | `rambla/stories/companion/b7ad4bf0-1313-4e99-907d-69128c4488d0-pagina.mp4` | 1080×1920 | 20,08 | 13,5 s / 12,47 | Junto a stories; pedido de video visible. |
| 9 | Rambla / videoStack | `rambla/videos/Copia de video rejunte 1-web-h264.mp4` | 1080×1936 | 18,87 | 21,5 s / 7,36 | Al activar su panel. |
| 10 | Tardeo / edición 1 mediaRows | `tardeo/edicion 1/fila 2/tardeo final-web-h264.mp4` | 1080×1920 | 18,08 | 31,8 s / 4,77 | Al acercarse la segunda fila visible. |

## Cambios realizados

1. Las stories, los pares de carrusel y el catálogo asignan `src` a los dos primeros paneles y al siguiente panel cuando el desplazamiento lo necesita. La preferencia de movimiento reducido conserva todos los medios accesibles. El primer medio visible recibe prioridad de carga; el resto conserva carga diferida. El recorrido completo en navegador confirmó 7/7 stories, 8/8 slides de carrusel y 17/17 entradas de catálogo finalmente cargadas en Aqualand.
2. Los videos esperan a que se resuelva la fuente de datos antes de reproducirse. `videoStack` usa `auto` solo para el activo cercano, `metadata` para el siguiente cercano y `none` para los demás. El video acompañante usa `metadata` al acercarse; `mediaRows` reproduce los visibles sin precargar los lejanos. La reproducción, sonido y controles existentes permanecen. En el recorrido focalizado, Vectus hizo 2 solicitudes MP4 sin duplicados y Tardeo bajó de 15 a 9 solicitudes MP4; quedaron 3 cancelaciones al abandonar una fila de video.
3. Las nuevas imágenes JPEG y PNG subidas desde el administrador conservan el archivo original y generan variantes WebP de hasta 720 y 1600 px a calidad 0,90, si reducen el tamaño al menos 10 %. GIF y otros formatos conservan solo el original para evitar perder animación. Las rutas y anchos se guardan en `config.webVariants`, campo JSON existente; `srcset`/`sizes` permite elegir la resolución adecuada. Fallar la conversión deja el original utilizable; fallar la subida de una variante revierte la operación. La eliminación o sustitución limpia sus variantes. No se añadió dependencia, tabla ni migración. Las imágenes anteriores siguen sirviendo su original hasta que se migren voluntariamente.
4. Las subidas nuevas usan una ruta única con `cacheControl` de un año. `vercel.json` asigna `public, max-age=31536000, immutable` solo a `/assets/`, donde Vite genera nombres con hash. El HTML mantiene revalidación. Esto beneficiará las visitas repetidas **después de desplegar** el cambio; el sitio público aún devuelve el header anterior. La regla sigue [la configuración oficial de Vercel](https://vercel.com/docs/project-configuration/vercel-json).

## Comparación antes / después

Ambas columnas son builds locales de producción con la misma conexión a Supabase, Chromium y caché desactivada. «Inicial» = MiB recibidos a 3,5 s; «img.» = peticiones de imagen de Storage durante el recorrido medido. Los tiempos son milisegundos desde navegación hasta la primera imagen de Storage que disparó `load`. Un guion indica que no hubo tal evento dentro de la ventana inicial. La pasada al sitio público confirmó el patrón de solicitudes previo: por ejemplo, Rambla tenía 22 solicitudes iniciales en escritorio, Tardeo 25 y Aqualand 19, iguales al baseline local; sus tiempos fueron distintos por red/CDN.

| Ruta / ventana | Inicial MiB | Solicitudes iniciales | Img. en recorrido | Primera imagen ms | LCP ms |
|---|---:|---:|---:|---:|---:|
| Home 1440: antes → después | 0,86 → 0,87 | 14 → 14 | 2 → 2 | 3468 → 2350 | 2192 → 2024 |
| `/portfolio` 1440 | 0,87 → 0,87 | 15 → 15 | 2 → 2 | 1868 → 1207 | 2060 → 1440 |
| Rambla 1440 | 8,35 → 4,73 | 22 → 19 | 6 → 5 | 1178 → 669 | 868 → 696 |
| Tardeo 1440 | 5,53 → 2,66 | 25 → 19 | 3 → 2 | — | 756 → 1076 |
| Aqualand 1440 | 4,32 → 2,62 | 19 → 17 | 36 → 17 | 2048 → 1085 | 660 → 680 |
| Vectus 1440 | 7,71 → 5,43 | 15 → 15 | 0 → 0 | — | 672 → 636 |
| Peumax 1440 | 4,42 → 3,63 | 19 → 18 | 21 → 17 | 2109 → 1771 | 688 → 652 |
| Rambla 390 | 7,52 → 6,34 | 20 → 19 | 4 → 5 | 2183 → 1392 | 660 → 628 |
| Tardeo 390 | 6,18 → 8,96 | 22 → 19 | 2 → 2 | — → 1668 | 692 → 624 |
| Aqualand 390 | 2,62 → 2,62 | 17 → 17 | 3 → 3 | 1279 → 1060 | 676 → 640 |
| Vectus 390 | 8,96 → 5,21 | 15 → 15 | 0 → 0 | — | 704 → 656 |
| Peumax 390 | 3,63 → 3,63 | 18 → 18 | 4 → 4 | 1831 → 2399 | 668 → 1476 |
| Rambla 375 | 7,75 → 3,02 | 17 → 16 | 6 → 4 | 1947 → 1189 | 692 → 844 |

La mejoría más sólida es la reducción de imágenes solicitadas fuera de pantalla (Aqualand 36 → 17, Peumax 21 → 17) y de videos duplicados (Tardeo 15 → 9 en el recorrido focalizado). La transferencia inicial baja en varias rutas, pero Tardeo móvil subió y algunos LCP empeoraron; los MP4 y la variabilidad de red impiden atribuirles una mejora consistente. Tampoco se redujo el tamaño de los originales históricos, por lo que Rambla móvil sigue descargando un banner de 1,77 MiB. Para lograr otra mejora grande en primera visita hará falta producir variantes de los archivos existentes o contratar un transformador de imágenes; ninguno de esos pasos se ejecutó aquí.

## Verificación y pendientes

- Tests de regresión escritos antes de corregir los fallos de carga, reproducción y caché; cubren asignación progresiva de `src`, prioridad, observadores, serialización y limpieza de variantes, subidas y configuración de Vercel.
- Se ejecutaron `npm test`, `npm run lint`, `npm run build` y `git diff --check` al terminar. El build conserva una advertencia previa: el chunk JS principal supera 500 kB minificado; no se añadió una estrategia de división ajena al objetivo de medios.
- No se convirtió ningún video, no se borraron originales ni se alteraron animaciones, diseño, contenido, audio, tablas o políticas RLS. El header nuevo y los WebP futuros solo podrán verificarse en producción tras un despliegue y una subida nueva; no se hizo commit, push ni deploy.

