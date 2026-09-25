import { useState } from 'react';
import { Button, Card } from '../../components/ui';
import { formatNumber } from '../../lib/format';
import { copyText, downloadMarkdown, downloadPdf, shareReport } from './output';

/** Salida del informe: copiar, compartir, descargar .md/.pdf y vista previa */
export function ReportView({ markdown, words, filename }: { markdown: string; words: number; filename: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  };
  return (
    <Card title="Informe" action={<span className="text-xs text-slate-500">≈ {formatNumber(words)} palabras</span>}>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button onClick={async () => flash((await copyText(markdown)) ? 'Copiado al portapapeles' : 'No se pudo copiar')}>Copiar</Button>
        <Button
          variant="secondary"
          onClick={async () => {
            const r = await shareReport(markdown, `${filename}.md`);
            if (r === 'unsupported') flash('Este navegador no permite compartir: usa Copiar');
          }}
        >
          Compartir…
        </Button>
        <Button variant="secondary" onClick={() => downloadMarkdown(markdown, `${filename}.md`)}>
          Descargar .md
        </Button>
        <Button variant="secondary" onClick={() => downloadPdf(markdown, `${filename}.pdf`)}>
          Descargar .pdf
        </Button>
      </div>
      {msg && <p className="mb-2 rounded-lg bg-brand-50 p-2 text-center text-sm text-brand-800">{msg}</p>}
      <p className="mb-2 text-xs text-slate-500">
        Pega o comparte el informe en Claude o ChatGPT. Cuando te devuelva el plan, impórtalo en la pestaña "Importar plan".
      </p>
      <pre className="max-h-[60vh] overflow-auto rounded-xl bg-slate-50 p-3 text-xs leading-relaxed whitespace-pre-wrap">{markdown}</pre>
    </Card>
  );
}
