import { Injectable, computed, inject, signal } from '@angular/core';

import { ProspeccaoStore } from '../prospeccao.store';
import { statusIndex } from '../prospeccao.models';
import { PLANO_DATA } from './plano.data';
import { CategoriaAlvo, PlanoCaptacao, migrarPlano, planoSeed } from './plano.models';

/**
 * Fonte única do Plano de Captação. A integração com o pipeline é somente
 * leitura: emails por categoria e contagens do funil vêm do ProspeccaoStore.
 */
@Injectable({ providedIn: 'root' })
export class PlanoStore {
  private data = inject(PLANO_DATA);
  private prospeccao = inject(ProspeccaoStore);
  private carregado = false;

  plano = signal<PlanoCaptacao>(planoSeed());

  carregar() {
    this.prospeccao.carregar();
    if (this.carregado) return;
    this.carregado = true;
    const salvo = this.data.ler();
    if (salvo) {
      // Migração de seed roda uma única vez (controlada por seedVersion)
      const migrado = migrarPlano(salvo);
      this.plano.set(migrado);
      if (migrado !== salvo) this.data.gravar(migrado);
    } else {
      // Primeiro acesso: o seed do playbook já entra persistido
      this.data.gravar(this.plano());
    }
  }

  /** Toda mutação passa por aqui: aplica, carimba e persiste. */
  atualizar(mut: (p: PlanoCaptacao) => PlanoCaptacao) {
    const novo = { ...mut(this.plano()), atualizadoEm: new Date().toISOString() };
    this.plano.set(novo);
    this.data.gravar(novo);
  }

  /* --- Integração (somente leitura) com o pipeline --- */

  /** Empresas da categoria com 1º email enviado (matching por nome, case-insensitive). */
  emailsDaCategoria = computed(() => {
    const mapa = new Map<string, number>();
    for (const e of this.prospeccao.empresas()) {
      if (!e.dataPrimeiroEmail) continue;
      const chave = e.categoria.trim().toLowerCase();
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    }
    return mapa;
  });

  emailsDe(c: CategoriaAlvo): number {
    return this.emailsDaCategoria().get(c.nome.trim().toLowerCase()) || 0;
  }

  totalEmails = computed(
    () => this.prospeccao.empresas().filter((e) => !!e.dataPrimeiroEmail).length,
  );

  totalRespostas = computed(() =>
    this.plano().categorias.reduce((s, c) => s + Number(c.respostas || 0), 0),
  );

  /** Quantas empresas chegaram (ou passaram) da etapa, excluindo perdidas. */
  private chegouEm(status: 'reuniao' | 'proposta' | 'fechado'): number {
    const alvo = statusIndex(status);
    return this.prospeccao
      .empresas()
      .filter((e) => e.status !== 'perdido' && statusIndex(e.status) >= alvo)
      .length;
  }

  /**
   * Valor calculado da métrica em % (null quando o pipeline ainda não tem
   * denominador — aí vale a entrada manual).
   */
  valorCalculado(id: string): number | null {
    const pct = (num: number, den: number) =>
      den > 0 ? Math.round((num / den) * 1000) / 10 : null;
    switch (id) {
      case 'resposta':
        return pct(this.totalRespostas(), this.totalEmails());
      case 'resposta_reuniao':
        return pct(this.chegouEm('reuniao'), this.totalRespostas());
      case 'reuniao_proposta':
        return pct(this.chegouEm('proposta'), this.chegouEm('reuniao'));
      case 'proposta_fechamento':
        return pct(this.chegouEm('fechado'), this.chegouEm('proposta'));
      default:
        return null;
    }
  }
}
