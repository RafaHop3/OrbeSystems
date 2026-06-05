import type { Metadata } from 'next';
import VdeShell from '@/components/vde/VdeShell';

export const metadata: Metadata = {
  title: 'Orbe Workspace | VDE — Virtual Desktop Environment',
  description:
    'Ambiente virtual no navegador: Desktop, Terminal e WebIDE. Engenharia cirúrgica e cyber safety sem IDEs pesadas.',
  robots: { index: true, follow: true },
};

export default function WorkspacePage() {
  return <VdeShell />;
}
