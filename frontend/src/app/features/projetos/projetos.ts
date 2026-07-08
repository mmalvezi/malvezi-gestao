import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  STAGES,
  STAGE_LABEL,
  stageIndex,
  TIPOS,
  TIPO_LABEL,
  TIPO_SIGLA,
} from '../../core/utils';
import { Dialog } from '../../shared/dialog';
import { DocumentosArea } from '../../shared/documentos/documentos-area';
import { NotasProjeto } from '../../shared/notas-projeto';
import { ConfirmService } from '../../shared/ui/confirm.service';
import { AppSelect, OpcaoSelect } from '../../shared/ui/app-select';
import { AppDatepicker } from '../../shared/ui/app-datepicker';

@Component({
  selector: 'app-projetos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Dialog,
    DocumentosArea,
    NotasProjeto,
    AppSelect,
    AppDatepicker,
  ],
  templateUrl: './projetos.html',
  styleUrl: './projetos.scss',
})
export class Projetos implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);
  private confirm = inject(ConfirmService);

  projetos: Projeto[] = [];
  clientes: Cliente[] = [];
  carregando = true;

  filtro: StageProjeto | 'todos' = 'todos';
  vista: 'cartoes' | 'quadro' = 'cartoes';

  stages = STAGES;
  tipos = TIPOS;
  stageLabel = STAGE_LABEL;
  tipoLabel = TIPO_LABEL;
  tipoSigla = TIPO_SIGLA;
  money = moeda;

  /* Editor */
  editorAberto = false;
  editId: number | null = null;
  form: ProjetoInput = this.novoForm();
  salvando = false;

  tiposDoc: ('contrato' | 'orcamento' | 'recibo')[] = [
    'orcamento',
    'contrato',
    'recibo',
  ];

  ngOnInit() {
    this.ui.setTitulo('Projetos');
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
      pago: 0,
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
      const okStage = this.filtro === 'todos' || p.stage === this.filtro;
      const okBusca =
        !busca ||
        (p.cliente?.nome || '').toLowerCase().includes(busca) ||
        this.tipoLabel[p.tipo].toLowerCase().includes(busca);
      return okStage && okBusca;
    });
  }

  porEstagio(stage: StageProjeto): Projeto[] {
    const busca = this.ui.busca().toLowerCase().trim();
    return this.projetos.filter(
      (p) =>
        p.stage === stage &&
        (!busca || (p.cliente?.nome || '').toLowerCase().includes(busca)),
    );
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

  /* Editor */
  abrirNovo() {
    this.editId = null;
    this.form = this.novoForm();
    if (this.clientes.length) this.form.cliente_id = this.clientes[0].id;
    this.editorAberto = true;
  }

  abrirEditar(p: Projeto) {
    this.editId = p.id;
    this.form = {
      cliente_id: p.cliente_id,
      tipo: p.tipo,
      valor: p.valor,
      pago: p.pago,
      stage: p.stage,
      entrega: p.entrega || null,
      escopo: p.escopo || '',
    };
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
      pago: Number(this.form.pago) || 0,
      entrega: this.form.entrega || null,
    };
    const req = this.editId
      ? this.api.atualizarProjeto(this.editId, payload)
      : this.api.criarProjeto(payload);
    req.subscribe({
      next: () => {
        this.salvando = false;
        this.editorAberto = false;
        this.carregar();
      },
      error: () => (this.salvando = false),
    });
  }

  async excluir() {
    if (!this.editId) return;
    const ok = await this.confirm.ask({
      title: 'Excluir projeto',
      message: 'Excluir este projeto? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.excluirProjeto(this.editId).subscribe(() => {
      this.editorAberto = false;
      this.carregar();
    });
  }

  /* Documentos */
  projetoAtual(): Projeto | undefined {
    return this.projetos.find((p) => p.id === this.editId);
  }
}
