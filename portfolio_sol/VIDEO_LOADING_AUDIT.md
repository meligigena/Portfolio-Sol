# Carga de videos públicos: Tardeo

Auditoría del 5 de octubre de 2026. Se optimizó la estrategia de carga sobre el estado de trabajo que dejó la tarea anterior. Las modificaciones anteriores de imágenes y administrador siguen pendientes en el repositorio; esta tarea añade únicamente lógica de videos públicos, tests y este informe. No hubo escrituras remotas, conversiones, nuevos archivos de video ni cambios de Storage paths.

## Medición

Chromium, viewport 390×844, DPR 2, navegador nuevo por perfil y caché HTTP inicialmente vacía. Se navegó a `/portfolio`, se esperó que la navegación inicial terminara, se activó el enlace de Tardeo por SPA, se esperó 1,5 s y se desplazó la primera fila a 80 px del borde superior. Después de la primera disponibilidad se desplazó horizontalmente la fila y se volvió al portfolio para repetir la entrada en el mismo contexto con caché caliente. Tardeo usa filas horizontales, no una secuencia vertical; la transición vertical se comprobó adicionalmente en Vectus.

Se usó CDP Network para registrar inicio de cada petición, respuesta/TTFB, rangos, bytes recibidos, terminación y caché, y se instrumentaron los nodos reales para registrar `readyState`, eventos, primer frame mediante `requestVideoFrameCallback`, montaje, desmontaje, fuente y visibilidad. Los bytes hasta el primer frame se calcularon sumando los paquetes recibidos hasta su timestamp, no a partir del tamaño completo del MP4.

Perfiles explícitos de CDP: **Fast 4G: 4 Mb/s de bajada, 1 Mb/s de subida y 150 ms de latencia añadida; Slow 4G: 1,6 Mb/s, 0,75 Mb/s y 300 ms**. Son simulaciones de red en un equipo de escritorio, sin simular CPU de celular. El Storage/CDN remoto y sus latencias reales siguen participando. «Cold» corresponde a caché del navegador, no a vaciar Cloudflare. Cada resultado es una muestra; las repeticiones y los candidatos ayudan a comprobar el mecanismo, pero no equivalen a percentiles de tráfico real.

La comparación principal usa el build anterior a esta tarea y el final, ambos locales y con los mismos videos publicados de Supabase. La pasada independiente por `solfanara.com` confirmó el patrón anterior: primer frame cold 5045 ms, warm 245 ms, seis peticiones concurrentes antes del primer frame, cero duplicados y cero cambios de fuente durante cada visita.

## Causa del retraso y caché

El primer video de Tardeo está ya dentro del viewport al montar el case study: aproximadamente a 626 px de su borde superior. Su petición ya empezaba al entrar en la ruta. Al desplazar la página, hasta seis videos visibles intentaban cargar/reproducir simultáneamente. El primero necesita aproximadamente **0,3 MB de su propio archivo** para presentar el primer frame en las muestras; antes, para cuando llegaba ese frame, otros videos habían consumido gran parte de la conexión. El retraso combina TTFB real y competencia de descargas, no un cambio de codec ni un remount detectado dentro de la visita.

Al salir por SPA se desmontan los nodos; al volver se crean nuevos nodos con las mismas URLs. Aun así, el primer video no inició una nueva petición de Network y recibió **cero bytes nuevos** antes del primer frame. Esto confirma reutilización del recurso de media retenido por el navegador durante esa sesión. La medición no demuestra persistencia de esa caché después de cerrar Chromium ni separa su almacenamiento en memoria y disco.

Headers reales de la respuesta cold del primer archivo, `club tardeo max carra-web-h264.mp4`:

| Campo | Valor observado |
|---|---|
| Status / petición | `206` / `Range: bytes=0-` |
| Cache-Control | `no-cache` |
| ETag | `"0abd947853a0bf3d7e87b7485f9a1118"` |
| Age / caché CDN | `21037` / `cf-cache-status: HIT` en la muestra final |
| Content-Length | `11341580` bytes |
| Content-Range | `bytes 0-11341579/11341580` |

`no-cache` permite almacenar una respuesta, pero exige validación antes de su reutilización en la caché HTTP normal; no significa `no-store`. La reutilización observada por el reproductor durante la sesión no debe interpretarse como una política de caché persistente garantizada. Referencia: [Cache-Control en MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control).

Si se quiere mejorar la caché persistente, la propuesta es revisar cómo Supabase/Cloudflare sirven los rangos y si la metadata de objetos versionados puede aplicar un TTL de un año también a esas respuestas. Se necesita una comprobación del header 206 posterior para demostrarlo. No se modificó metadata, no se re-subió ningún objeto y no se sustituyó el backend de Storage.

## Estrategia anterior y nueva

Antes: `MediaRows` tenía `preload="none"`, pero cada video que entraba en viewport ejecutaba `play()` y comenzaba a descargar. En la secuencia vertical, el activo cercano tenía `auto`, el siguiente `metadata` y los demás `none`; VideoStory cercano tenía `metadata`.

Ahora, `useVideoWarmPreload` administra la preparación del **mismo `<video>` montado**, con margen de 800 px, esperando a que estén resueltos los datos publicados y las fuentes críticas. Los videos ya visibles se admiten con su geometría al montar, sin esperar a la primera notificación del observador; el observador anticipa los restantes. No hace un `fetch` separado, no crea un reproductor oculto, no cambia `src` y no llama a `load()`.

- **Filas como Tardeo:** hay dos turnos de arranque para videos cercanos. Las celdas horizontales deben mostrar al menos el 25 % de su área en el margen de observación; una franja de pocos píxeles no gana prioridad sobre la siguiente fila. Los candidatos iniciales reciben `auto`; al alcanzar `readyState ≥ 3`, pasan a `metadata` y permiten preparar el siguiente candidato. Los demás permanecen en `none`. Los videos admitidos siguen reproduciéndose únicamente con las reglas anteriores de visibilidad y sonido.
- **Secuencias verticales:** primero solo el activo recibe `auto`. Cuando tiene datos futuros (`readyState ≥ 3`), el siguiente empieza con `auto` en su propio nodo pausado y silenciado; al estar preparado baja a `metadata`. N+2 y los lejanos permanecen en `none`. Al pasar a N+1, ese nodo se conserva y N+2 puede prepararse. Esta elección evita competir con el primer activo todavía sin buffer.
- **VideoStory:** usa el mismo hook, con un único video cercano. Su preparación no reproduce ni activa audio fuera del viewport.
- **Identidad y limpieza:** las keys siguen basadas en IDs persistidos y el observador de videos usa una clave de IDs y rutas, estable ante datos equivalentes. Salir de la ruta o cambiar edición desconecta observadores, retira listeners y prioridades; la lógica existente pausa y silencia los videos desmontados. No se fuerza un reinicio de la fuente para abortar rangos.

Dos turnos de arranque **no son un límite absoluto de dos peticiones de red**: una reproducción ya preparada puede seguir descargando mientras comienza otra. En Tardeo final se observaron dos solicitudes concurrentes antes del primer frame en ambos perfiles; en candidatos anteriores fueron dos o tres y el pico de toda la visita puede llegar a seis al mostrar más piezas. El atributo `preload` es una indicación al navegador, no un límite estricto de bytes. Referencia: [preload en MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preload).

Se probaron márgenes de **800 y 1200 px**. Ambos seleccionaban los mismos videos en Tardeo: el primero ya está visible y las filas siguientes están próximas. El candidato de 1200 px dio 3682 ms al primer frame en Fast 4G y 6605 ms en Slow 4G; la variación de TTFB impide atribuir esa diferencia al margen. Se conserva 800 px porque ampliar la distancia no aportó contenido útil adicional en el caso medido.

No se añadió prefetch separado al enlace de Tardeo: el `<video>` real ya comienza a solicitar su recurso alrededor del montaje del case study, unas decenas de ms antes de la primera muestra de DOM (22 ms en el final Fast). Adelantar una descarga independiente unos pocos milisegundos no aportó una ventaja demostrada que justifique arriesgar una segunda petición. La mejora del primer video proviene de la prioridad y el reparto de la conexión, no de afirmar un adelanto de segundos que la medición no muestra.

## Resultados de Tardeo

Tiempos desde la primera detección del nodo de video. «Bytes al frame» suma **todos los videos**; el primero por sí solo recibió 294–312 kB. «Bytes al scroll» corresponde al desplazamiento programado tras 1,5 s: el primer video ya estaba visible, por lo que no es correcto llamarlo «bytes antes de entrar al viewport». Para ese primer video, los bytes antes de su entrada inicial al viewport son cero en ambas versiones. Los resultados finales corresponden a `video-final-immediate.json`, después del ajuste de admisión inmediata de videos visibles.

| Perfil / visita | Primer frame ms antes → final | readyState ≥ 3 ms | Bytes al frame | Bytes al scroll | Solicitudes MP4 de la visita | Concurrencia hasta primer frame |
|---|---:|---:|---:|---:|---:|---:|
| Fast 4G cold | 5275 → 3728 | 6358 → 4140 | 1627674 → 637583 | 297023 → 99026 | 7 → 6 | 6 → 2 |
| Fast 4G warm | 232 → 163 | 236 → 195 | 0 → 0 | 0 → 0 | 2 → 3 | 0 → 1 |
| Slow 4G cold | 8376 → 6341 | 10040 → 7661 | 952592 → 592564 | 166518 → 145518 | 7 → 6 | 6 → 2 |
| Slow 4G warm | 218 → 121 | 248 → 158 | 0 → 0 | 0 → 0 | 4 → 3 | 0 → 0 |

En esta muestra final, el primer frame cold bajó aproximadamente **29 % en Fast 4G y 24 % en Slow 4G**, y los bytes de todos los videos hasta ese frame bajaron 61 % y 38 %. El TTFB del primero fue 1183 → 1199 ms en Fast y 963 → 351 ms en Slow: parte de la ganancia Slow coincide con una respuesta remota más rápida y no debe atribuirse enteramente al hook. La visita caliente mantuvo cero bytes nuevos para el primer frame y sus tiempos fueron menores que el baseline. Las peticiones restantes de warm corresponden a piezas/rangos que no estaban completamente preparados en cold, no a volver a descargar el inicio del primer video. La concurrencia warm de uno en Fast corresponde a otra pieza, sin bytes recibidos antes del frame inicial.

Una pasada anterior del candidato de 800 px dio 2005 ms/6421 ms cold y 155 ms/158 ms warm. Antes del ajuste de admisión inmediata, dos pasadas Fast dieron 372 y 526 ms warm; se observó una espera de 45–73 ms para pasar de `none` a `auto`. Se escribió primero el test que reproducía esa espera al montar y después se agregó la admisión por geometría. El final warm dio 163/121 ms. Los resultados varían también con decodificación, TTFB y estado de los rangos; son muestras, no una garantía de latencia o de mejora consistente para todos los dispositivos.

El objetivo de llegar con el primer video ya preparado **no se cumple por completo en cold**: el scroll programado ocurre a los 1,5 s y el primer frame final llega a los 3,73/6,34 s. La estrategia reduce la espera y la competencia; conservando los archivos y sus bitrates no elimina ese retraso en las redes medidas.

Tardeo Video 1 → Video 2: el segundo video ya había presentado su primer frame antes del desplazamiento horizontal tanto en baseline como en final; no hubo espera adicional de primer frame en esa transición (0 ms calculados). No se atribuye una mejora a una transición que ya estaba disponible.

## Network de cada video, Fast 4G cold

Inicio de petición y disponibilidad en ms relativos a la muestra inicial de montaje; los inicios que precedían esa muestra unas decenas de ms se muestran como ≈0. «—» significa que no se solicitó/no se alcanzó el evento durante ese recorrido. Todas las peticiones registradas en esta tabla son `206`, `Range: bytes=0-`.

| Archivo en edición 1 | Inicio antes → final | TTFB antes → final | readyState ≥ 3 antes → final | Primer frame antes → final |
|---|---:|---:|---:|---:|
| `club tardeo max carra-web-h264.mp4` | ≈0 → ≈0 | 1183 → 1199 | 6315 → 4100 | 5232 → 3688 |
| `la vuelta banda tardeo-web-h264.mp4` | ≈0 → ≈0 | 633 → 1090 | 3866 → 4001 | 2804 → 3678 |
| `jaime tardeo-web-h264.mp4` | ≈0 → 5106 | 993 → 8353 | 4816 → — | 4216 → — |
| `mati marquez tardeo-web-h264.mp4` | 7316 → 5108 | 7812 → 8511 | — → — | — → — |
| `tardeo mica marquez-web-h264.mp4` | — → — | — | — | — |
| `tardeo tomi lujan-web-h264.mp4` | — → — | — | — | — |
| `Copia de max carra tardeo-web-h264.mp4` | 1536 → 3958 | 659 → 9501 | 5916 → — | 4919 → — |
| `tardeo early-web-h264.mp4` | 1536 → 4075 | 668 → 890 | 4867 → — | 4416 → 6321 |
| `tardeo final-web-h264.mp4` | 1537 → — | 668 → — | 7466 → — | 6457 → — |

Se favorecen las primeras piezas útiles y se retrasan las celdas apenas expuestas y las posteriores. Esto mejora la primera entrada; no hace que todos los videos de la fila siguiente estén listos inmediatamente. Las respuestas de algunos candidatos posteriores siguen tardando bajo competencia, como muestra la tabla. No se ocultó ese retraso con posters: los nueve videos medidos no disponían de poster y no se generaron imágenes nuevas.

En este recorrido Fast, los bytes por archivo antes de su primera entrada registrada al viewport fueron **0 antes y 0 después para los nueve videos**. Mica y Tomi no entraron y tampoco se solicitaron. La siguiente fila aparece tras el scroll mientras aún se preparan los primeros: la preparación anticipada no consiguió transferir bytes antes de esa entrada rápida en esta muestra. La visibilidad se muestrea cada 50 ms y cuenta cualquier franja visible; para asignar un turno de preparación se exige el 25 % de área. El diagnóstico `video-before-viewport.mjs` permite reproducir ese cálculo sobre los paquetes registrados.

En baseline y final se registraron **cero solicitudes duplicadas de la misma URL y rango dentro de una visita, cero cambios de `src` en un nodo y ningún remount lógico dentro de la visita**. Los remount al salir/volver por SPA y al cambiar a contenido de otra edición son esperados. Un rango posterior necesario para continuar reproducción no se considera un duplicado.

`readyState ≥ 3` indica disponibilidad de algunos frames futuros, no garantiza varios segundos de buffer. Se observaron bajadas posteriores a estado 2 al reproducir varios archivos con una red restringida. La preparación anticipada reduce la espera inicial; conservar los bitrates originales deja ese límite físico de reproducción sostenida. Referencia: [readyState en MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState).

## Ediciones, secuencia y verificación

Solo se monta la edición activa; el hook descubre videos exclusivamente dentro de ese bloque. No inspecciona ni prepara las otras ediciones desde los datos del cliente. Se probaron cambios de edición, limpieza SPA y una secuencia vertical para verificar prioridades y que los inactivos sigan pausados y silenciados.

En Chromium se observaron dos ediciones disponibles: nueve videos en la edición 1 y un VideoStory en la edición 2. Tras el click efectivo de cambio hubo **cero nuevas peticiones de la edición anterior**; sus nueve nodos quedaron desmontados, pausados, silenciados y con `preload="none"`. Al volver al portfolio quedaron cero videos montados y cero nuevas peticiones MP4. La comprobación usa el timestamp real del click y el de CDP: desplazarse para alcanzar un botón antes de pulsarlo todavía pertenece a la edición anterior.

En la medición de estrategia de Vectus, anterior al último ajuste de admisión inmediata, el primer frame cold fue 2362 → 2608 ms (TTFB 715 → 927 ms), sin una mejora consistente del tiempo inicial. Los bytes hasta ese frame bajaron 987143 → 780163. El siguiente comenzó su preparación después de que el activo tuviera datos futuros y la transición medida presentó su frame 68 ms después del desplazamiento; el baseline ya lo tenía disponible. La comprobación de estado sobre el build final, sin throttling, dio 99 ms hasta activar/reproducir el siguiente, conservó los mismos nodos y confirmó que todos los inactivos estaban pausados y silenciados. No se atribuye una ganancia a esa transición ya rápida. La entrada warm medida de Vectus dio 242 → 174 ms y cero bytes nuevos hasta el primer frame.

Archivos de esta tarea: `src/components/media/useVideoWarmPreload.js`, `MediaRows.jsx`, `VideoStack.jsx`, `StorySequence.jsx`; tests de esos componentes, `useVideoWarmPreload.test.jsx` y `src/test/app.test.jsx`; este informe. El helper previo `useNearViewport.js`, que solo utilizaban videos, fue sustituido por el hook de preparación. No se cambió código de administrador, imágenes, CSS, animaciones, datos publicados ni reglas de audio en esta tarea.

Los diagnósticos y capturas locales quedan en `output/playwright/`, ignorado por Git: `video-loading-audit.mjs`, JSON before/final/public y candidatos 800/1200, y comprobaciones de estado/ediciones. No contienen credenciales privadas. No hubo instalación de dependencias, commit, push ni deploy.

## Controles finales

- `npm test -- --maxWorkers=1`: **39 archivos, 296 tests aprobados**. Incluye preparación escalonada, inicio visible sin esperar al observador, próximo video sin reproducción/audio, fuentes y nodos estables, edición, limpieza y reglas de sonido de la app.
- `npm run lint`: aprobado.
- `npm run build`: aprobado. Permanece el aviso previo del bundle principal de más de 500 kB; el chunk de cliente queda en 29,67 kB (8,09 kB gzip).
- `git diff --check`: aprobado.
- Chromium 390×844: Fast y Slow 4G cold/warm sin errores de página; comprobación final de ediciones, SPA y audio sin errores.

Se retiraron únicamente `src` y `scripts` de una copia de código generada previamente dentro de `output/playwright/baseline/portfolio_sol/`: Vitest estaba descubriendo allí tests antiguos y duplicando la suite. Se conservaron el build del baseline de video y los diagnósticos. No se alteró la configuración de tests para ocultar fallos.
