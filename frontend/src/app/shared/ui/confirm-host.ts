import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-host',
  standalone: true,
  template: `
    @if (svc.pedido(); as p) {
      <div class="overlay confirm-overlay" (click)="fundo($event)">
        <div class="dialog confirm-dialog" role="alertdialog" aria-modal="true">
          <div class="dialog-body">
            <h3 class="titulo">{{ p.title }}</h3>
            <p class="mut msg">{{ p.message }}</p>
          </div>
          <div class="dialog-foot">
            <button class="btn ghost" (click)="svc.responder(false)">
              {{ p.cancelText || 'Cancelar' }}
            </button>
            <button
              #ok
              class="btn"
              [class.primary]="p.tone !== 'danger'"
              [class.danger]="p.tone === 'danger'"
              (click)="svc.responder(true)"
            >
              {{ p.confirmText || 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .confirm-overlay {
        z-index: 120;
        align-items: center;
      }
      .confirm-dialog {
        max-width: 420px;
      }
      .titulo {
        margin-bottom: 8px;
      }
      .msg {
        white-space: pre-wrap;
        font-size: 14px;
      }
    `,
  ],
})
export class ConfirmHost {
  svc = inject(ConfirmService);
  @ViewChild('ok') ok?: ElementRef<HTMLButtonElement>;

  constructor() {
    effect(() => {
      if (this.svc.pedido()) {
        setTimeout(() => this.ok?.nativeElement.focus());
      }
    });
  }

  @HostListener('document:keydown.escape')
  aoEsc() {
    if (this.svc.pedido()) this.svc.responder(false);
  }

  fundo(ev: MouseEvent) {
    if ((ev.target as HTMLElement).classList.contains('overlay')) {
      this.svc.responder(false);
    }
  }
}
