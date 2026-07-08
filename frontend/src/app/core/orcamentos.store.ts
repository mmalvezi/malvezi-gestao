import { Injectable, inject, signal } from '@angular/core';

import { ApiService } from './api.service';
import { Orcamento } from './models';

/**
 * Fonte unica dos orcamentos. A lista e o card do projeto leem o mesmo signal,
 * entao um orcamento criado em qualquer lugar aparece na hora nos dois.
 */
@Injectable({ providedIn: 'root' })
export class OrcamentosStore {
  private api = inject(ApiService);

  orcamentos = signal<Orcamento[]>([]);
  carregando = signal(false);

  carregar() {
    this.carregando.set(true);
    this.api.getOrcamentos().subscribe({
      next: (l) => {
        this.orcamentos.set(l);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  /** Insere (novo) ou substitui (editado) mantendo a ordem por criacao. */
  upsert(o: Orcamento) {
    const arr = this.orcamentos();
    const i = arr.findIndex((x) => x.id === o.id);
    if (i >= 0) {
      const copia = [...arr];
      copia[i] = o;
      this.orcamentos.set(copia);
    } else {
      this.orcamentos.set([o, ...arr]);
    }
  }

  remover(id: number) {
    this.orcamentos.set(this.orcamentos().filter((x) => x.id !== id));
  }
}
