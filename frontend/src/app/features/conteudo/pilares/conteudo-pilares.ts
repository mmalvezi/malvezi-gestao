import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UiState } from '../../../core/ui-state';
import { ConteudoTabs } from '../conteudo-tabs';
import { ConteudoStore } from '../conteudo.store';
import {
  PILAR_DESCRICAO,
  PILAR_LABEL,
  Pilar,
  STATUS_CLASSE,
  STATUS_LABEL,
} from '../conteudo.models';

/**
 * Equilíbrio dos pilares nos próximos 8 posts. Existe para a fila não virar
 * só dor ou só prova: o pilar de ensino é o que constrói autoridade, e o
 * plano reserva 3 de 8 para ele.
 */
@Component({
  selector: 'app-conteudo-pilares',
  standalone: true,
  imports: [CommonModule, ConteudoTabs],
  templateUrl: './conteudo-pilares.html',
})
export class ConteudoPilares implements OnInit {
  store = inject(ConteudoStore);
  private ui = inject(UiState);

  pilarLabel = PILAR_LABEL;
  pilarDescricao = PILAR_DESCRICAO;
  statusLabel = STATUS_LABEL;
  statusClasse = STATUS_CLASSE;

  proximos = computed(() => this.store.pendentes().slice(0, 8));

  postsDoPilar(p: Pilar) {
    return this.proximos().filter((x) => x.pilar === p);
  }

  situacao(tem: number, meta: number | null): 'ok' | 'falta' | 'sobra' | 'livre' {
    if (meta === null) return 'livre';
    if (tem === meta) return 'ok';
    return tem < meta ? 'falta' : 'sobra';
  }

  ngOnInit() {
    this.ui.setTitulo('Conteúdo');
    this.store.carregar();
  }
}
