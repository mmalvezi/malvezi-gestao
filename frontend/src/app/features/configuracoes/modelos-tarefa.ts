import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { ModeloTarefa, StageProjeto, TipoProjeto } from '../../core/models';
import {
  AREAS,
  AREA_LABEL,
  COLUNAS,
  PRIORIDADES,
  PRIORIDADE_LABEL,
  RESPONSAVEIS,
  STAGES,
  TIPOS,
  TIPO_LABEL,
} from '../../core/utils';
import { Dialog } from '../../shared/dialog';
import { AppSelect, OpcaoSelect } from '../../shared/ui/app-select';
import { ConfirmService } from '../../shared/ui/confirm.service';

type StageGatilho = Exclude<StageProjeto, 'recusado'>;

/**
 * Configuracao do roteiro da empresa: as tarefas que nascem sozinhas quando
 * um projeto de cada tipo entra em cada estagio.
 */
@Component({
  selector: 'app-modelos-tarefa',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, AppSelect],
  templateUrl: './modelos-tarefa.html',
  styleUrl: './modelos-tarefa.scss',
})
export class ModelosTarefa implements OnInit {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);

  modelos: ModeloTarefa[] = [];
  carregando = true;

  tipoSel: TipoProjeto = 'site';

  tipos = TIPOS;
  stages = STAGES;
  tipoLabel = TIPO_LABEL;
  areaLabel = AREA_LABEL;
  prioridadeLabel = PRIORIDADE_LABEL;
  areas = AREAS;
  prioridades = PRIORIDADES;
  responsaveis = RESPONSAVEIS;
  colunas: OpcaoSelect[] = COLUNAS.map((c) => ({ valor: c.valor, rot: c.rot }));

  /* Editor */
  editorAberto = false;
  editId: number | null = null;
  salvando = false;
  form: ModeloTarefa = this.novoForm('orcamento');

  /* Duplicar */
  duplicarAberto = false;
  duplicarPara: TipoProjeto | null = null;
  duplicando = false;

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.api.getModelosTarefa().subscribe({
      next: (m) => {
        this.modelos = m;
        this.carregando = false;
      },
      error: () => (this.carregando = false),
    });
  }

  doGrupo(stage: StageProjeto): ModeloTarefa[] {
    return this.modelos
      .filter((m) => m.tipo_projeto === this.tipoSel && m.stage_gatilho === stage)
      .sort((a, b) => a.ordem - b.ordem);
  }

  novoForm(stage: StageProjeto): ModeloTarefa {
    return {
      tipo_projeto: this.tipoSel,
      stage_gatilho: stage as StageGatilho,
      titulo: '',
      descricao: '',
      area: 'dev',
      prioridade: 'media',
      responsavel_padrao: '',
      coluna_inicial: 'afazer',
      dias_prazo: null,
      ordem: 0,
      ativo: true,
    };
  }

  abrirNovo(stage: StageProjeto) {
    this.editId = null;
    this.form = this.novoForm(stage);
    this.editorAberto = true;
  }

  abrirEditar(m: ModeloTarefa) {
    this.editId = m.id ?? null;
    this.form = { ...m, responsavel_padrao: m.responsavel_padrao || '' };
    this.editorAberto = true;
  }

  salvar() {
    if (!this.form.titulo.trim()) return;
    this.salvando = true;
    const payload: ModeloTarefa = {
      ...this.form,
      titulo: this.form.titulo.trim(),
      responsavel_padrao: this.form.responsavel_padrao || null,
      dias_prazo:
        this.form.dias_prazo != null && `${this.form.dias_prazo}` !== ''
          ? Number(this.form.dias_prazo)
          : null,
    };
    const req = this.editId
      ? this.api.atualizarModeloTarefa(this.editId, payload)
      : this.api.criarModeloTarefa(payload);
    req.subscribe({
      next: () => {
        this.salvando = false;
        this.editorAberto = false;
        this.carregar();
      },
      error: () => (this.salvando = false),
    });
  }

  async excluir(m: ModeloTarefa) {
    const ok = await this.confirm.ask({
      title: 'Excluir tarefa do modelo',
      message: `Excluir "${m.titulo}" do roteiro? As tarefas já criadas nos projetos não são afetadas.`,
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok || !m.id) return;
    this.api.excluirModeloTarefa(m.id).subscribe(() => this.carregar());
  }

  /** Sobe ou desce a tarefa dentro do grupo (tipo + estagio). */
  mover(m: ModeloTarefa, direcao: -1 | 1) {
    const grupo = this.doGrupo(m.stage_gatilho);
    const i = grupo.findIndex((x) => x.id === m.id);
    const j = i + direcao;
    if (i < 0 || j < 0 || j >= grupo.length) return;
    [grupo[i], grupo[j]] = [grupo[j], grupo[i]];
    grupo.forEach((x, idx) => (x.ordem = idx));
    this.api
      .reordenarModelosTarefa(grupo.map((x) => x.id!))
      .subscribe(() => this.carregar());
  }

  /* Duplicar o roteiro para outro tipo */
  outrosTipos(): OpcaoSelect[] {
    return this.tipos
      .filter((t) => t.valor !== this.tipoSel)
      .map((t) => ({ valor: t.valor, rot: t.rot }));
  }

  abrirDuplicar() {
    this.duplicarPara = null;
    this.duplicarAberto = true;
  }

  duplicar() {
    if (!this.duplicarPara) return;
    this.duplicando = true;
    this.api.duplicarModelosTarefa(this.tipoSel, this.duplicarPara).subscribe({
      next: (copiados) => {
        this.duplicando = false;
        this.duplicarAberto = false;
        this.tipoSel = this.duplicarPara!;
        this.carregar();
      },
      error: () => (this.duplicando = false),
    });
  }
}
