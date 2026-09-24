import { Card, PageHeader } from '../components/ui';

export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <p className="text-sm text-slate-600">Este módulo llega en la fase {phase}.</p>
      </Card>
    </>
  );
}

export function ReportsSoon() {
  return <ComingSoon title="Informes para IA" phase={6} />;
}
