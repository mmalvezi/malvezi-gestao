import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import {
  Cliente,
  Projeto,
  ProjetoInput,
  StageProjeto,
} from '../../core/models';
import {
  moeda,
  progressoTarefas,
  STAGES,
  STAGE_LABEL,
  stageIndex,
  TIPOS,
  TIPO_LABEL,
  TIPO_SIGLA,
} from '../../core/utils';
import { Dialog } from '../../shared/dialog';
import { ConfirmService } from '../../shared/ui/confirm.service';
import { AppSelect, OpcaoSelect } from '../../shared/ui/app-select';
import { AppDatepicker } from '../../shared/ui/app-datepicker';

@Component({
  selector: 'app-projetos',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, AppSelect, AppDatepicker],
  templateUrl: './projetos.html',
  styleUrl: './projetos.scss',
})
export class Projetos implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);
  private router = inject(Router);
  private rota = inject(ActivatedRoute);
  private confirm = inject(ConfirmService);

  projetos: Projeto[] = [];
  clientes: Cliente[] = [];
  carregando = true;

  /** "todos" nao inclui os recusados: eles so aparecem no filtro Recusados.
      "negociacao" (lead+orcamento) e "ativos" (aprovado+desenvolvimento) sao
      grupos usados pelos cards clicaveis do painel. */
  filtro: StageProjeto | 'todos' | 'negociacao' | 'ativos' = 'todos';
  vista: 'cartoes' | 'quadro' = 'cartoes';

  /** Menu de acoes do cartao. */
  menu: number | null = null;

  stages = STAGES;
  tipos = TIPOS;
  stageLabel = STAGE_LABEL;
  tipoLabel = TIPO_LABEL;
  tipoSigla = TIPO_SIGLA;
  money = moeda;

  /* Editor: apenas para criar. A edicao acontece na tela do projeto. */
  editorAberto = false;
  form: ProjetoInput = this.novoForm();
  salvando = false;

  ngOnInit() {
    this.ui.setTitulo('Projetos');
    // Vindo do painel: grupos (negociacao, ativos) ou um estagio especifico
    const f = this.rota.snapshot.queryParamMap.get('filtro');
    const validos = [
      'negociacao',
      'ativos',
      'recusado',
      ...STAGES.map((s) => s.valor),
    ];
    if (f && validos.includes(f)) {
      this.filtro = f as typeof this.filtro;
    }
    this.carregar();
  }

  carregar() {
    this.carregando = true;
    this.api.getClientes().subscribe((c) => (this.clientes = c));
    this.api.getProjetos().subscribe({
      next: (p) => {
        this.projetos = p;
        this.carregando = false;
      },
      error: () => (this.carregando = false),
    });
  }

  novoForm(): ProjetoInput {
    return {
      cliente_id: 0,
      tipo: 'site',
      valor: 0,
      stage: 'lead',
      entrega: null,
      escopo: '',
    };
  }

  clientesOpc(): OpcaoSelect[] {
    return this.clientes.map((c) => ({ valor: c.id, rot: c.nome }));
  }

  filtrados(): Projeto[] {
    const busca = this.ui.busca().toLowerCase().trim();
    return this.projetos.filter((p) => {
      // Recusado e terminal: so aparece quando o filtro pede por ele
      let okStage: boolean;
      if (this.filtro === 'todos') okStage = p.stage !== 'recusado';
      else if (this.filtro === 'negociacao')
        okStage = p.stage === 'lead' || p.stage === 'orcamento';
      else if (this.filtro === 'ativos')
        okStage = p.stage === 'aprovado' || p.stage === 'desenvolvimento';
      else okStage = p.stage === this.filtro;
      const okBusca =
        !busca ||
        (p.cliente?.nome || '').toLowerCase().includes(busca) ||
        this.tipoLabel[p.tipo].toLowerCase().includes(busca);
      return okStage && okBusca;
    });
  }

  /** Colunas do quadro: os recusados nunca entram. */
  porEstagio(stage: StageProjeto): Projeto[] {
    const busca = this.ui.busca().toLowerCase().trim();
    return this.projetos.filter(
      (p) =>
        p.stage === stage &&
        (!busca || (p.cliente?.nome || '').toLowerCase().includes(busca)),
    );
  }

  contarRecusados(): number {
    return this.projetos.filter((p) => p.stage === 'recusado').length;
  }

  recusado(p: Projeto): boolean {
    return p.stage === 'recusado';
  }

  saldo(p: Projeto): number {
    return p.saldo ?? Number(p.valor || 0);
  }

  /* Menu do cartao */
  alternarMenu(ev: MouseEvent, p: Projeto) {
    ev.stopPropagation();
    this.menu = this.menu === p.id ? null : p.id;
  }

  fecharMenu() {
    this.menu = null;
  }

  async recusar(p: Projeto) {
    this.fecharMenu();
    const ok = await this.confirm.ask({
      title: 'Marcar como recusado',
      message: `Marcar o projeto de ${p.cliente?.nome || 'cliente'} como recusado? Ele sai das listas e dos números ativos.`,
      confirmText: 'Marcar como recusado',
      tone: 'danger',
    });
    if (!ok) return;
    this.api
      .patchStage(p.id, 'recusado')
      .subscribe((atual) => (p.stage = atual.stage));
  }

  reabrir(p: Projeto) {
    this.fecharMenu();
    this.api
      .patchStage(p.id, 'orcamento')
      .subscribe((atual) => (p.stage = atual.stage));
  }

  stepDone(p: Projeto, i: number): boolean {
    return i <= stageIndex(p.stage);
  }
  stepAtual(p: Projeto, i: number): boolean {
    return i === stageIndex(p.stage);
  }

  restante(p: Projeto): number {
    return Math.max(Number(p.valor || 0) - Number(p.pago || 0), 0);
  }

  /* Progresso do quadro de tarefas do projeto */
  temTarefas(p: Projeto): boolean {
    return !!(p.tarefas_total && p.tarefas_total > 0);
  }
  pct(p: Projeto): number {
    return progressoTarefas(p.tarefas_feitas, p.tarefas_total);
  }

  /** Clique no ponto do stepper: avancar aplica direto, voltar pede confirmacao. */
  async clicarEstagio(p: Projeto, i: number) {
    const atualIdx = stageIndex(p.stage);
    if (i === atualIdx) return;
    const alvo = this.stages[i].valor;
    if (i < atualIdx) {
      const ok = await this.confirm.ask({
        title: 'Voltar etapa do projeto',
        message: `Voltar este projeto para "${this.stageLabel[alvo]}"?`,
        confirmText: 'Voltar etapa',
        cancelText: 'Cancelar',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.api.patchStage(p.id, alvo).subscribe((atual) => (p.stage = atual.stage));
  }

  /** Abre a tela do projeto (abas Dados, Tarefas, Notas e Documentos). */
  abrirProjeto(p: Projeto) {
    this.router.navigate(['/projetos', p.id]);
  }

  /* Criar */
  abrirNovo() {
    this.form = this.novoForm();
    if (this.clientes.length) this.form.cliente_id = this.clientes[0].id;
    this.editorAberto = true;
  }

  fecharEditor() {
    this.editorAberto = false;
  }

  salvar() {
    if (!this.form.cliente_id) return;
    this.salvando = true;
    const payload: ProjetoInput = {
      ...this.form,
      valor: Number(this.form.valor) || 0,
      entrega: this.form.entrega || null,
    };
    this.api.criarProjeto(payload).subscribe({
      next: (p) => {
        this.salvando = false;
        this.editorAberto = false;
        this.router.navigate(['/projetos', p.id]);
      },
      error: () => (this.salvando = false),
    });
  }
}
