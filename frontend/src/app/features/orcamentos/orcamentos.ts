import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import { OrcamentosStore } from '../../core/orcamentos.store';
import { Cliente, Orcamento, StatusOrcamento } from '../../core/models';
import { moeda, STATUS_ORC, STATUS_ORC_CLASSE, TIPO_LABEL } from '../../core/utils';
import { OrcamentoForm } from '../../shared/orcamento-form';
import { OrcamentoViewer } from '../../shared/documentos/orcamento-viewer';
import { ConfirmService } from '../../shared/ui/confirm.service';
import { AppSelect } from '../../shared/ui/app-select';

@Component({
  selector: 'app-orcamentos',
  standalone: true,
  imports: [CommonModule, FormsModule, OrcamentoForm, OrcamentoViewer, AppSelect],
  templateUrl: './orcamentos.html',
  styleUrl: './orcamentos.scss',
})
export class Orcamentos implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);
  private confirm = inject(ConfirmService);
  store = inject(OrcamentosStore);

  clientes: Cliente[] = [];

  statusOpc = STATUS_ORC;
  statusClasse = STATUS_ORC_CLASSE;
  tipoLabel = TIPO_LABEL;
  money = moeda;

  formAberto = false;
  formInicial: Orcamento | null = null;
  formClienteId?: number;

  docOrc: Orcamento | null = null;

  get orcamentos(): Orcamento[] {
    return this.store.orcamentos();
  }
  get carregando(): boolean {
    return this.store.carregando();
  }

  ngOnInit() {
    this.ui.setTitulo('Orçamentos');
    this.api.getClientes().subscribe((c) => (this.clientes = c));
    this.store.carregar();
  }

  filtrados(): Orcamento[] {
    const busca = this.ui.busca().toLowerCase().trim();
    if (!busca) return this.orcamentos;
    return this.orcamentos.filter(
      (o) =>
        o.numero.toLowerCase().includes(busca) ||
        o.titulo.toLowerCase().includes(busca) ||
        (o.cliente?.nome || '').toLowerCase().includes(busca),
    );
  }

  abrirNovo() {
    this.formInicial = null;
    this.formClienteId = this.clientes[0]?.id;
    this.formAberto = true;
  }

  abrirEditar(o: Orcamento) {
    this.formInicial = o;
    this.formAberto = true;
  }

  aoSalvarForm() {
    // O OrcamentoForm ja atualizou o store; so fechamos.
    this.formAberto = false;
  }

  trocarStatus(o: Orcamento, status: string) {
    this.api
      .patchStatusOrcamento(o.id, status as StatusOrcamento)
      .subscribe((atual) => this.store.upsert(atual));
  }

  duplicar(o: Orcamento) {
    this.api.duplicarOrcamento(o.id).subscribe((novo) => this.store.upsert(novo));
  }

  async excluir(o: Orcamento) {
    const ok = await this.confirm.ask({
      title: 'Excluir orçamento',
      message: `Excluir o orçamento ${o.numero}?`,
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.excluirOrcamento(o.id).subscribe(() => this.store.remover(o.id));
  }

  emitir(o: Orcamento) {
    this.docOrc = o;
  }

  fecharDoc() {
    this.docOrc = null;
  }

  atualizarDoc(o: Orcamento) {
    // O form dentro do viewer ja atualizou o store; refletimos no documento.
    this.docOrc = o;
  }
}
