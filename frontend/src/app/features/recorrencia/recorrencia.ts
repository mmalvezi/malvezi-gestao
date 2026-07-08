import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import { Cliente, Recorrencia as Rec, RecorrenciaInput } from '../../core/models';
import { moeda } from '../../core/utils';
import { Dialog } from '../../shared/dialog';
import { ConfirmService } from '../../shared/ui/confirm.service';
import { AppSelect, OpcaoSelect } from '../../shared/ui/app-select';

@Component({
  selector: 'app-recorrencia',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, AppSelect],
  templateUrl: './recorrencia.html',
})
export class Recorrencia implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);
  private confirm = inject(ConfirmService);

  itens: Rec[] = [];
  clientes: Cliente[] = [];
  carregando = true;

  money = moeda;

  situacaoOpc: OpcaoSelect[] = [
    { valor: 'ativo', rot: 'Ativo' },
    { valor: 'pausado', rot: 'Pausado' },
  ];

  editorAberto = false;
  editId: number | null = null;
  form: RecorrenciaInput = this.novoForm();
  salvando = false;

  clientesOpc(): OpcaoSelect[] {
    return this.clientes.map((c) => ({ valor: c.id, rot: c.nome }));
  }

  ngOnInit() {
    this.ui.setTitulo('Mensalidades');
    this.carregar();
  }

  carregar() {
    this.carregando = true;
    this.api.getClientes().subscribe((c) => (this.clientes = c));
    this.api.getRecorrencias().subscribe({
      next: (r) => {
        this.itens = r;
        this.carregando = false;
      },
      error: () => (this.carregando = false),
    });
  }

  mrr(): number {
    return this.itens
      .filter((r) => r.status === 'ativo')
      .reduce((s, r) => s + Number(r.valor || 0), 0);
  }

  contarAtivas(): number {
    return this.itens.filter((r) => r.status === 'ativo').length;
  }

  novoForm(): RecorrenciaInput {
    return { cliente_id: 0, plano: '', valor: 0, status: 'ativo' };
  }

  abrirNovo() {
    this.editId = null;
    this.form = this.novoForm();
    if (this.clientes.length) this.form.cliente_id = this.clientes[0].id;
    this.editorAberto = true;
  }

  abrirEditar(r: Rec) {
    this.editId = r.id;
    this.form = {
      cliente_id: r.cliente_id,
      plano: r.plano,
      valor: r.valor,
      status: r.status,
    };
    this.editorAberto = true;
  }

  fecharEditor() {
    this.editorAberto = false;
  }

  salvar() {
    if (!this.form.cliente_id || !this.form.plano.trim()) return;
    this.salvando = true;
    const payload: RecorrenciaInput = {
      ...this.form,
      valor: Number(this.form.valor) || 0,
    };
    const req = this.editId
      ? this.api.atualizarRecorrencia(this.editId, payload)
      : this.api.criarRecorrencia(payload);
    req.subscribe({
      next: () => {
        this.salvando = false;
        this.editorAberto = false;
        this.carregar();
      },
      error: () => (this.salvando = false),
    });
  }

  alternarStatus(r: Rec) {
    const novo = r.status === 'ativo' ? 'pausado' : 'ativo';
    this.api
      .patchStatusRecorrencia(r.id, novo)
      .subscribe((atual) => (r.status = atual.status));
  }

  async excluir(r: Rec) {
    const ok = await this.confirm.ask({
      title: 'Excluir mensalidade',
      message: 'Excluir esta mensalidade?',
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.excluirRecorrencia(r.id).subscribe(() => this.carregar());
  }
}
