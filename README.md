# TriSimon

App web personal (PWA) de nutrición, composición corporal y entrenamiento para preparar el
Triatlón Olímpico de Valencia 2027. Sustituye al Excel `APP_SIMON_DIETA.xlsx` replicando su lógica.

- React + Vite + TypeScript + Tailwind, gráficas con Recharts.
- Datos solo en el dispositivo (IndexedDB con Dexie). Sin backend ni login.
- Interfaz en español, coma decimal, semanas de lunes a domingo.

## Arrancar en local

Requisitos: Node 20 o superior.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitarios (Vitest)
npm run build      # compilación de producción en dist/
npm run preview    # sirve dist/ en http://localhost:4173
```

Para verlo desde el móvil en la misma red wifi: `npm run dev -- --host` y abre en el móvil la
dirección `http://<IP-del-ordenador>:5173`.

## Publicar e instalar en el móvil

La app se despliega en GitHub Pages con `.github/workflows/deploy.yml` en cada push a `main`
(o a mano desde la pestaña *Actions*). Primera vez: en GitHub, *Settings → Pages → Build and
deployment → Source: GitHub Actions*. La URL será `https://<usuario>.github.io/TRISIMON/`.

Los datos no salen del móvil: la web solo sirve el código.

Instalación como PWA (funciona sin conexión una vez instalada):

- **Android (Chrome):** abre la URL → menú ⋮ → *Instalar aplicación* (o *Añadir a pantalla de inicio*).
- **iPhone (Safari):** abre la URL → botón compartir → *Añadir a pantalla de inicio*. En iOS
  instálala siempre desde Safari: los datos de la app instalada son independientes de los de la
  pestaña del navegador.

Las actualizaciones se descargan solas: al publicar una versión nueva, basta con cerrar y volver
a abrir la app.

## Copias de seguridad

Los datos viven solo en el dispositivo (IndexedDB). En *Ajustes → Datos*:

- **Exportar copia**: descarga un `.json` con todo, capturas incluidas. Guárdalo en Drive, en el
  correo, etc. La pantalla de inicio avisa si hace más de 14 días de la última copia.
- **Importar copia**: valida el archivo, muestra su contenido y, si confirmas, sustituye los
  datos del dispositivo (sirve también para pasar los datos a otro móvil).
- **Descargar Excel**: un `.xlsx` con una hoja por tipo de dato para analizarlo fuera de la app.

Si borras los datos del navegador o desinstalas la app, se pierde todo lo que no esté en una copia.

## Informes para IA (Claude / ChatGPT)

1. **Inicio → Generar informe para IA** (o pestaña *Informes*): elige el tipo (revisión semanal,
   bloque de 4 semanas, solo entrenamiento, solo composición y nutrición) y el periodo.
2. El informe en Markdown empieza con el prompt (editable en *Ajustes → Informes para IA*) y
   sigue con contexto, composición, pliegues, nutrición, entreno, bienestar, alertas automáticas y
   el plan ya previsto. Opcionalmente añade un anexo JSON con los datos crudos.
3. **Copiar**, **Compartir** (en el móvil se envía directamente a la app de Claude o ChatGPT),
   **.md** o **.pdf**. Los informes quedan en el *Histórico*.
4. Pega la respuesta de la IA en **Importar plan**: la app extrae el bloque ```json, lo valida,
   muestra la vista previa y lo carga en la planificación (sustituyendo o combinando). Los tipos de
   día de nutrición se recalculan y el texto de la respuesta se guarda como recomendaciones de esa
   semana (visible en *Entreno → Semana*).

Esquema del plan (lo pide el propio prompt):

```json
{
  "version": 1,
  "sesiones": [
    { "fecha": "2026-10-05", "deporte": "carrera", "tipo": "Series", "duracion_min": 60, "distancia_km": 11,
      "intensidad": "Z4", "descripcion": "…", "bloques": ["15' Z1-Z2", "5×1000 m a ritmo 10K", "10' Z1"] },
    { "fecha": "2026-10-06", "deporte": "gimnasio", "tipo": "Fuerza", "duracion_min": 50,
      "fuerza": [{ "ejercicio": "Sentadilla", "series": 4, "reps": 6, "carga_kg": 70 }] }
  ]
}
```

`deporte`: natacion, bici, carrera, brick, gimnasio, movilidad o descanso (acepta variantes como
"natación", "ciclismo" o "fuerza").

## Estructura

```
src/
  domain/      lógica pura y testeada (macros, zonas, perfil…)
  db/          modelo de datos (types.ts), esquema Dexie, valores por defecto y seed
  features/    pantallas por módulo (ajustes, nutricion, composicion, entreno, informes, dashboard)
  components/  componentes de interfaz reutilizables
  lib/         fechas y formato de números en español
public/icons/  iconos de la PWA (generados desde icon.svg)
scripts/
  extract_excel.py   regenera src/db/seed/excelData.ts desde el Excel (requiere openpyxl)
```

## Datos iniciales (seed)

Al abrir la app por primera vez se cargan:

- Los 4 tipos de día con sus rangos, los 24 alimentos del Excel (nueces y copos de avena como
  excluidos) y 4 alimentos añadidos con valores orientativos (verdura salteada, ternera magra,
  salmón, pescado blanco).
- La semana del 31/08/2026 al 06/09/2026 con sus menús y tipos de día. La parte fija de cada
  cena se guarda como "línea libre" con los valores exactos del Excel, para que totales,
  semáforo y gramos de la cena coincidan con él.
- El primer registro de báscula (24/09/2026) y una biblioteca básica de ejercicios.

Todo es editable desde la app. *Ajustes → Datos → Restablecer* vuelve a este estado inicial.

## Fases

1. ✅ Estructura, modelo de datos, seed desde el Excel y ajustes (perfil deportivo, tests, zonas).
2. ✅ Módulo de nutrición completo (totales, semáforo y gramos de la cena verificados contra el Excel).
3. ✅ Composición corporal y pliegues.
4. ✅ Entrenamiento: planificación, registro y conexión con la nutrición.
5. ✅ Dashboard, gráficas, PWA y exportación/importación.
6. ✅ Informes para IA e importación de planes.
