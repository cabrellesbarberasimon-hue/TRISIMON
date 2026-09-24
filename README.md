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

Instalación como PWA (disponible a partir de la fase 5):

- **Android (Chrome):** abre la URL → menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari):** abre la URL → botón compartir → *Añadir a pantalla de inicio*.

## Estructura

```
src/
  domain/      lógica pura y testeada (macros, zonas, perfil…)
  db/          modelo de datos (types.ts), esquema Dexie, valores por defecto y seed
  features/    pantallas por módulo (ajustes, nutricion, composicion, entreno, informes, dashboard)
  components/  componentes de interfaz reutilizables
  lib/         fechas y formato de números en español
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
5. Dashboard, gráficas, PWA y exportación/importación.
6. Informes para IA e importación de planes.
