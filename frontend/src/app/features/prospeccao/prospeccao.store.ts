import { Injectable, computed, inject, signal } from '@angular/core';

import { PROSPECCAO_DATA } from './prospeccao.data';
import {
  EmpresaProspeccao,
  EmpresaProspeccaoInput,
  MetasProspeccao,
  hojeIso,
  proximoStatus,
} from './prospeccao.models';

/**
 * Fonte única do módulo de prospecção. Todas as telas leem os mesmos signals,
 * então fechar/editar em qualquer lugar atualiza MRR e listas na hora.
 */
@Injectable({ providedIn: 'root' })
export class ProspeccaoStore {
  private data = inject(PROSPECCAO_DATA);
  private carregado = false;

  empresas = signal<EmpresaProspeccao[]>([]);
  metas = signal<MetasProspeccao>({
    metaMrr: 10000,
    prazoFinal: '2027-01-31',
    emailsPorSemana: 15,
    dataInicio: hojeIso(),
  });

  fechadas = computed(() => this.empresas().filter((e) => e.status === 'fechado'));
  mrr = computed(() =>
    this.fechadas().reduce((s, e) => s + Number(e.mensalidade || 0), 0),
  );

  carregar() {
    if (this.carregado) return;
    this.carregado = true;
    this.empresas.set(this.data.lerEmpresas());
    const m = this.data.lerMetas();
    if (m) {
      this.metas.set(m);
    } else {
      // Primeiro uso: fixa a dataInicio como base do cálculo de ritmo
      this.data.gravarMetas(this.metas());
    }
  }

  private persistir(lista: EmpresaProspeccao[]) {
    this.empresas.set(lista);
    this.data.gravarEmpresas(lista);
  }

  salvar(input: EmpresaProspeccaoInput, id?: string): EmpresaProspeccao {
    const agora = new Date().toISOString();
    const lista = [...this.empresas()];
    const i = id ? lista.findIndex((e) => e.id === id) : -1;
    if (i >= 0) {
      lista[i] = { ...lista[i], ...input, atualizadoEm: agora };
      this.persistir(lista);
      return lista[i];
    }
    const nova: EmpresaProspeccao = {
      ...input,
      id: crypto.randomUUID(),
      status: 'a_abordar',
      criadoEm: agora,
      atualizadoEm: agora,
    };
    this.persistir([nova, ...lista]);
    return nova;
  }

  /**
   * Move para o próximo status da esteira aplicando as regras de cadência.
   * Para fechar é obrigatório mensalidade > 0 — sem isso retorna false.
   */
  avancar(id: string, mensalidade?: number): boolean {
    const lista = [...this.empresas()];
    const i = lista.findIndex((e) => e.id === id);
    if (i < 0) return false;
    const e = { ...lista[i] };
    const prox = proximoStatus(e.status);
    if (!prox) return false;

    if (prox === 'fechado') {
      const valor = Number(mensalidade ?? e.mensalidade ?? 0);
      if (!(valor > 0)) return false;
      e.mensalidade = valor;
    }
    if (prox === 'email' && !e.dataPrimeiroEmail) e.dataPrimeiroEmail = hojeIso();
    if (prox === 'proposta') e.dataProposta = hojeIso();

    e.status = prox;
    e.atualizadoEm = new Date().toISOString();
    lista[i] = e;
    this.persistir(lista);
    return true;
  }

  marcarPerdida(id: string) {
    const lista = this.empresas().map((e) =>
      e.id === id && e.status !== 'fechado'
        ? { ...e, status: 'perdido' as const, atualizadoEm: new Date().toISOString() }
        : e,
    );
    this.persistir(lista);
  }

  excluir(id: string) {
    this.persistir(this.empresas().filter((e) => e.id !== id));
  }

  salvarMetas(m: MetasProspeccao) {
    this.metas.set(m);
    this.data.gravarMetas(m);
  }

  backupJson(): string {
    return JSON.stringify(
      { exportadoEm: new Date().toISOString(), metas: this.metas(), empresas: this.empresas() },
      null,
      2,
    );
  }
}
