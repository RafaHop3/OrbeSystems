export type VdeView = 'desktop' | 'terminal' | 'webide';

export type DesktopApp = {
  id: string;
  label: string;
  icon: 'terminal' | 'code' | 'home' | 'globe' | 'shield' | 'zap' | 'building';
  action: 'view' | 'link';
  href?: string;
  view?: VdeView;
};
