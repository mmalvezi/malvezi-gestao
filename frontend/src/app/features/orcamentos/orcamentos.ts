import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import {
  Cliente,
  Orcamento,
  OrcamentoInput,
  OrcamentoItem,
  StatusOrcamento,
} from '../../core/models';
import {
  moeda,
  MODELOS_ESCOPO,
  STATUS_ORC,
  STATUS_ORC_CLASSE,
  TIPOS,
  TIPO_LABEL,
} from '../../core/utils';
import { Dialog } from '../../shared/dialog';
import { DocumentoViewer } from '../../shared/documentos/documento-viewer';

@Component({
  selector: 'app-orcamentos',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, DocumentoViewer],
  templateUrl: './orcamentos.html',
  styleUrl: './orcamentos.scss',
})
export class Orcamentos implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);

  orcamentos: Orcamento[] = [];
  clientes: Cliente[] = [];
  carregando = true;

  tipos = TIPOS;
  statusOpc = STATUS_ORC;
  statusClasse = STATUS_ORC_CLASSE;
  tipoLabel = TIPO_LABEL;
  money = moeda;

  editorAberto = false;
  editId: number | null = null;
  form: OrcamentoInput = this.novoForm();
  salvando = false;

  docOrc: Orcamento | null = null;

  ngOnInit() {
    this.ui.setTitulo('Orcamentos');
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

  novoForm(): OrcamentoInput {
    return {
      cliente_id: 0,
      titulo: '',
      tipo: 'site',
      desconto: 0,
      pagamento: '50% na entrada e 50% na entrega',
      prazo: '30 dias',
      validade_dias: 15,
      obs: '',
      status: 'rascunho',
      itens: [],
    };
  }

  subtotal(): number {
    return this.form.itens.reduce((s, i) => s + Number(i.valor || 0), 0);
  }
  totalForm(): number {
    return Math.max(this.subtotal() - Number(this.form.desconto || 0), 0);
  }

  abrirNovo() {
    this.editId = null;
    this.form = this.novoForm();
    if (this.clientes.length) this.form.cliente_id = this.clientes[0].id;
    this.aplicarModelo();
    this.editorAberto = true;
  }

  abrirEditar(o: Orcamento) {
    this.editId = o.id;
    this.form = {
      cliente_id: o.cliente_id,
      titulo: o.titulo,
      tipo: o.tipo,
      desconto: o.desconto,
      pagamento: o.pagamento,
      prazo: o.prazo,
      validade_dias: o.validade_dias,
      obs: o.obs,
      status: o.status,
      itens: o.itens.map((i) => ({ ...i })),
    };
    this.editorAberto = true;
  }

  fecharEditor() {
    this.editorAberto = false;
  }

  aplicarModelo() {
    const modelo = MODELOS_ESCOPO[this.form.tipo] || [];
    this.form.itens = modelo.map((m, idx) => ({
      titulo: m.titulo,
      descricao: m.descricao,
      valor: m.valor,
      ordem: idx + 1,
    }));
  }

  addItem() {
    this.form.itens.push({
      titulo: '',
      descricao: '',
      valor: 0,
      ordem: this.form.itens.length + 1,
    });
  }

  removerItem(item: OrcamentoItem) {
    this.form.itens = this.form.itens.filter((i) => i !== item);
  }

  salvar() {
    if (!this.form.cliente_id || !this.form.titulo.trim()) return;
    this.salvando = true;
    const payload: OrcamentoInput = {
      ...this.form,
      desconto: Number(this.form.desconto) || 0,
      validade_dias: Number(this.form.validade_dias) || 15,
      itens: this.form.itens.map((i, idx) => ({
        titulo: i.titulo,
        descricao: i.descricao || '',
        valor: Number(i.valor) || 0,
        ordem: idx + 1,
      })),
    };
    const req = this.editId
      ? this.api.atualizarOrcamento(this.editId, payload)
      : this.api.criarOrcamento(payload);
    req.subscribe({
      next: () => {
        this.salvando = false;
        this.editorAberto = false;
        this.carregar();
      },
      error: () => (this.salvando = false),
    });
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
    if (!confirm(`Excluir o orcamento ${o.numero}?`)) return;
    this.api.excluirOrcamento(o.id).subscribe(() => this.carregar());
  }

  emitir(o: Orcamento) {
    this.docOrc = o;
  }
  fecharDoc() {
    this.docOrc = null;
  }
}
