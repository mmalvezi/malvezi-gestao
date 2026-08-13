import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UiState } from '../../../core/ui-state';
import { dataBr, moeda } from '../../../core/utils';
import { FecharDialog } from '../fechar-dialog';
import { ProspeccaoTabs } from '../prospeccao-tabs';
import { ProspeccaoStore } from '../prospeccao.store';
import {
  EmpresaProspeccao,
  ESTEIRA,
  STATUS_PROSP_LABEL,
  hojeIso,
  proximaAcao,
  semanaAtualIso,
  statusIndex,
} from '../prospeccao.models';

interface AcaoDoDia {
  e: EmpresaProspeccao;
  rotulo: string;
  vence: string;
  atrasada: boolean;
}

interface EtapaFunil {
  rot: string;
  count: number;
}

@Component({
  selector: 'app-prospeccao-painel',
  standalone: true,
  imports: [CommonModule, ProspeccaoTabs, FecharDialog],
  templateUrl: './prospeccao-painel.html',
  styleUrl: './prospeccao-painel.scss',
})
export class ProspeccaoPainel implements OnInit {
  store = inject(ProspeccaoStore);
  private ui = inject(UiState);

  money = moeda;
  dataBr = dataBr;

  fechando: EmpresaProspeccao | null = null;

  ngOnInit() {
    this.ui.setTitulo('Prospecção');
    this.store.carregar();
  }

  /* --- Pista de progresso --- */

  falta(): number {
    return Math.max(0, this.store.metas().metaMrr - this.store.mrr());
  }

  diasRestantes(): number {
    const fim = new Date(this.store.metas().prazoFinal + 'T00:00:00');
    const hoje = new Date(hojeIso() + 'T00:00:00');
    return Math.max(0, Math.round((fim.getTime() - hoje.getTime()) / 86400000));
  }

  ticketMedio(): number {
    const n = this.store.fechadas().length;
    return n ? this.store.mrr() / n : 0;
  }

  /** Onde o MRR deveria estar hoje (interpolação linear início → prazo). */
  ritmoEsperado(): number {
    const m = this.store.metas();
    const ini = new Date(m.dataInicio + 'T00:00:00').getTime();
    const fim = new Date(m.prazoFinal + 'T00:00:00').getTime();
    const hoje = new Date(hojeIso() + 'T00:00:00').getTime();
    if (fim <= ini || hoje <= ini) return 0;
    if (hoje >= fim) return m.metaMrr;
    return (m.metaMrr * (hoje - ini)) / (fim - ini);
  }

  pctMrr(): number {
    const meta = this.store.metas().metaMrr;
    return meta ? Math.min(100, (this.store.mrr() / meta) * 100) : 0;
  }

  pctRitmo(): number {
    const meta = this.store.metas().metaMrr;
    return meta ? Math.min(100, (this.ritmoEsperado() / meta) * 100) : 0;
  }

  noRitmo(): boolean {
    return this.store.mrr() >= this.ritmoEsperado();
  }

  atrasReais(): number {
    return Math.max(0, this.ritmoEsperado() - this.store.mrr());
  }

  /* --- Ações de hoje --- */

  acoesHoje(): AcaoDoDia[] {
    const hoje = hojeIso();
    return this.store
      .empresas()
      .map((e) => ({ e, acao: proximaAcao(e) }))
      .filter((x) => !!x.acao?.vence && x.acao.vence <= hoje)
      .map((x) => ({
        e: x.e,
        rotulo: x.acao!.rotulo,
        vence: x.acao!.vence!,
        atrasada: x.acao!.vence! < hoje,
      }))
      .sort((a, b) => a.vence.localeCompare(b.vence));
  }

  feito(a: AcaoDoDia) {
    // Avançar de proposta cai em "fechado", que exige mensalidade
    if (a.e.status === 'proposta') {
      this.fechando = a.e;
    } else {
      this.store.avancar(a.e.id);
    }
  }

  confirmarFechar(valor: number) {
    if (this.fechando) this.store.avancar(this.fechando.id, valor);
    this.fechando = null;
  }

  /* --- Meta da semana --- */

  emailsSemana(): number {
    const [seg, dom] = semanaAtualIso();
    return this.store
      .empresas()
      .filter((e) => e.dataPrimeiroEmail && e.dataPrimeiroEmail >= seg && e.dataPrimeiroEmail <= dom)
      .length;
  }

  pctSemana(): number {
    const meta = this.store.metas().emailsPorSemana;
    return meta ? Math.min(100, (this.emailsSemana() / meta) * 100) : 0;
  }

  /* --- Funil acumulado --- */

  funil(): EtapaFunil[] {
    const ativas = this.store.empresas().filter((e) => e.status !== 'perdido');
    // Conta quem chegou ou passou de cada etapa (a partir do 1º email)
    return ESTEIRA.slice(1).map((s) => ({
      rot: STATUS_PROSP_LABEL[s],
      count: ativas.filter((e) => statusIndex(e.status) >= statusIndex(s)).length,
    }));
  }

  larguraFunil(count: number): string {
    const max = Math.max(1, ...this.funil().map((f) => f.count));
    return `${(count / max) * 100}%`;
  }
}
