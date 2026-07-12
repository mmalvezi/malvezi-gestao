import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import { Orcamento, Projeto, Recorrencia } from '../../core/models';
import { moeda, STATUS_ORC_CLASSE, TIPO_LABEL } from '../../core/utils';

interface Barra {
  rot: string;
  valor: number;
  altura: number;
}

@Component({
  selector: 'app-financeiro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './financeiro.html',
  styleUrl: './financeiro.scss',
})
export class Financeiro implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);

  projetos: Projeto[] = [];
  recorrencias: Recorrencia[] = [];
  orcamentos: Orcamento[] = [];
  carregando = true;

  money = moeda;
  tipoLabel = TIPO_LABEL;
  statusClasse = STATUS_ORC_CLASSE;

  recorrenteMes = 0;
  recebido = 0;
  aReceber = 0;
  carteira = 0;
  emNegociacao = 0;
  barras: Barra[] = [];

  /** Propostas em aberto: expectativa, nao caixa. */
  private readonly EM_NEGOCIACAO = ['lead', 'orcamento'];
  /** Fechados: viraram compromisso de pagamento. */
  private readonly FECHADOS = ['aprovado', 'desenvolvimento', 'entregue'];

  ngOnInit() {
    this.ui.setTitulo('Financeiro');
    forkJoin({
      projetos: this.api.getProjetos(),
      recorrencias: this.api.getRecorrencias(),
      orcamentos: this.api.getOrcamentos(),
    }).subscribe({
      next: ({ projetos, recorrencias, orcamentos }) => {
        this.projetos = projetos;
        this.recorrencias = recorrencias;
        this.orcamentos = orcamentos;
        this.calcular();
        this.carregando = false;
      },
      error: () => (this.carregando = false),
    });
  }

  calcular() {
    // Recusados ficam fora de todos os numeros de dinheiro ativo
    const vivos = this.projetos.filter((p) => p.stage !== 'recusado');
    const fechados = vivos.filter((p) => this.FECHADOS.includes(p.stage));

    this.recorrenteMes = this.recorrencias
      .filter((r) => r.status === 'ativo')
      .reduce((s, r) => s + Number(r.valor || 0), 0);

    this.recebido = vivos.reduce((s, p) => s + Number(p.pago || 0), 0);

    // A receber: so o que ja foi fechado e ainda tem saldo, incluindo os
    // entregues que nao foram pagos
    this.aReceber = fechados.reduce(
      (s, p) => s + Number(p.saldo ?? p.valor ?? 0),
      0,
    );

    // Propostas em aberto: expectativa, contabilizada a parte
    this.emNegociacao = vivos
      .filter((p) => this.EM_NEGOCIACAO.includes(p.stage))
      .reduce((s, p) => s + Number(p.valor || 0), 0);

    this.carteira = fechados.reduce((s, p) => s + Number(p.valor || 0), 0);
    this.montarGrafico();
  }

  montarGrafico() {
    const meses = [
      'jan',
      'fev',
      'mar',
      'abr',
      'mai',
      'jun',
      'jul',
      'ago',
      'set',
      'out',
      'nov',
      'dez',
    ];
    const agora = new Date();
    const baldes: { rot: string; chave: string; valor: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      baldes.push({
        rot: meses[d.getMonth()],
        chave: `${d.getFullYear()}-${d.getMonth()}`,
        valor: 0,
      });
    }
    for (const p of this.projetos) {
      if (!p.criado) continue;
      const d = new Date(p.criado);
      const chave = `${d.getFullYear()}-${d.getMonth()}`;
      const balde = baldes.find((b) => b.chave === chave);
      if (balde) balde.valor += Number(p.pago || 0);
    }
    const max = Math.max(1, ...baldes.map((b) => b.valor));
    this.barras = baldes.map((b) => ({
      rot: b.rot,
      valor: b.valor,
      altura: Math.round((b.valor / max) * 100),
    }));
  }

  recorrenciasAtivas(): Recorrencia[] {
    return this.recorrencias.filter((r) => r.status === 'ativo');
  }

  orcamentosAbertos(): Orcamento[] {
    return this.orcamentos.filter(
      (o) => o.status === 'rascunho' || o.status === 'enviado',
    );
  }
}
