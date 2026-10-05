# Variantes web: backfill global y Admin

## Backfill aplicado

- Clientes afectados (7): aqualand, desnac, el-tori, peumax, rambla, sistemas-moviles, tardeo. Se recorrieron los 9 clientes actuales.
- Imágenes procesadas: 116.
- Imágenes saltadas por variantes válidas: 15 (las 15 del piloto Aqualand).
- Imágenes sin beneficio: 0.
- Variantes nuevas: 224.
- Originales procesados: 93297995 bytes (93.30 MB), intactos.
- Variantes nuevas, todas las anchuras: 28664960 bytes (28.66 MB).
- Variante menor por imagen: 10876152 bytes (10.88 MB).
- Ahorro aproximado de transferencia al elegir la variante menor: 88.3 %, 82.42 MB. Es una comparación de archivos; no se repitieron benchmarks.
- Errores: 0.

## Integridad y comprobaciones

Se descargaron y compararon 131 originales por SHA-256 antes/después. Las 254 referencias a variantes (224 nuevas y 30 del piloto) se descargaron y verificaron por dimensiones/peso. No hay referencias rotas ni rutas nuevas duplicadas. Los 15 items y 30 archivos del piloto no se regeneraron ni se modificaron.

La comparación completa de las cinco tablas confirmó que sólo cambiaron los config.webVariants autorizados y el updated_at automático de los media items procesados. Videos, logos, ediciones, secciones, grupos y demás campos permanecen intactos.

La reanudación reutilizó archivos y metadata ya confirmados sin nuevas subidas ni escrituras para esos items. El script mantiene checkpoints, verifica hashes y usa upsert:false; una ejecución posterior salta los items válidos y reutiliza candidatos locales pendientes. Rutas canónicas mediante variantPath; cualquier colisión con bytes distintos usa un sufijo estable de contenido.

Chromium, mobile 390×844 DPR 2 y desktop 1440×900 DPR 1: Stories/Tardeo, Carruseles/Peumax, Posts/Desnac y Catálogo/Aqualand. Los ocho casos solicitaron una variante del item representativo, sin original innecesario, candidatos duplicados, respuestas rotas ni errores JavaScript. Evidencia: output/playwright/portfolio-backfill/representative.json y sus capturas.

Admin PASS en Chromium con servicio/generador reales y Storage/Database simulados: upload existente, cliente nuevo, sección/edición nueva, reemplazo, delete/cleanup, fallo de codificación y fallo de subida de variantes. Evidencia: admin-smoke.json y tests focalizados.

## Pipeline permanente

Todos los uploads de media items pasan por uploadPublicMedia en portfolioAdminService. Conserva el original, llama a createWebImageVariants, sube las variantes y entrega config.webVariants al serializador existente. No hay condiciones por cliente ni section_type. responsiveImageProps, srcset/sizes y warm preload existentes consumen esa metadata sin cambios públicos.

Parámetros conservados: WebP, calidad 0.9, anchuras canónicas 720/1600 limitadas al original, sin upscale y sólo candidatos menores que el 90 % del peso original. También acepta WebP estático y raster AVIF/BMP compatible con Chromium; conserva los archivos animados, GIF y SVG sin convertirlos. El Admin mantiene sus formatos de upload JPEG/PNG/WebP.

Si falla la optimización o una subida de variante, guarda el original sin referencias parciales y limpia los candidatos subidos. La limpieza existente de reemplazos/eliminaciones sigue después de confirmar metadata; un fallo al guardar revierte únicamente los uploads nuevos.

Cover/logo usa una referencia directa de portfolio_clients en PortfolioRail, fuera del sistema config.webVariants. Se revisó esa conexión y se excluyó del backfill.

## Mantenimiento

Desde portfolio_sol, con las credenciales locales de mantenimiento y Vite activo:

```powershell
node scripts/portfolio-web-variants.mjs plan
node scripts/portfolio-web-variants.mjs apply
node scripts/portfolio-web-variants.mjs verify
```

plan sólo lee Database/Storage y prepara archivos/metadata; apply publica exclusivamente config.webVariants después de verificar Storage; verify es de lectura. Continúa por item ante errores y registra errors.json. Máximo cuatro items independientes en paralelo, checkpoints serializados y guardados de forma atómica. WEB_VARIANTS_OUTPUT permite una carpeta de ejecución distinta; PILOT_ORIGIN y PILOT_CHROMIUM_PATH conservan los overrides del script original.

El detalle exacto de rutas/hashes/metadata está en output/playwright/portfolio-backfill/publication-plan.json; el resultado en applied.json y summary.json. Los checks finales se registran en checks.json.

## Archivos modificados

- scripts/portfolio-web-variants.mjs y su test: generalización del script/test Aqualand, selección global, verificación, escritura limitada e idempotencia.
- src/admin/portfolioAdminService.js y portfolioImagePipeline.test.js: un único upload central y fallback seguro, con comprobación de herencia y limpieza.
- src/admin/imageVariants.js y su test: raster estático compatible con los mismos parámetros y protección de animaciones.
- AQUALAND_BACKFILL.md: referencia al mantenimiento generalizado; resultados históricos conservados.
- WEB_VARIANTS_BACKFILL.md: resultado global e instrucciones de mantenimiento.

Sin commit, push ni deploy.
