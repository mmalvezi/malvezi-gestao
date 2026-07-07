import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import {
  Cliente,
  Orcamento,
  Projeto,
  ProjetoInput,
  StageProjeto,
  TipoProjeto,
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
import {
  DocumentoViewer,
  TipoDocumento,
} from '../../shared/documentos/documento-viewer';

@Component({
  selector: 'app-projetos',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, DocumentoViewer],
  templateUrl: './projetos.html',
  styleUrl: './projetos.scss',
})
export class Projetos implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);

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

  /* Documentos */
  doc: { tipo: TipoDocumento; projeto?: Projeto; orcamento?: Orcamento } | null =
    null;

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
    return i < stageIndex(p.stage);
  }
  stepAtual(p: Projeto, i: number): boolean {
    return i === stageIndex(p.stage);
  }

  restante(p: Projeto): number {
    return Math.max(Number(p.valor || 0) - Number(p.pago || 0), 0);
  }

  trocarStage(p: Projeto, stage: string) {
    this.api.patchStage(p.id, stage as StageProjeto).subscribe((atual) => {
      p.stage = atual.stage;
    });
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

  excluir() {
    if (!this.editId) return;
    if (!confirm('Excluir este projeto?')) return;
    this.api.excluirProjeto(this.editId).subscribe(() => {
      this.editorAberto = false;
      this.carregar();
    });
  }

  /* Documentos */
  projetoAtual(): Projeto | undefined {
    return this.projetos.find((p) => p.id === this.editId);
  }

  abrirDoc(tipo: TipoDocumento) {
    const p = this.projetoAtual();
    if (!p) return;
    if (tipo === 'orcamento') {
      this.doc = { tipo, orcamento: this.projetoParaOrcamento(p) };
    } else {
      this.doc = { tipo, projeto: p };
    }
  }

  fecharDoc() {
    this.doc = null;
  }

  private projetoParaOrcamento(p: Projeto): Orcamento {
    return {
      id: 0,
      numero: 'ORC-' + String(p.id).padStart(4, '0'),
      cliente_id: p.cliente_id,
      titulo: p.escopo ? p.escopo.slice(0, 60) : this.tipoLabel[p.tipo],
      tipo: p.tipo as TipoProjeto,
      desconto: 0,
      pagamento: 'A combinar',
      prazo: p.entrega ? 'Entrega prevista' : 'A combinar',
      validade_dias: 15,
      obs: '',
      status: 'rascunho',
      cliente: p.cliente,
      itens: [
        {
          titulo: this.tipoLabel[p.tipo],
          descricao: p.escopo || '',
          valor: Number(p.valor || 0),
          ordem: 1,
        },
      ],
      total: Number(p.valor || 0),
    };
  }
}
