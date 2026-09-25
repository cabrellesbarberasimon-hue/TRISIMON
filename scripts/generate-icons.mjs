import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW);
// Uso: PW=$(npm root -g)/playwright ROOT=$PWD node scripts/generate-icons.mjs
// Genera los iconos de la PWA desde public/icons/logo-original.png
const root = process.env.ROOT;
const logo = 'data:image/png;base64,' + readFileSync(`${root}/public/icons/logo-original.png`).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();
// scale = fracción del lado que ocupa el logo; rounded = esquinas redondeadas (icono "any")
const render = async (size, file, { scale = 0.86, rounded = false, transparent = false } = {}) => {
  await page.setViewportSize({ width: size, height: size });
  const radius = rounded ? size * 0.22 : 0;
  await page.setContent(`<html><body style="margin:0;background:transparent">
    <div style="width:${size}px;height:${size}px;background:${transparent ? 'transparent' : '#ffffff'};border-radius:${radius}px;display:flex;align-items:center;justify-content:center">
      <img src="${logo}" style="width:${size * scale}px;height:${size * scale}px;object-fit:contain">
    </div></body></html>`);
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${root}/public/icons/${file}`, omitBackground: true });
};
await render(192, 'icon-192.png', { scale: 0.88, rounded: true });
await render(512, 'icon-512.png', { scale: 0.88, rounded: true });
await render(512, 'icon-maskable-512.png', { scale: 0.7 }); // zona segura del 80 %
await render(180, 'apple-touch-icon.png', { scale: 0.84 });
await render(32, 'favicon-32.png', { scale: 1, transparent: true });
await browser.close();
