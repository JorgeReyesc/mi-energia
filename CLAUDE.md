# Mi Energía

PWA personal para registrar el día (ánimo/energía, sueño, agua, comidas con nutrición, cafeína y otros activos, suplementos con dosis, ejercicio, sol, estrés, síntomas) y analizar qué se relaciona con la falta de energía. Todo en español (México).

- En línea: https://jorgereyesc.github.io/mi-energia/
- Repositorio: https://github.com/JorgeReyesc/mi-energia (público), rama `main`.

## Archivos

- `index.html`: estructura y navegación inferior (Hoy, Análisis, Historial, Ajustes).
- `app.js`: estado, vistas, eventos, análisis y exportación. Sin frameworks: cada vista devuelve HTML como texto y `render()` lo dibuja; los clics se manejan con `data-act`.
- `foods.js`: base de alimentos con valores por porción (kcal, proteína, carbohidratos, azúcares, grasa, grasa saturada, fibra, sodio) y banderas que se convierten en etiquetas.
- `sync.js`: sincronización entre dispositivos (ver abajo).
- `sw.js`: service worker (red primero, caché sin internet).
- `styles.css`, `manifest.webmanifest`, `icon-*.png`.
- `serve.js`: servidor local (`node serve.js` → http://localhost:5173). La vista previa está en `.claude/launch.json` como `mi-energia`.

## Publicar un cambio

1. Sube **juntos** `CACHE` en `sw.js` (`mi-energia-vN`) y `APP_VERSION` en `app.js` (`'N'`). Sin esto los teléfonos siguen con la versión anterior.
2. Si agregas un archivo que la app carga, añádelo a `ASSETS` en `sw.js`.
3. Revisa la sintaxis con `node --check app.js` (y los demás `.js` que toques).
4. Prueba en la vista previa local. Si el service worker sirve una versión vieja, desregístralo y borra cachés antes de recargar.
5. Haz commit y push a `main`. GitHub Pages publica en 1–2 minutos; confirma con `gh api repos/JorgeReyesc/mi-energia/pages/builds/latest`.

## Datos y migraciones

- Todo vive en `localStorage` (clave `energia.v1`). Cada día está en `S.days['AAAA-MM-DD']`.
- Recetas del usuario en `S.recipes` (`{ id, n, portions, items }`); al usarlas se agregan sus ingredientes ya divididos entre las porciones. Cada comida guarda copia de los valores (`items[].v`), así que cambiar `foods.js` o una receta no altera el historial.
- Si agregas una sección nueva a `S` que deba sincronizarse, súmala a `META_PARTS` en `sync.js` y consérvala en "Borrar todos los datos" y "Restaurar respaldo".
- La app ya está en uso con datos reales: al cambiar la forma de los datos, agrega una migración al cargar (junto a las existentes al inicio de `app.js`) y no rompas registros anteriores (por ejemplo, suplementos guardados como texto en lugar de objeto, cafeína sin `mg`).
- Para productos o valores de inicio que cambian después, usa migraciones que no regresen lo que el usuario ya quitó o editó (ver `caffDefaultsSeen`).

## Sincronización

- Forma principal: iniciar sesión con Google. Supabase, proyecto **manos-libres** (`utclwftzsyjrxplzdalt`), tabla `public.mi_energia_user_data` con RLS (cada usuario solo su fila).
- Alternativa sin cuenta: enlace `#sync=código`, tabla `public.mi_energia_sync` y funciones `mi_energia_get` / `mi_energia_put` / `mi_energia_delete` (revocar).
- Acceso para un asistente (IA): con Google activo, `S.settings.assistCode` guarda un código de enlace; cada sincronización combina también esa copia, así lo que cambie el asistente llega a todos los dispositivos. Las instrucciones para el asistente están en `ASSISTANT.md` (público; nunca pongas ahí el código). Si cambias el formato de los datos, actualiza `ASSISTANT.md`.
- Cada día y sección de ajustes guarda la hora de su último cambio en `S._u`; al combinar gana el más reciente. `S.ui` (secciones abiertas) es de cada dispositivo y no se sincroniza.
- Cliente OAuth de Google "Mi Energía web" en el proyecto de Google Cloud `mi-energia-515005` (modo prueba).
- La llave publishable de Supabase en `sync.js` es pública a propósito; nunca pongas secretos (service role, secreto de OAuth) en el código.

## Reglas

- El repositorio es público: no pongas datos personales del usuario (peso, medicamentos, registros) en el código ni en los commits. Sus valores van en Ajustes, dentro de la app.
- Valores de salud y nutrición son referencias generales para adultos; muestra siempre que son aproximados y que su médico puede indicar otra cosa.
- Pesas en libras (lb) por defecto; peso corporal en kg.
- Interfaz pensada para teléfono: secciones desplegables en Hoy, sin desbordes horizontales.
- Para un proyecto nuevo que necesite backend, el usuario prefiere Firebase (su Supabase gratis ya llegó al límite de proyectos).
