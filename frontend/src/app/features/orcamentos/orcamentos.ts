import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import { Cliente, Orcamento, StatusOrcamento } from '../../core/models';
import { moeda, STATUS_ORC, STATUS_ORC_CLASSE, TIPO_LABEL } from '../../core/utils';
import { OrcamentoForm } from '../../shared/orcamento-form';
import { OrcamentoViewer } from '../../shared/documentos/orcamento-viewer';

@Component({
  selector: 'app-orcamentos',
  standalone: true,
  imports: [CommonModule, FormsModule, OrcamentoForm, OrcamentoViewer],
  templateUrl: './orcamentos.html',
  styleUrl: './orcamentos.scss',
})
export class Orcamentos implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);

  orcamentos: Orcamento[] = [];
  clientes: Cliente[] = [];
  carregando = true;

  statusOpc = STATUS_ORC;
  statusClasse = STATUS_ORC_CLASSE;
  tipoLabel = TIPO_LABEL;
  money = moeda;

  formAberto = false;
  formInicial: Orcamento | null = null;
  formClienteId?: number;

  docOrc: Orcamento | null = null;

  ngOnInit() {
    this.ui.setTitulo('Orçamentos');
    this.carregar();
  }

  carregar() {
    this.carregando = true;
    this.api.getClientes().subscribe((c) => (this.clientes = c));
    this.api.getOrcamentos().subscribe({
      next: (o) => {
        this.orcamentos = o;
        this.carregando = false;
      },
      error: () => (this.carregando = false),
    });
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
    this.formAberto = false;
    this.carregar();
  }

  trocarStatus(o: Orcamento, status: string) {
    this.api
      .patchStatusOrcamento(o.id, status as StatusOrcamento)
      .subscribe((atual) => (o.status = atual.status));
  }

  duplicar(o: Orcamento) {
    this.api.duplicarOrcamento(o.id).subscribe(() => this.carregar());
  }

  excluir(o: Orcamento) {
    if (!confirm(`Excluir o orçamento ${o.numero}?`)) return;
    this.api.excluirOrcamento(o.id).subscribe(() => this.carregar());
  }

  emitir(o: Orcamento) {
    this.docOrc = o;
  }

  fecharDoc() {
    this.docOrc = null;
  }

  atualizarDoc(o: Orcamento) {
    const i = this.orcamentos.findIndex((x) => x.id === o.id);
    if (i >= 0) this.orcamentos[i] = o;
    else this.carregar();
    this.docOrc = o;
  }
}
