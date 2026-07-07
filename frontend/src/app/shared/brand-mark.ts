import { Component, Input } from '@angular/core';

let idSeq = 0;

@Component({
  selector: 'app-brand-mark',
  standalone: true,
  template: `
    <span class="brand" [class.lockup]="lockup" [style.--bm]="size + 'px'">
      <svg
        [attr.width]="size"
        [attr.height]="size"
        viewBox="0 0 48 48"
        role="img"
        aria-label="Malvezi"
      >
        <defs>
          <linearGradient [attr.id]="gid" x1="0" y1="48" x2="48" y2="0">
            <stop offset="0" stop-color="#6E4BFF" />
            <stop offset="1" stop-color="#2E86FF" />
          </linearGradient>
        </defs>
        <rect x="4" y="28" width="12" height="16" rx="3" [attr.fill]="fill" />
        <rect x="18" y="18" width="12" height="26" rx="3" [attr.fill]="fill" />
        <rect x="32" y="8" width="12" height="36" rx="3" [attr.fill]="fill" />
      </svg>
      @if (lockup) {
        <span class="nome" [class.claro]="branco">Malvezi</span>
      }
    </span>
  `,
  styles: [
    `
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }
      .nome {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        font-size: calc(var(--bm) * 0.52);
        letter-spacing: -0.01em;
        color: var(--tinta);
      }
      .nome.claro {
        color: #fff;
      }
    `,
  ],
})
export class BrandMark {
  @Input() size = 34;
  @Input() branco = false;
  @Input() lockup = false;

  gid = `bm-grad-${idSeq++}`;

  get fill(): string {
    return this.branco ? '#ffffff' : `url(#${this.gid})`;
  }
}
