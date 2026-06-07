export type VdeView = 'desktop' | 'dashboard' | 'terminal' | 'webide';

export type DesktopApp = {
  id: string;
  label: string;
  icon: 'terminal' | 'code' | 'home' | 'globe' | 'shield' | 'zap' | 'building' | 'layout';
  action: 'view' | 'link';
  href?: string;
  view?: VdeView;
};
