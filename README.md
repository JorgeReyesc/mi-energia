# Mi Energía

PWA para registrar el día (ánimo, energía, sueño, comidas, agua, cafeína, suplementos, ejercicio, estrés) y analizar qué se relaciona con la falta de energía.

Los datos se guardan solo en el dispositivo (localStorage). Desde Ajustes se puede exportar un respaldo JSON o un CSV.

Probar en local:

```bash
node serve.js
```

y abrir http://localhost:5173.

Al cambiar archivos, sube la versión de `CACHE` en `sw.js` para que los celulares descarguen la nueva versión.
