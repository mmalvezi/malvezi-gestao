import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import { OrcamentosStore } from '../../core/orcamentos.store';
import { Cliente, Orcamento, StatusOrcamento } from '../../core/models';
import { moeda, STATUS_ORC, STATUS_ORC_CLASSE, TIPO_LABEL } from '../../core/utils';
import { OrcamentoViewer } from '../../shared/documentos/orcamento-viewer';
import { PropostaAnexo } from '../../shared/documentos/proposta-anexo';
import { Dialog } from '../../shared/dialog';
import { ConfirmService } from '../../shared/ui/confirm.service';
import { AppSelect } from '../../shared/ui/app-select';

@Component({
  selector: 'app-orcamentos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Dialog,
    OrcamentoViewer,
    PropostaAnexo,
    AppSelect,
  ],
  templateUrl: './orcamentos.html',
  styleUrl: './orcamentos.scss',
})
export class Orcamentos implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);
  private confirm = inject(ConfirmService);
  private router = inject(Router);
  store = inject(OrcamentosStore);

  clientes: Cliente[] = [];

  statusOpc = STATUS_ORC;
  statusClasse = STATUS_ORC_CLASSE;
  tipoLabel = TIPO_LABEL;
  money = moeda;

  docOrc: Orcamento | null = null;
  propostaOrc: Orcamento | null = null;

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
    // "Salvar e emitir PDF" da tela de edicao: abre o documento ao chegar
    const abrir = this.store.abrirDoc();
    if (abrir) {
      this.store.abrirDoc.set(null);
      this.api.getOrcamento(abrir).subscribe((o) => (this.docOrc = o));
    }
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
    this.router.navigate(['/orcamentos/novo']);
  }

  abrirEditar(o: Orcamento) {
    this.router.navigate(['/orcamentos', o.id]);
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

  /** Abre o documento: a proposta anexada, se houver; senao o automatico. */
  emitir(o: Orcamento) {
    this.docOrc = o;
  }

  fecharDoc() {
    this.docOrc = null;
  }

  atualizarDoc(o: Orcamento) {
    // O form (ou o anexo) dentro do viewer mudou algo: refletimos nos dois.
    this.docOrc = o;
    this.store.upsert(o);
  }

  /* Proposta em PDF direto da lista */
  abrirProposta(o: Orcamento) {
    this.propostaOrc = o;
  }

  aoMudarAnexo(o: Orcamento) {
    this.propostaOrc = o;
    this.store.upsert(o);
  }
}
