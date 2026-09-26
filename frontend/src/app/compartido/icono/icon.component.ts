import { Component, Input } from '@angular/core';

export type IconName =
  | 'home'
  | 'users'
  | 'calendar'
  | 'clipboard'
  | 'energy'
  | 'activity'
  | 'menu'
  | 'food'
  | 'dish'
  | 'report'
  | 'send'
  | 'settings'
  | 'bell'
  | 'plus'
  | 'menuLines'
  | 'search'
  | 'arrow'
  | 'check'
  | 'clock'
  | 'edit'
  | 'download'
  | 'mail'
  | 'phone'
  | 'info'
  | 'leaf'
  | 'close'
  | 'trash'
  | 'eye'
  | 'eyeOff'
  | 'lock'
  | 'shield'
  | 'userPlus'
  | 'refresh';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: ` <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    @switch (name) {
      @case ('home') {
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      }
      @case ('users') {
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      }
      @case ('calendar') {
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
        <path d="m9 15 2 2 4-4" />
      }
      @case ('clipboard') {
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4" />
      }
      @case ('energy') {
        <path d="m13 2-9 12h8l-1 8 9-12h-8z" />
      }
      @case ('activity') {
        <path d="M3 12h4l2-5 4 10 2-5h6" />
      }
      @case ('menu') {
        <path d="M4 5h16M4 12h16M4 19h16" />
        <circle cx="7" cy="5" r="2" fill="currentColor" stroke="none" />
      }
      @case ('food') {
        <path d="M5 3v8M8 3v8M5 7h3M6.5 11v10M15 3v18M15 3c4 2 4 7 0 9" />
      }
      @case ('dish') {
        <path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 8v3M9 8h6" />
        <path d="M3 20h18" />
      }
      @case ('report') {
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      }
      @case ('send') {
        <path d="m22 2-7 20-4-9-9-4zM22 2 11 13" />
      }
      @case ('settings') {
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1.03-1.56V3h4v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.56 1.03H21v4h-.09A1.7 1.7 0 0 0 19.4 15z"
        />
      }
      @case ('bell') {
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      }
      @case ('plus') {
        <path d="M12 5v14M5 12h14" />
      }
      @case ('menuLines') {
        <path d="M4 6h16M4 12h16M4 18h16" />
      }
      @case ('search') {
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      }
      @case ('arrow') {
        <path d="m9 18 6-6-6-6" />
      }
      @case ('check') {
        <path d="m5 12 4 4L19 6" />
      }
      @case ('clock') {
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      }
      @case ('edit') {
        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
      }
      @case ('download') {
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
      }
      @case ('mail') {
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      }
      @case ('phone') {
        <path
          d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13 1 .37 2 .7 2.9a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.45c.94.34 1.91.57 2.9.7A2 2 0 0 1 22 16.9z"
        />
      }
      @case ('info') {
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      }
      @case ('leaf') {
        <path d="M20 4C11 4 5 8 4 20c4-6 8-8 14-10" />
        <path d="M4 20c4-2 7-2 10-1" />
      }
      @case ('close') {
        <path d="m6 6 12 12M18 6 6 18" />
      }
      @case ('trash') {
        <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
      }
      @case ('eye') {
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      }
      @case ('eyeOff') {
        <path
          d="m3 3 18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.1 2.8M6.6 6.6C3.6 8.5 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8M9.9 9.9a3 3 0 0 0 4.2 4.2"
        />
      }
      @case ('lock') {
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      }
      @case ('shield') {
        <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      }
      @case ('userPlus') {
        <path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8" cy="7" r="4" />
        <path d="M19 8v6M16 11h6" />
      }
      @case ('refresh') {
        <path d="M20 6v5h-5" />
        <path d="M4 18v-5h5" />
        <path d="M18.4 9A7 7 0 0 0 6.1 6.1L4 8" />
        <path d="M5.6 15A7 7 0 0 0 17.9 17.9L20 16" />
      }
    }
  </svg>`,
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
}
