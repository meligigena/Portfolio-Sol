# Auditoría de carga de imágenes públicas — 2026-10-05

Se implementó preparación por proximidad sobre los mismos elementos `img` que utiliza la presentación. Se conservaron las transiciones, el layout y la estrategia de vídeos existente. No hubo instalación de dependencias, commit, push ni deploy.

El resultado tiene un límite físico: preparar una imagen antes reduce la espera, pero una secuencia de originales pesados recorrida rápidamente con Slow 4G puede superar la ventana de anticipación. Las mediciones distinguen imágenes listas de imágenes todavía descargándose; no se añadieron loaders ni animaciones para ocultar esa diferencia.

## 1. Causa de la demora

El baseline es el estado del workspace al comenzar esta tarea, incluyendo sus cambios previos sin commit; no es `HEAD`. Su build se conservó en `output/playwright/image-baseline-dist/`.

Stories, Carruseles y Catálogos asignaban `src` a los dos primeros elementos. Los demás recibían su URL durante `ScrollTrigger.onUpdate`, conservando `loading="lazy"`. No se solicitaba `decode()` ni había un observador de proximidad para imágenes. Avanzar rápidamente dejaba aproximadamente un desplazamiento de ventaja para descargar el siguiente archivo.

Las imágenes históricas de Aqualand no tienen variantes web: las Stories se muestran a aproximadamente 252 CSS px y los carruseles dobles a 261 CSS px en 390×844, pero se solicitan JPEG originales de 1080 px. La tercera Story transfiere alrededor de 809 kB; el tercer paso de ambas filas del carrusel requiere aproximadamente 1,17 MB. La descarga dura segundos con la red restringida.

También se observó una Story fallback solicitada antes de resolver el contenido publicado y sustituida durante la hidratación de datos. Se impidió esa asignación temprana en las tres secuencias, utilizando el estado de datos existente y sin modificar el proveedor ni Database.

No se detectaron object URLs ni remounts ocasionados por avanzar dentro de una secuencia. Los cambios de nodos/fuentes durante la hidratación inicial y el cambio de contenido se distinguen de los desplazamientos.

## 2. Estrategia anterior

Dos fuentes iniciales, lazy loading nativo y un `Set` acumulativo de índices solicitados. Se agregaban el índice calculado y su siguiente durante el scroll; las fuentes visitadas quedaban habilitadas. Descargar una imagen no se diferenciaba de tenerla decodificada.

## 3. Estrategia nueva

`useImageWarmPreload` observa la sección cercana, da prioridad alta a la pieza entrante/activa y a la siguiente, y conserva la anterior con prioridad normal. Stories prepara una segunda siguiente en segundo plano después de que termine la preparación de la activa, sin esperar también la descarga de la siguiente. Los elementos lejanos conservan carga diferida.

El índice de las animaciones utiliza la pieza que empieza a entrar (`ceil(progress × steps)`), para que un desplazamiento parcial prepare también su próximo vecino. Se cambió únicamente el cálculo para cargar imágenes: no se cambiaron los tweens, scrub, distancias ni transformaciones.

En movimiento reducido, el mismo hook escucha el scroll nativo de la ventana y mueve la preparación según su posición. Las imágenes siguen siendo accesibles mediante el comportamiento nativo existente.

El helper `warmImageProps` comparte exactamente `src`, `srcset` y `sizes` con `responsiveImageProps`. Las primeras fuentes se habilitan cuando los datos públicos están resueltos. Los estados de preparación son internos y no generan elementos visuales.

## 4. Cantidad de Stories preparadas

Al acercarse: actual + siguiente, y luego segunda siguiente: hasta **3 imágenes**. Durante el recorrido: anterior + activa/entrante + siguiente + segunda siguiente: hasta **4**. La segunda siguiente tiene prioridad normal, no alta. No se crean objetos `Image` adicionales ni se acumulan registros para todas las piezas visitadas.

## 5. Cantidad en Carruseles y otras secuencias

Por fila: actual + siguiente al acercarse; durante el recorrido se incluye la anterior: hasta **3 por fila**. Un carrusel doble prepara inicialmente **4 imágenes** y mantiene una ventana de hasta **6**, considerando filas de distinta longitud. La preparación de las dos filas se inicia en el mismo ciclo; una descarga más grande puede tardar más con Slow 4G.

Catálogos reutiliza la misma ventana, sin duplicar la lógica. Posts es una grilla de piezas independientes, no un visor secuencial; conserva su lazy loading y sus animaciones existentes.

## 6. Margen de proximidad

Se eligió **`rootMargin: "800px 0px"`**, con `threshold: 0`. En el layout dual-phone se observa específicamente el dispositivo de imágenes, sin alterar el observador de vídeo.

Se compararon 600, 800 y 1000 px en 390×844, con una pausa de 2,5 segundos a aproximadamente 700 px antes del carrusel. Son mediciones de ese recorrido, no una afirmación de margen óptimo para toda velocidad de scroll.

| Margen | Inicio de preparación/`decode()` respecto de entrar al carrusel |
|---|---:|
| 600 px | 8–9 ms antes, prácticamente al entrar |
| 800 px | 2492–2493 ms antes |
| 1000 px | 2512 ms antes |

800 px aprovechó la pausa previa; 1000 px no dio ventaja adicional relevante en esta muestra. Los JPEG iniciales podían comenzar antes mediante el lazy loading nativo; el dato de esta tabla mide la preparación explícita, no el inicio del request.

## 7. Decodificación y responsive

Se llama `decode()` sobre el **elemento montado**, después de habilitar sus candidatos responsive y su carga dentro de la ventana. `sizes` y `srcset` se asignan antes de `src` al admitir una fuente diferida. Así, el navegador selecciona una única variante y el recurso que se prepara es el mismo que se pinta.

`ready` se registra solo cuando `decode()` se resuelve. Si no existe o rechaza, se usa el estado de carga/evento `load`; `loaded` se distingue de `ready`. Los errores de red también liberan la preparación progresiva. Ninguno de esos fallos bloquea el scroll ni la UI.

Se verificó un fixture aislado con el componente y los estilos reales: 40 Stories, originales de 2000 px y candidatos de 720/1600 px, viewport 390×844 y DPR 2. Chromium pidió exclusivamente candidatos de **720 px**. Al avanzar y volver atrás no pidió versiones de 1600 px ni originales, ni repitió las URLs de las piezas ya mostradas. El fixture intercepta recursos ficticios localmente; no sube ni modifica objetos de Storage.

Las imágenes históricas sin `config.webVariants` siguen usando sus originales. Reducir esos archivos requeriría otro trabajo fuera del alcance autorizado.

## 8. Requests duplicados y concurrencia

Los registros finales están en `output/playwright/image-baseline-verified.json` y `image-final-verified.json`. En los cuatro recorridos, **0 URLs duplicadas antes y 0 después dentro de cada visita**. Se verificaron fuentes y nodos estables durante el avance; precargar y mostrar reutilizan el mismo elemento y recurso. Una nueva visita se contabiliza separadamente.

Pico de requests de Stories en curso: Fast cold **3 → 3**, Slow cold **4 → 4**. Carruseles: Fast cold **4 → 6**, Slow cold **4 → 4**. El aumento a seis corresponde a preparar la siguiente pieza de ambas filas cuando las entrantes ya están parcialmente visibles. Las solicitudes anteriores en curso pueden continuar con prioridad normal al moverse la ventana; no se inicia el resto de una secuencia de 40 imágenes al montar.

El pico de imágenes de toda la página fue Fast cold **9 → 10** y Slow cold **12 → 11**; incluye Posts y Catálogos que también puede solicitar el lazy loading nativo. No se cambiaron sus umbrales globales.

## 9. Tiempo de desplazamiento a imagen disponible

Método: Chromium, viewport **390×844**, DPR **2**; Fast 4G: **4 Mbps / 150 ms**; Slow 4G: **1,6 Mbps / 300 ms**. Caché cold: caché del navegador borrada al comenzar cada perfil. Warm: segunda navegación en el mismo contexto después de finalizar o cancelar explícitamente los requests de imágenes de la pasada cold. Una segunda visita no garantiza un hit de caché en todas las URLs; los misses y bytes realmente transferidos se conservan en el informe. Se utiliza el mismo contenido publicado, únicamente mediante lecturas públicas.

Los desplazamientos son eventos reales de rueda, separados por aproximadamente 900 ms, sobre las secuencias controladas por scroll. Se guardan tiempos de asignación de fuente, requests, `load`, inicio/fin de `decode()`, bytes CDP y estado visible de los elementos. El registro `paint-ready` se muestrea cada 16 ms y exige imagen completa con dimensiones naturales y visibilidad dentro de su ventana; es una aproximación a presentación, no una medición de píxeles de pantalla. Si una pieza se abandona antes de terminar su descarga, no se inventa un tiempo visible: se informa separadamente su finalización de carga.

El tiempo `load → decode resuelto` describe la cola después de la descarga. No representa tiempo puro de CPU del decodificador. En el baseline no había llamada explícita a `decode()`; su decodificación interna no se informa como 0 ms.

| Perfil / destino | Antes: registro visible/completo | Después: registro visible/completo |
|---|---:|---:|
| Fast cold / Story 3 | Sin registro durante el paso; `load` +1413 ms | Ya disponible antes del desplazamiento; decode terminó 935 ms antes |
| Fast cold / Story 4 | +3920 ms | +2294 ms; decode terminó +2307 ms |
| Fast cold / Carrusel, fila A, pieza 3 | Sin registro durante el paso; `load` +5010 ms | +41 ms; decode terminó 1522 ms antes |
| Fast cold / Carrusel, fila B, pieza 3 | +2280 ms | +41 ms; decode terminó 2833 ms antes |
| Fast warm / Story 3 y Story 4 | Story 3 ya disponible; Story 4 +2199 ms | Ambas ya decodificadas antes de avanzar |
| Fast warm / Carrusel A/B, pieza 3 | A sin registro completo; B +2502 ms | +34 / +34 ms; ambas decodificadas antes de avanzar |
| Slow cold / Story 3 | Sin registro durante el paso; `load` +10067 ms | Sin registro durante el paso; `load` +5976 ms |
| Slow cold / Story 4 | Sin registro durante el paso; `load` +27776 ms | Sin registro durante el paso; `load` +25807 ms |
| Slow cold / Carrusel A/B, pieza 3 | A sin registro completo; B +12950 ms | A sin registro completo; B +14540 ms |
| Slow warm / Stories 3 y 4 | Ambas ya disponibles | Ambas decodificadas más de 2600 ms antes de avanzar |
| Slow warm / Carrusel A/B, pieza 3 | A +119 ms; B +2777 ms | A sin registro completo; B +5461 ms |

"Sin registro durante el paso" no implica que nunca haya pintura progresiva parcial de un JPEG; significa que no se observó una imagen completa y visible durante ese paso. Se presenta el evento `load` posterior para no confundirlo con un tiempo de pintura mientras el usuario ya estaba en otra pieza.

Los requests de Story 3 empezaron **889 → 3007 ms antes** de su desplazamiento en Fast cold y **871 → 5476 ms antes** en Slow cold. En Fast cold esa descarga duró **2293 → 1989 ms**; en Slow cold **10932 → 11446 ms**: se ganó anticipación, no una mejora consistente del transporte. Para Story 4 Fast cold, el request pasó de 885 a 2737 ms antes del avance.

En Fast cold, los requests de la pieza 3 de ambas filas empezaron casi simultáneamente **12 segundos antes** del segundo desplazamiento: su preparación ya se activó durante la entrada parcial al carrusel, mientras se esperaba que las primeras piezas terminaran de cargar. Ambas estuvieron decodificadas antes de avanzar. En Slow cold comenzaron apenas un desplazamiento antes y no alcanzaron a quedar listas; no se atribuye a ese caso una ganancia inexistente.

Las cuatro piezas medidas del final tuvieron una cola `load → decode resuelto` de **24–80 ms** en Fast cold y **35–69 ms** en Slow cold. En las visitas warm se observaron colas de **47–159 ms**. Son una muestra por perfil, con variabilidad de red, caché y máquina; no percentiles ni una garantía universal.

## 10. Resultado Fast 4G

La tercera Story estuvo decodificada antes de avanzar, y las dos filas del tercer paso del carrusel registraron imagen completa/visible juntas a los 41 ms cold y 34 ms warm. La cuarta Story cold todavía esperó aproximadamente 2,3 segundos: un original de cerca de 970 kB no siempre se prepara a tiempo al avanzar cada 900 ms. No se considera alcanzada una transición instantánea para toda pieza histórica en toda circunstancia.

## 11. Resultado Slow 4G

La anticipación de Story 3 redujo la demora hasta su carga completa de aproximadamente 10,1 a 6,0 segundos, pero no estuvo lista durante el paso rápido. Las Stories warm medidas estuvieron preparadas antes de avanzar. El carrusel cold no mejoró consistentemente, y el warm tuvo misses de caché: la fila B terminó después del avance y la fila A no registró imagen completa mientras estuvo visible. No se garantiza sincronía de finalización cuando la red todavía está transfiriendo ambas piezas, ni se retrasó/cambió la animación para esconderlo.

Reducir las esperas residuales con estos originales requiere variantes históricas más livianas o más tiempo de anticipación. No se alteraron originales, Storage ni el sistema de variantes del administrador.

## 12. Bytes introducidos por la anticipación

La tercera Story, antes no solicitada al primer desplazamiento, adelantó **809140 bytes** en Fast cold y **378020 bytes** en Slow cold hasta ese punto. En Slow cold también habían llegado **22500 bytes** de la cuarta Story. Es transferencia adelantada que podría ser innecesaria si el usuario abandona temprano; no es una segunda descarga del recurso. El presupuesto de la tercera pieza de esta muestra es aproximadamente **809 kB**, sin contar headers.

En el carrusel Fast cold, preparar el próximo paso durante la entrada parcial adelantó **708221 + 466338 = 1174559 bytes** de la pieza 3 de ambas filas antes del primer desplazamiento medido. En Slow cold ese paso no había empezado a transferir bytes antes del primer desplazamiento. No se adelantó el carrusel entero al montar.

| Perfil / visita | Requests antes → después | Bytes de imágenes de Storage antes → después |
|---|---:|---:|
| Fast cold | 23 → 23 | 14623040 → 14622740 |
| Fast warm | 23 → 23 | 5420576 → 1399303 |
| Slow cold | 23 → 22 | 14622120 → 13807624 |
| Slow warm | 23 → 23 | 1280692 → 3512130 |

Son bytes de todo el recorrido, incluidos Posts y las primeras páginas del catálogo; no solo del preload. Los 300 bytes de diferencia Fast cold no son un ahorro atribuible a la estrategia. La menor transferencia Slow cold depende de una pieza que no se solicitó en ese recorrido; no se extrapola a todos los clientes. Warm varía según los hits efectivos de caché y fue peor en bytes en Slow 4G: la estrategia no garantiza reducir la transferencia de una segunda navegación.

El código añade aproximadamente **3,47 kB** al chunk de cliente, **1,15 kB gzip**. El bundle principal y los estilos no aumentaron.

## 13. Limpieza y memoria

La tabla de preparación mantiene únicamente la ventana cercana. Al salir de ella se eliminan listeners y prioridad alta; las fuentes ya admitidas pueden seguir reutilizando el recurso en el nodo/cache del navegador. No se mantiene un `Set` creciente de índices visitados.

Unmount, cambio de contenido/edición o deshabilitar la preparación desconectan el observador, eliminan listeners de `load`, `error` y scroll nativo, cancelan continuaciones de promesas y vacían las referencias de preparación. Al cambiar contenido en un nodo reutilizado se retiran las fuentes diferidas antiguas y el índice se reinicia. Los callbacks antiguos no pueden preparar la edición anterior.

Solo se inspeccionan imágenes montadas dentro de la sección activa. No se recorren las ediciones inactivas del cliente ni imágenes de otros clientes desde sus datos.

## 14. Archivos de esta tarea

| Archivo | Motivo |
|---|---|
| `src/components/media/useImageWarmPreload.js` | Ventana, prioridades, decode, proximidad y limpieza compartidas |
| `src/lib/imageWarmPreload.js` | Candidatos responsive estables y clave de contenido |
| `src/components/media/StorySequence.jsx` | Integrar la ventana de Stories; conservar intacta la lógica de VideoStory/audio |
| `src/components/media/CarouselPairs.jsx` | Preparar el siguiente paso de ambas filas |
| `src/components/media/CatalogPair.jsx` | Reutilizar la preparación en otra secuencia pública |
| `src/components/media/useImageWarmPreload.test.jsx` | Tests focalizados del helper/hook, fallbacks y ciclo de vida |
| `src/components/media/ImageSequences.test.jsx` | Regresiones de Stories, filas dobles, avance parcial y edición |
| `src/test/app.test.jsx` | Envolver las cuatro navegaciones programáticas existentes en `act()` para esperar la actualización de React |
| `IMAGE_LOADING_AUDIT.md` | Este informe |

Los tres componentes modificados ya tenían cambios sin commit al comenzar. Se conservaron esos cambios y el resto del workspace. No se editaron archivos de Admin, Database, Supabase, Storage, vídeos, audio, tipos de sección, ediciones ni estilos en esta tarea. El CSS de producción y `iphone.png` conservan el mismo hash que el baseline.

Los builds baseline, fixtures, scripts y registros de navegador quedan en `output/playwright/`, ignorado por Git. No contienen claves privadas.

## 15. Validación

- Se escribieron primero los tests de regresión; los tres casos originales fallaron con el código anterior. También se reprodujeron antes de corregirlos la asignación de fallback y el avance parcial de las dos filas.
- Se añadieron **21 tests focalizados**: activa/siguiente listas, preparación progresiva, prioridad lejana, ventana, fuentes estables, filas dobles/desiguales, edición, unmount, errores de decode/red, ausencia de APIs, responsive y scroll nativo.
- `npm test`: **41 archivos, 317 tests aprobados** en la pasada final, en 132,67 segundos. Incluye las pruebas existentes de dual-phone, VideoStory, vídeo/audio y ediciones. Dos comprobaciones de ruta existentes tuvieron timeouts intermitentes al observar el DOM anterior después de navegar fuera de `act()`. Se sincronizaron las cuatro navegaciones programáticas de ese archivo con React, conservando aserciones y timeouts; la pasada final aprobó ese ajuste.
- `npm run lint`: aprobado, sin avisos nuevos.
- `npm run build`: aprobado. Permanece el aviso previo del bundle principal de más de 500 kB. El chunk de cliente pasa de 29,67 a 33,14 kB; gzip de 8,09 a 9,24 kB.
- `git diff --check`: aprobado.

Trabajo local listo para revisión. **Sin commit, push ni deploy; pendiente de aprobación del usuario.**
