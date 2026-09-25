import { z } from 'zod';
import { TABLE_NAMES, type TableName, type TriDB } from './db';
import type { Attachment } from './types';

export const BACKUP_APP = 'trisimon';
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  tables: Partial<Record<TableName, unknown[]>>;
}

/** Adjuntos en JSON: el Blob se guarda como data URL (base64) */
type SerializedAttachment = Omit<Attachment, 'blob'> & { dataUrl: string };

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(bin)}`;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) throw new Error('Adjunto con formato no válido');
  const bytes = m[2] ? Uint8Array.from(atob(m[3]!), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(m[3]!));
  return new Blob([bytes], { type: m[1] || 'application/octet-stream' });
}

export async function createBackup(db: TriDB): Promise<Backup> {
  const tables: Backup['tables'] = {};
  for (const name of TABLE_NAMES) {
    const rows = await db.table(name).toArray();
    tables[name] =
      name === 'attachments'
        ? await Promise.all((rows as Attachment[]).map(async ({ blob, ...a }) => ({ ...a, dataUrl: await blobToDataUrl(blob) })))
        : rows;
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables };
}

const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.number().int().positive(),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export interface BackupSummary {
  exportedAt: string;
  counts: Partial<Record<TableName, number>>;
}

/** Valida el JSON de una copia. Lanza un Error con un mensaje en español si no es válida. */
export function parseBackup(text: string): Backup & BackupSummary {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const r = backupSchema.safeParse(raw);
  if (!r.success) throw new Error('El archivo no es una copia de seguridad de TriSimon.');
  if (r.data.version > BACKUP_VERSION) throw new Error('La copia es de una versión más nueva de la app. Actualiza la app antes de importarla.');
  const unknownTables = Object.keys(r.data.tables).filter((t) => !(TABLE_NAMES as readonly string[]).includes(t));
  if (unknownTables.length) throw new Error(`La copia contiene tablas desconocidas: ${unknownTables.join(', ')}`);
  if (!r.data.tables.settings?.length) throw new Error('La copia no contiene los ajustes.');
  const counts = Object.fromEntries(Object.entries(r.data.tables).map(([k, v]) => [k, v.length])) as BackupSummary['counts'];
  return { ...(r.data as Backup), counts };
}

/** Sustituye TODOS los datos por los de la copia */
export async function restoreBackup(db: TriDB, backup: Backup): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const name of TABLE_NAMES) {
      const table = db.table(name);
      await table.clear();
      const rows = backup.tables[name] ?? [];
      const toPut =
        name === 'attachments'
          ? (rows as SerializedAttachment[]).map(({ dataUrl, ...a }) => ({ ...a, blob: dataUrlToBlob(dataUrl) }))
          : rows;
      if (toPut.length) await table.bulkPut(toPut);
    }
  });
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `trisimon-copia-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}
