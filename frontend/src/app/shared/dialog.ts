import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-dialog',
  standalone: true,
  template: `
    <div class="overlay" [style.zIndex]="zIndex" (click)="fundo($event)">
      <div class="dialog" [style.maxWidth.px]="largura">
        <div class="dialog-head">
          <h3>{{ titulo }}</h3>
          <button class="icon-btn" (click)="fechar.emit()" aria-label="Fechar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <ng-content></ng-content>
        </div>
        <div class="dialog-foot">
          <ng-content select="[foot]"></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class Dialog {
  @Input() titulo = '';
  @Input() largura = 620;
  /** Sobrepor a um overlay de documento (z-index 80): passar 90. */
  @Input() zIndex?: number;
  @Output() fechar = new EventEmitter<void>();

  fundo(ev: MouseEvent) {
    if ((ev.target as HTMLElement).classList.contains('overlay')) {
      this.fechar.emit();
    }
  }
}
