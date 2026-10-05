# AQUALAND BACKFILL

**Publicado: 15 imágenes (7 Stories y 8 Carruseles), 30 variantes nuevas.** Originales: 15 archivos, 10.701 MB. Variantes: 30 archivos, 2.721 MB. Los 15 candidatos móviles suman 1.000 MB; ahorro promedio por imagen: **90.7 %**. MB/kB decimales.

Story 3: **1080×1920 / 809,0 kB → 720×1280 / 56,4 kB**. Story 4: **969,6 → 115,4 kB**. Carrusel, paso 3 A+B: **1,174 MB → 100,1 kB**. Son pesos de los archivos; la tabla de mediciones incluye headers transferidos.

**Calidad visual: PASS. Originales modificados: NO. Requests duplicados: 0 por visita. Frontend público modificado: NO.** Las Stories medidas quedaron preparadas antes de avanzar en ambos perfiles. Los carruseles mantienen espera residual con Slow 4G cold; el piloto mejora considerablemente la descarga, pero no elimina toda la demora.

## Inventario previo a escribir

Las 15 imágenes publicadas no tenían `webVariants`; se inventariaron, descargaron y guardaron dimensiones/pesos/SHA-256 antes de generar. Ninguna variante válida equivalente fue duplicada. Desktop: 1440×900; mobile: 390×844, DPR 2.

| Media item ID | Sección / pieza | storage_path original | Dimensiones | Bytes | webVariants previo | Render mobile / desktop, CSS px |
|---|---|---|---:|---:|---|---:|
| 4d64274a-98e4-4dd2-b3ea-b0d96c6bfaa4 | Story 1 | aqualand/stories/historias aqualand (31).jpg | 1080×1920 | 495624 | No | 252.3 / 342.0 |
| 7ff685b0-18ee-4991-add4-765c7df79adb | Story 2 | aqualand/stories/historias aqualand (34).jpg | 1080×1920 | 610158 | No | 252.3 / 342.0 |
| 232539aa-a09b-47a1-957b-0833d508dd7c | Story 3 | aqualand/stories/historias aqualand (37).jpg | 1080×1920 | 809046 | No | 252.3 / 342.0 |
| 91bea066-58cc-42a6-a672-29a7e999783c | Story 4 | aqualand/stories/historias aqualand (33).jpg | 1080×1920 | 969596 | No | 252.3 / 342.0 |
| e3acb60b-e2d9-47d0-ba84-d48010862c87 | Story 5 | aqualand/stories/historias aqualand (35).jpg | 1080×1920 | 1062246 | No | 252.3 / 342.0 |
| a88d53f4-5ac4-4dd5-96d8-61a803e47ef3 | Story 6 | aqualand/stories/historias aqualand (32).jpg | 1080×1920 | 894594 | No | 252.3 / 342.0 |
| 902f7b76-9597-4509-8da0-939914f516c2 | Story 7 | aqualand/stories/historias aqualand (36).jpg | 1080×1920 | 814329 | No | 252.3 / 342.0 |
| ccc56052-58a4-4348-927e-4694dd585831 | Carousel A 1 | aqualand/carruseles/carrusel A/carrusel A 1.jpg | 1080×1350 | 819259 | No | 260.8 / 512.0 |
| 1acfb4c0-aef6-49a4-bcaa-3b25a0757b14 | Carousel A 2 | aqualand/carruseles/carrusel A/carrusel A 2.jpg | 1080×1350 | 600501 | No | 260.8 / 512.0 |
| 7e2f2595-ba3b-4581-9504-d5654a29cd52 | Carousel A 3 | aqualand/carruseles/carrusel A/carrusel A 3.jpg | 1080×1350 | 708096 | No | 260.8 / 512.0 |
| a462d809-4f62-4740-a41a-397d6518569c | Carousel A 4 | aqualand/carruseles/carrusel A/carrusel A 4.jpg | 1080×1350 | 628592 | No | 260.8 / 512.0 |
| 0bf9ae1a-2aa1-4d54-8026-bc8159b8a7a4 | Carousel A 5 | aqualand/carruseles/carrusel A/carrusel A 5.jpg | 1080×1350 | 770499 | No | 260.8 / 512.0 |
| b01c48f4-d29b-47ac-9002-74d4383b641c | Carousel B 1 | aqualand/carruseles/carrusel B/carrusel B 1.jpg | 1080×1350 | 597254 | No | 260.8 / 512.0 |
| 9079eaa1-b24f-41b2-a242-67f9c6e06ea9 | Carousel B 2 | aqualand/carruseles/carrusel B/carrusel B 2.jpg | 1080×1350 | 455195 | No | 260.8 / 512.0 |
| 27b15b31-8099-4ec5-a966-0991146c6ad0 | Carousel B 3 | aqualand/carruseles/carrusel B/carrusel B 3.jpg | 1080×1350 | 466279 | No | 260.8 / 512.0 |

## Sistema reutilizado e integridad

Se ejecutó directamente `createWebImageVariants` del Admin en Chromium: objetivos reales **720/1600 px**, WebP **0,9**, ancho limitado al original y variantes sólo si pesan menos del 90 % del original. En estas imágenes de 1080 px produjo **720/1080 px**, sin upscale, recorte ni cambios globales de parámetros. Canvas/createImageBitmap conservan el pipeline de orientación/color/metadata del uploader.

Se reutilizó `variantPath` del Admin (único cambio: exportar esa función), con el mismo sufijo `-web-<width>.webp`. Las 30 rutas eran inexistentes antes del piloto; se subieron con `upsert: false`, sin delete ni sobrescritura. Una ejecución posterior sólo reutiliza objetos con bytes idénticos a los revisados.

Antes de actualizar cada item se verificaron existencia y descarga pública, SHA-256, dimensiones, peso y correspondencia con las capturas revisadas. Se compararon las 15 piezas originales con sus 30 variantes al tamaño real de mobile/desktop, incluyendo texto, gradientes, fotos y colores. No se observó degradación perceptible al render previsto. [Capturas y registro visual](output/playwright/aqualand-backfill/visual-review.json).

Database: únicamente se agregó `config.webVariants: [{ width, path }]` a los 15 IDs del inventario, preservando el resto de `config`. `updated_at` cambió por el trigger existente. Las rutas y todas las demás columnas permanecen iguales. Comparación completa: **161 registros de medios**; originales descargados otra vez con **15 SHA-256 iguales**. [Integridad](output/playwright/aqualand-backfill/integrity.json).

No se modificaron RLS, policies, RPC, Auth, bucket, migraciones, otros clientes, Posts, Catálogos, logos, covers ni vídeos. Se usó el cliente administrativo local ya existente; sin credenciales secretas en el frontend. Reversión: retirar sólo `config.webVariants` devuelve el original mediante el fallback existente, cubierto por tests.

## Chromium: antes / después

Frontend local actual (`http://127.0.0.1:5173/portfolio/aqualand`) con Database y Storage públicos reales. **390×844, DPR 2**; Fast 4G **4 Mbps / 150 ms**, Slow 4G **1,6 Mbps / 300 ms**. Browser cache borrada al iniciar cada perfil; warm es la segunda navegación del mismo contexto. Se repitió el recorrido anterior: proximidad a 700 px, pausa de 2,5 s, entrada, espera de las primeras dos piezas y ruedas reales cada ~900 ms. No se desplegó el frontend.

URLs seleccionadas realmente por Chromium en mobile, coincidentes con los nodos preparados por el warm preload:

En las cuatro visitas medidas, los 15 items solicitaron un único candidato cada uno: ninguna descarga adicional del original ni de otro ancho para el mismo item. Registros CDP completos: [aqualand-after.json](output/playwright/aqualand-after.json).

| Pieza | Variante seleccionada | Resolución | Peso archivo |
|---|---|---:|---:|
| Story 3 | [historias aqualand (37)-web-720.webp](https://tihojwuhzdephqwuqbzq.supabase.co/storage/v1/object/public/portfolio-media/aqualand/stories/historias%20aqualand%20(37)-web-720.webp) | 720×1280 | 56.4 kB |
| Story 4 | [historias aqualand (33)-web-720.webp](https://tihojwuhzdephqwuqbzq.supabase.co/storage/v1/object/public/portfolio-media/aqualand/stories/historias%20aqualand%20(33)-web-720.webp) | 720×1280 | 115.4 kB |
| Carousel A 3 | [carrusel A 3-web-720.webp](https://tihojwuhzdephqwuqbzq.supabase.co/storage/v1/object/public/portfolio-media/aqualand/carruseles/carrusel%20A/carrusel%20A%203-web-720.webp) | 720×900 | 60.2 kB |
| Carousel B 3 | [carrusel B 3-web-720.webp](https://tihojwuhzdephqwuqbzq.supabase.co/storage/v1/object/public/portfolio-media/aqualand/carruseles/carrusel%20B/carrusel%20B%203-web-720.webp) | 720×900 | 39.9 kB |

| Perfil / cache | Pieza | Transferencia kB, antes → después | Descarga ms, antes → después | load → decode ms, antes → después | Swipe → disponible ms, antes → después |
|---|---|---:|---:|---:|---|
| fast cold | Story 3 | 809.8 → 57.0 | 3223 → 645 | 15 → 20 | Preparada → Preparada |
| fast cold | Story 4 | 970.4 → 116.0 | 4341 → 1160 | 4 → 42 | 1661 → Preparada |
| fast cold | Carousel A 3 | 708.8 → 60.8 | 6415 → 1247 | 26 → 35 | N/D (load +5538) → 409 |
| fast cold | Carousel B 3 | 467.0 → 40.5 | 3845 → 1028 | 9 → 25 | 2978 → 187 |
| fast warm | Story 3 | 0.0 → 57.0 | 2 → 931 | 31 → 29 | Preparada → Preparada |
| fast warm | Story 4 | 0.0 → 116.0 | 0 → 1092 | 18 → 45 | Preparada → Preparada |
| fast warm | Carousel A 3 | 708.8 → 0.0 | 4002 → 2 | 15 → 33 | N/D (load +3141) → 49 |
| fast warm | Carousel B 3 | 467.0 → 0.0 | 3736 → 2 | 11 → 41 | 2892 → 49 |
| slow cold | Story 3 | 809.7 → 57.0 | 9233 → 1223 | 16 → 18 | N/D (load +3736) → Preparada |
| slow cold | Story 4 | 970.3 → 116.0 | 26469 → 1170 | 44 → 36 | N/D (load +23801) → Preparada |
| slow cold | Carousel A 3 | 708.9 → 60.8 | 19287 → 3245 | 32 → 37 | N/D (load +18419) → N/D (load +2363) |
| slow cold | Carousel B 3 | 467.0 → 40.5 | 15710 → 2217 | 16 → 27 | 14863 → 1372 |
| slow warm | Story 3 | 0.0 → 0.0 | 1 → 1 | 19 → 24 | Preparada → Preparada |
| slow warm | Story 4 | 0.0 → 0.0 | 0 → 4 | 32 → 21 | Preparada → Preparada |
| slow warm | Carousel A 3 | 0.0 → 0.0 | 6 → 2 | 40 → 55 | 36 → 43 |
| slow warm | Carousel B 3 | 0.0 → 0.0 | 7 → 2 | 51 → 39 | 36 → 43 |

“Preparada” significa que ya estaba completa/decodificada antes de avanzar; no afirma latencia de animación de 0 ms. “N/D” indica que no se registró imagen completa visible durante ese paso: se informa separadamente cuándo terminó `load`. El muestreo visible/completo cada ~16 ms reproduce el método anterior y aproxima presentación; no mide píxeles de pantalla. `load → decode` es cola posterior a descarga, no CPU pura del decodificador. Una muestra por perfil, sin percentiles.

**Stories:** Fast cold, Story 4 pasó de **1661 ms** a preparada antes del avance. Slow cold, Story 3/4 antes terminaban `load` **+3736/+23801 ms** después del avance; ahora estaban decodificadas **3409/1458 ms antes**.

**Carruseles:** Fast cold, fila A antes no registró imagen completa durante el paso (`load` +5538 ms); ahora **409 ms**. Fila B **2978 → 187 ms**. Slow cold, A sigue sin registro completo durante el paso, con `load` **+18419 → +2363 ms**; B **14863 → 1372 ms**. Warm final, ambas filas disponibles a **49 ms Fast / 43 ms Slow**, ya decodificadas antes del avance. No se retrasó la animación ni se cambiaron los parámetros globales para ocultar la espera.

## Cache y validación funcional

Las 30 variantes responden **`Cache-Control: public, max-age=31536000`**, **`Content-Type: image/webp`** y ETag. Ejemplo Story 3 de 720 px: `"f771cd8a6dd668478b5bec1c6470cbcf"`. Headers y ETag de cada variante: [applied.json](output/playwright/aqualand-backfill/applied.json). Las primeras descargas de verificación observaron MISS en CDN; no se cambió configuración global.

Cold descargó las variantes elegidas. Warm Slow tuvo **0 bytes de red en las cuatro piezas medidas**; warm Fast reutilizó las dos del carrusel, pero Story 3/4 tuvieron misses y transfirieron **57/116 kB** aunque llegaron antes del avance. Se preservan esos misses en el informe; max-age no garantiza hit en toda segunda visita.

Validación con Storage real: primera Story, 1→2→3→4, retroceso, las siete Stories, los cinco pasos del carrusel A y los tres del B. Mobile 390×844 DPR 2; desktop 1440×900 DPR 1 y 2. **15/15 piezas cargadas por contexto, 0 imágenes rotas, 0 URLs duplicadas y 0 errores JS**. Mobile eligió 720 px; desktop DPR 2 eligió 1080 px en Carruseles y 720 px en Stories. Se comprobó igualdad entre `srcset`/`sizes` del `<img>` y los del preload. [Registro funcional](output/playwright/aqualand-backfill/published-functional.json).

Aqualand no tiene VideoStory ni vídeos publicados en este snapshot. Los registros de vídeo globales permanecen iguales y las pruebas existentes de VideoStory, dual-phone, vídeo/audio y preload pasaron. Ningún componente, estilo o hook público fue editado en este piloto.

`npm test`: **42 archivos / 320 tests PASS**, incluidos tres tests nuevos de límites de escritura. `npm run lint`: PASS. `npm run build`: PASS, con el aviso previo del bundle principal >500 kB. `git diff --check`: PASS.

## Storage: únicamente archivos nuevos creados

Destino: `https://tihojwuhzdephqwuqbzq.supabase.co`, bucket `portfolio-media`. Los archivos publicados coinciden con el [payload autorizado](output/playwright/aqualand-backfill/publication-plan.json).

| Nueva ruta creada | Resolución | Bytes |
|---|---:|---:|
| aqualand/stories/historias aqualand (31)-web-720.webp | 720×1280 | 55876 |
| aqualand/stories/historias aqualand (31)-web-1080.webp | 1080×1920 | 90974 |
| aqualand/stories/historias aqualand (34)-web-720.webp | 720×1280 | 53664 |
| aqualand/stories/historias aqualand (34)-web-1080.webp | 1080×1920 | 86432 |
| aqualand/stories/historias aqualand (37)-web-720.webp | 720×1280 | 56404 |
| aqualand/stories/historias aqualand (37)-web-1080.webp | 1080×1920 | 95560 |
| aqualand/stories/historias aqualand (33)-web-720.webp | 720×1280 | 115410 |
| aqualand/stories/historias aqualand (33)-web-1080.webp | 1080×1920 | 190716 |
| aqualand/stories/historias aqualand (35)-web-720.webp | 720×1280 | 94248 |
| aqualand/stories/historias aqualand (35)-web-1080.webp | 1080×1920 | 161226 |
| aqualand/stories/historias aqualand (32)-web-720.webp | 720×1280 | 101476 |
| aqualand/stories/historias aqualand (32)-web-1080.webp | 1080×1920 | 171102 |
| aqualand/stories/historias aqualand (36)-web-720.webp | 720×1280 | 78720 |
| aqualand/stories/historias aqualand (36)-web-1080.webp | 1080×1920 | 130700 |
| aqualand/carruseles/carrusel A/carrusel A 1-web-720.webp | 720×900 | 81608 |
| aqualand/carruseles/carrusel A/carrusel A 1-web-1080.webp | 1080×1350 | 140674 |
| aqualand/carruseles/carrusel A/carrusel A 2-web-720.webp | 720×900 | 52166 |
| aqualand/carruseles/carrusel A/carrusel A 2-web-1080.webp | 1080×1350 | 98062 |
| aqualand/carruseles/carrusel A/carrusel A 3-web-720.webp | 720×900 | 60160 |
| aqualand/carruseles/carrusel A/carrusel A 3-web-1080.webp | 1080×1350 | 113890 |
| aqualand/carruseles/carrusel A/carrusel A 4-web-720.webp | 720×900 | 47844 |
| aqualand/carruseles/carrusel A/carrusel A 4-web-1080.webp | 1080×1350 | 87704 |
| aqualand/carruseles/carrusel A/carrusel A 5-web-720.webp | 720×900 | 44080 |
| aqualand/carruseles/carrusel A/carrusel A 5-web-1080.webp | 1080×1350 | 90144 |
| aqualand/carruseles/carrusel B/carrusel B 1-web-720.webp | 720×900 | 68190 |
| aqualand/carruseles/carrusel B/carrusel B 1-web-1080.webp | 1080×1350 | 121744 |
| aqualand/carruseles/carrusel B/carrusel B 2-web-720.webp | 720×900 | 49748 |
| aqualand/carruseles/carrusel B/carrusel B 2-web-1080.webp | 1080×1350 | 79122 |
| aqualand/carruseles/carrusel B/carrusel B 3-web-720.webp | 720×900 | 39916 |
| aqualand/carruseles/carrusel B/carrusel B 3-web-1080.webp | 1080×1350 | 63332 |

## Archivos del piloto y entrega

- El script y test del piloto se generalizaron como `scripts/portfolio-web-variants.mjs` y `scripts/portfolio-web-variants.test.mjs`. El mantenimiento actual usa `plan`, `apply` y `verify` para todos los clientes; ver [WEB_VARIANTS_BACKFILL.md](WEB_VARIANTS_BACKFILL.md). Los resultados y artefactos de este piloto se conservan como evidencia histórica.
- `src/admin/portfolioAdminService.js`: únicamente exportar `variantPath`; conservados todos los cambios previos del usuario.
- `AQUALAND_BACKFILL.md`: este informe. Evidencia, originales de lectura, variantes locales y scripts de navegador en `output/playwright/aqualand-backfill/` (ignorado por Git).

Sin commit, push ni deploy. Piloto terminado; detenido para la prueba manual de Aqualand.
