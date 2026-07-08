import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiService } from './api.service';

/**
 * Conjunto de alertas dispensados (chave "{tipo}:{id}:{motivo}"). O painel filtra
 * qualquer pendencia cuja chave esteja aqui. Dispensar nao altera o registro por
 * baixo, so esconde o alerta.
 */
@Injectable({ providedIn: 'root' })
export class AlertasStore {
  private api = inject(ApiService);

  private chaves = signal<string[]>([]);
  erro = signal<string | null>(null);

  dispensados = computed(() => new Set(this.chaves()));

  carregar() {
    this.api.getAlertasDispensados().subscribe({
      next: (l) => this.chaves.set(l),
      error: () => {},
    });
  }

  dispensado(chave: string): boolean {
    return this.dispensados().has(chave);
  }

  quantidade(): number {
    return this.chaves().length;
  }

  /** Otimista: esconde na hora e persiste em background; reverte se falhar. */
  dispensar(chave: string) {
    if (this.dispensado(chave)) return;
    const antes = this.chaves();
    this.chaves.set([...antes, chave]);
    this.api.dispensarAlerta(chave).subscribe({
      error: () => {
        this.chaves.set(antes);
        this.avisar('Nao foi possivel dispensar o alerta. Tente de novo.');
      },
    });
  }

  reexibir(chave: string) {
    const antes = this.chaves();
    this.chaves.set(antes.filter((c) => c !== chave));
    this.api.reexibirAlerta(chave).subscribe({
      error: () => {
        this.chaves.set(antes);
        this.avisar('Nao foi possivel reexibir o alerta.');
      },
    });
  }

  private avisar(msg: string) {
    this.erro.set(msg);
    setTimeout(() => this.erro.set(null), 4000);
  }
}
