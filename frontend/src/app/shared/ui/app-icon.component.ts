import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

const paths = {
  fleet: 'M3 14V9l2-5h14l2 5v9h-3v-3H6v3H3v-4Zm0-5h18M6 12h2m8 0h2',
  mission: 'M5 4h14v16H5zM8 8h8m-8 4h8m-8 4h5',
  inspection: 'm5 12 4 4L19 6M12 3H4v18h16v-9',
  register: 'M3 7h7l2 2h9v11H3zM3 7V4h7l2 3',
  report: 'M4 20V4h16v16H4Zm4-4v-4m4 4V8m4 8v-6',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5 1 2.3 2.3.9 2.2-1 .9 2.2 2.3 1v2.5l-2.3 1-1 2.2-2.2.9L12 21l-1-2.3-2.2-.9-2.3 1-1-2.2-2.2-.9v-2.5l2.2-1 1-2.2-1-2.2 2.3-1 2.2.9L12 3Z',
  arrow: 'm9 5 7 7-7 7',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
  plus: 'M12 5v14M5 12h14',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
  history: 'M3 4v6h6M3 10a9 9 0 1 1 2 8m7-11v5l3 2',
  logout: 'M9 4H4v16h5m6-12 4 4-4 4M9 12h10',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-3a6 6 0 0 1 6-5h4a6 6 0 0 1 6 5v3',
  drag: 'M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01'
} as const;

export type AppIconName = keyof typeof paths;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path [attr.d]="path" /></svg>',
  styles: ':host { display: inline-flex; width: 20px; height: 20px; flex-shrink: 0; } svg { width: 100%; height: 100%; }',
  host: { 'aria-hidden': 'true' }
})
export class AppIconComponent {
  @Input({ required: true }) name: AppIconName = 'fleet';
  get path(): string { return paths[this.name]; }
}
