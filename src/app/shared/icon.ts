import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'

const paths: Record<string, string> = {
  home: 'm3 10 9-7 9 7v11h-7v-7h-4v7H3z',
  bed: 'M3 18V6M3 14h18v4M3 10h6v4M9 8h9a3 3 0 0 1 3 3v3M3 18v3M21 18v3',
  bath: 'M3 12h18M4 12v4a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4M6 12V5a3 3 0 0 1 6 0M10 5h4M6 20v2M18 20v2',
  area: 'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M3 3l6 6M21 21l-6-6',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',
  handshake: 'M3 5h5l4 3 4-3h5v12l-5 3-5-3-3 1-5-3V5M8 5l-2 5 4 2 5-4M11 13l6 4M8 15l5 4',
  archive: 'M3 3h18v5H3zM5 8v13h14V8M10 12h4',
  sun: 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  pipeline: 'M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v12h-4z',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M19 8a3 3 0 0 1 0 6M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  building: 'M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M9 21v-3h2v3',
  check: 'M5 12l4 4L19 6',
  tasks: 'M9 5h11M9 12h11M9 19h11M3 4l1 1 2-2M3 11l1 1 2-2M3 18l1 1 2-2',
  chart: 'M4 3v17h17M8 15l4-5 4 2 5-7',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M10 2h4l1 3 3 1 3 2-2 4 2 4-3 2-3 1-1 3h-4l-1-3-3-1-3-2 2-4-2-4 3-2 3-1z',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14M15 15l6 6',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  arrowUp: 'M7 17 17 7M7 7h10v10',
  chevron: 'm8 10 4 4 4-4',
  left: 'm14 6-6 6 6 6',
  right: 'm10 6 6 6-6 6',
  down: 'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2M7 14h3M14 14h3M7 18h3',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 2',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  more: 'M5 11v2M12 11v2M19 11v2',
  close: 'M6 6l12 12M6 18 18 6',
  board: 'M3 4h5v16H3zM10 4h5v16h-5zM17 4h4v16h-4z',
  list: 'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
  filter: 'M4 7h16M7 12h10M10 17h4',
  mail: 'M3 5h18v14H3zM3 5l9 7 9-7',
  phone: 'M7 3H3c0 10 8 18 18 18v-4l-5-2-2 2-7-7 2-2z',
  note: 'M5 3h14v14l-4 4H5zM15 21v-4h4M8 8h8M8 12h5',
  sparkle: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17v.01',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 11v2',
  flag: 'M5 21V3M5 4c5-4 9 4 15 0v9c-6 4-10-4-15 0',
  grip: 'M9 5v.01M15 5v.01M9 12v.01M15 12v.01M9 19v.01M15 19v.01',
  menu: 'M4 6h16M4 12h16M4 18h16',
  refresh: 'M20 7a9 9 0 0 0-15-2L2 8M2 2v6h6M4 17a9 9 0 0 0 15 2l3-3M16 16h6v6',
  edit: 'm15 4 5 5M4 20l5-1L21 7l-5-5L4 14z',
}

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path()" /></svg>',
  styles: [
    ':host{display:inline-flex;width:18px;height:18px;flex-shrink:0;align-items:center;justify-content:center}svg{width:100%;height:100%}',
  ],
})
export class Icon {
  readonly name = input('grid')
  readonly path = computed(() => paths[this.name()] || paths['grid'])
}
