# Mi Energía: acceso para asistentes

Instrucciones para un asistente (por ejemplo, una IA) al que el usuario le dio su **código de acceso** de Mi Energía. Con ese código puedes leer y modificar los datos del usuario. El código **no** está en este documento: el usuario te lo da aparte.

Haz cambios **solo cuando el usuario te lo pida**, y dile qué cambiaste.

## API

Base: `https://utclwftzsyjrxplzdalt.supabase.co/rest/v1/rpc/`

Encabezados en todas las llamadas:

```
apikey: sb_publishable_ry_cXttEc3PnH8F__sEKhA_Svj-h5gh
Content-Type: application/json
```

(Esa llave es pública; lo que protege los datos es el código.)

### Leer

```
POST /rest/v1/rpc/mi_energia_get
{"p_key": "<código>"}
```

Devuelve el estado completo (JSON) o `null` si el código no tiene datos (aún no se sincroniza o fue revocado).

### Guardar

```
POST /rest/v1/rpc/mi_energia_put
{"p_key": "<código>", "p_data": <estado completo>}
```

Reemplaza el estado completo. Devuelve la hora del servidor.

### Ejemplo

```bash
curl -s -X POST https://utclwftzsyjrxplzdalt.supabase.co/rest/v1/rpc/mi_energia_get \
  -H "apikey: sb_publishable_ry_cXttEc3PnH8F__sEKhA_Svj-h5gh" \
  -H "Content-Type: application/json" \
  -d '{"p_key":"<código>"}'
```

## Cómo modificar sin perder datos

Los dispositivos del usuario combinan su copia con la tuya: **por cada día y cada sección gana el cambio con la hora más reciente** en `_u`.

1. **Lee** el estado justo antes de modificar.
2. Cambia **solo** lo necesario. No borres campos que no entiendas.
3. Por cada día que cambies, pon la hora actual en milisegundos: `_u["d:AAAA-MM-DD"] = Date.now()`. Si cambias una sección, igual: `_u["settings"]`, `_u["recipes"]`, `_u["customFoods"]`, `_u["caffProducts"]`, `_u["experiments"]`.
4. **Guarda** el estado completo con `mi_energia_put`.
5. Los cambios aparecen en los dispositivos del usuario la próxima vez que abran la app (o en segundos si la tienen abierta).

Si no actualizas `_u`, tu cambio se pierde en la siguiente sincronización.

No modifiques `settings.assistCode`: si lo borras, revocas tu propio acceso.

## Formato de los datos

Fechas `AAAA-MM-DD` y horas `HH:MM` (24 h) en hora local del usuario (México). Cada registro dentro de una lista lleva un `id` único (texto aleatorio corto).

```jsonc
{
  "days": {
    "2026-11-17": {
      "sleep": { "bed": "23:30", "wake": "07:00", "q": 3, "wakeups": 1 },   // q: calidad 1–5 (0 = sin dato)
      "checkins": [ { "id": "…", "t": "09:00", "mood": 3, "energy": 2, "note": "" } ], // 1–5
      "meals": [ {
        "id": "…", "t": "14:00", "type": "Comida",   // Desayuno | Colación | Comida | Merienda | Cena
        "desc": "Sándwich de pavo",
        "tags": ["proteina", "verduras"],            // proteina verduras integral harinas azucar procesado frito lacteos abundante
        "items": [ { "n": "Pan multigrano", "u": "1 rebanada", "q": 2, "v": [90, 4, 15, 2, 1.5, 0.3, 2.5, 150] } ]
      } ],
      "water": 1500,                                 // ml
      "caffeine": [ { "id": "…", "t": "08:00", "kind": "Café americano", "u": "1 taza (240 ml)", "mg": 95, "other": "", "q": 1 } ],
      "supps": { "Creatina": { "t": "08:00", "dose": 5, "unit": "g" } },
      "exercise": [ { "id": "…", "t": "19:00", "kind": "Pesas", "min": 60, "int": 2,            // int: 1 suave, 2 moderada, 3 intensa
                      "sets": [ { "ex": "Press de banca", "reps": 10, "kg": 135, "u": "lb" } ] } ],
      "sun": 20,                                     // minutos
      "stress": 3,                                   // 1–5 (0 = sin dato)
      "alcohol": 0,                                  // bebidas
      "screens": false,                              // pantallas la última hora antes de dormir
      "symptoms": ["Niebla mental"],
      "notes": ""
    }
  },
  "settings": { "...": "metas, suplementos, dosis, peso, unidades" },
  "recipes": [ { "id": "…", "n": "Pasta con atún", "portions": 4, "items": [ /* como meals.items */ ] } ],
  "customFoods": [ { "n": "…", "u": "…", "v": [ /* 8 valores */ ] } ],
  "caffProducts": [ { "id": "…", "n": "…", "u": "…", "mg": 0, "other": "Paracetamol 500 mg" } ],
  "experiments": [ { "id": "…", "name": "…", "start": "AAAA-MM-DD", "end": "AAAA-MM-DD" } ],
  "_u": { "d:2026-11-17": 1795000000000, "settings": 1795000000000 },
  "_wiped": 0
}
```

- `items[].v` (nutrientes **por unidad**, se multiplican por `q`): `[kcal, proteína g, carbohidratos g, azúcares g, grasa g, grasa saturada g, fibra g, sodio mg]`.
- `caffeine[].mg` es por unidad; el total es `mg × q`. `other` lista otros activos por unidad, como `"Paracetamol 500 mg, Fenilefrina 5 mg"`.
- `kind` de ejercicio: Caminar, Cardio, Pesas, Flag QB, Flag Receptor, Futsal, Deporte, Yoga/estiramiento, Otro.
- Un día puede faltar o tener listas vacías; trata los campos ausentes como vacíos.
