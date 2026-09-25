# TriSimon — guía para Claude

App web personal (PWA) de nutrición, composición corporal y entrenamiento de Simon para el
Triatlón Olímpico de Valencia 2027. Todo en español, con coma decimal y semanas de lunes a domingo.
Ver `README.md` para la arquitectura y el funcionamiento.

## Publicación: directamente en `main`

- La app está en **https://trisimon.vercel.app**. Vercel publica automáticamente cada push a `main`.
- El usuario autorizó (25/09/2026) que los cambios se suban **directamente a `main`**, sin PR, para
  no tener que fusionar cada cambio. En cada conversación nueva, confirma con el usuario que sigue
  queriendo publicar así antes del primer push a `main`.
- Si la conversación asigna una rama de trabajo, desarrolla allí y, al terminar, lleva los cambios a
  `main` (`git checkout main && git merge --ff-only <rama>` o merge normal) y haz push de `main`.

## Antes de cada push a `main` (obligatorio)

```bash
npm run typecheck   # tsc sin errores
npm test            # todos los tests de Vitest en verde
npm run build       # compilación de producción correcta
```

Si algo falla, no se publica. Si una versión publicada falla, se puede volver atrás en
Vercel → Deployments → "⋯" → Promote sobre una versión anterior.

## Convenciones

- Lógica de cálculo pura y testeada en `src/domain/`; las pantallas en `src/features/` solo leen,
  llaman a esas funciones y pintan. Cada regla nueva lleva su test.
- Los datos viven solo en el dispositivo (IndexedDB/Dexie). Nada de backend.
- Nada hardcodeado salvo el seed: umbrales, rangos y objetivos van en Ajustes (`src/db/defaults.ts`).
- Cambios en el esquema de Dexie: nueva `version()` en `src/db/db.ts`, nunca modificar la existente,
  para no romper los datos que ya tiene el usuario en el móvil.
- Réplica del Excel: los totales, semáforo (8 %) y gramos de la cena deben seguir coincidiendo con
  `APP_SIMON_DIETA.xlsx` (tests en `src/domain/nutrition.test.ts` y `macros.test.ts`).
- Iconos de la PWA: se regeneran desde `public/icons/logo-original.png` con
  `scripts/generate-icons.mjs`.
