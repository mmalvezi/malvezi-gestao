import { Injectable, signal } from '@angular/core';

export interface ConfirmOpts {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger';
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  pedido = signal<ConfirmOpts | null>(null);
  private resolver?: (v: boolean) => void;

  ask(opts: ConfirmOpts): Promise<boolean> {
    this.pedido.set(opts);
    return new Promise<boolean>((resolve) => (this.resolver = resolve));
  }

  responder(valor: boolean) {
    this.pedido.set(null);
    const r = this.resolver;
    this.resolver = undefined;
    r?.(valor);
  }
}
