import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UiState } from '../../../core/ui-state';
import { dataBr, moeda } from '../../../core/utils';
import { Dialog } from '../../../shared/dialog';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { AppSelect, OpcaoSelect } from '../../../shared/ui/app-select';
import { FecharDialog } from '../fechar-dialog';
import { ProspeccaoTabs } from '../prospeccao-tabs';
import { ProspeccaoStore } from '../prospeccao.store';
import {
  EmpresaProspeccao,
  EmpresaProspeccaoInput,
  ProximaAcao,
  STATUS_PROSP_CLASSE,
  STATUS_PROSP_LABEL,
  StatusProspeccao,
  hojeIso,
  proximaAcao,
  proximoStatus,
} from '../prospeccao.models';

@Component({
  selector: 'app-prospeccao-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, AppSelect, ProspeccaoTabs, FecharDialog],
  templateUrl: './prospeccao-pipeline.html',
  styleUrl: './prospeccao-pipeline.scss',
})
export class ProspeccaoPipeline implements OnInit {
  store = inject(ProspeccaoStore);
  private ui = inject(UiState);
  private confirm = inject(ConfirmService);

  money = moeda;
  dataBr = dataBr;
  statusLabel = STATUS_PROSP_LABEL;
  statusClasse = STATUS_PROSP_CLASSE;
  proxima = proximaAcao;

  busca = '';
  filtroStatus: StatusProspeccao | 'todos' = 'todos';

  filtroOpc: OpcaoSelect[] = [
    { valor: 'todos', rot: 'Todos os status' },
    ...Object.entries(STATUS_PROSP_LABEL).map(([valor, rot]) => ({ valor, rot })),
  ];

  editorAberto = false;
  editId: string | null = null;
  form: EmpresaProspeccaoInput = this.novoForm();
  fechando: EmpresaProspeccao | null = null;

  ngOnInit() {
    this.ui.setTitulo('Prospecção');
    this.store.carregar();
  }

  novoForm(): EmpresaProspeccaoInput {
    return {
      nome: '',
      categoria: '',
      contato: '',
      telefone: '',
      email: '',
      mensalidade: undefined,
      notas: '',
    };
  }

  /** Urgente primeiro: com vencimento, depois sem, depois fechados e perdidos. */
  lista(): EmpresaProspeccao[] {
    const b = this.busca.trim().toLowerCase();
    return this.store
      .empresas()
      .filter((e) => this.filtroStatus === 'todos' || e.status === this.filtroStatus)
      .filter(
        (e) =>
          !b ||
          e.nome.toLowerCase().includes(b) ||
          e.categoria.toLowerCase().includes(b),
      )
      .sort((a, b2) => {
        const ga = this.grupo(a);
        const gb = this.grupo(b2);
        if (ga !== gb) return ga - gb;
        if (ga === 0) {
          return (proximaAcao(a)!.vence || '').localeCompare(proximaAcao(b2)!.vence || '');
        }
        return b2.atualizadoEm.localeCompare(a.atualizadoEm);
      });
  }

  private grupo(e: EmpresaProspeccao): number {
    if (e.status === 'perdido') return 3;
    if (e.status === 'fechado') return 2;
    return proximaAcao(e)?.vence ? 0 : 1;
  }

  contatoLinha(e: EmpresaProspeccao): string {
    return [e.contato, e.telefone, e.email].filter(Boolean).join(' · ');
  }

  atrasada(a: ProximaAcao | null): boolean {
    return !!a?.vence && a.vence < hojeIso();
  }

  podeAvancar(e: EmpresaProspeccao): boolean {
    return !!proximoStatus(e.status);
  }

  podePerder(e: EmpresaProspeccao): boolean {
    return e.status !== 'fechado' && e.status !== 'perdido';
  }

  avancar(e: EmpresaProspeccao) {
    if (proximoStatus(e.status) === 'fechado') {
      this.fechando = e;
    } else {
      this.store.avancar(e.id);
    }
  }

  confirmarFechar(valor: number) {
    if (this.fechando) this.store.avancar(this.fechando.id, valor);
    this.fechando = null;
  }

  async perder(e: EmpresaProspeccao) {
    const ok = await this.confirm.ask({
      title: 'Marcar como perdido',
      message: `Marcar ${e.nome} como perdido?`,
      confirmText: 'Perdido',
      tone: 'danger',
    });
    if (ok) this.store.marcarPerdida(e.id);
  }

  abrirNovo() {
    this.editId = null;
    this.form = this.novoForm();
    this.editorAberto = true;
  }

  abrirEditar(e: EmpresaProspeccao) {
    this.editId = e.id;
    this.form = {
      nome: e.nome,
      categoria: e.categoria,
      contato: e.contato || '',
      telefone: e.telefone || '',
      email: e.email || '',
      mensalidade: e.mensalidade,
      notas: e.notas || '',
    };
    this.editorAberto = true;
  }

  salvar() {
    if (!this.form.nome.trim() || !this.form.categoria.trim()) return;
    this.store.salvar(
      {
        ...this.form,
        nome: this.form.nome.trim(),
        categoria: this.form.categoria.trim(),
        mensalidade: this.form.mensalidade
          ? Number(this.form.mensalidade)
          : undefined,
      },
      this.editId || undefined,
    );
    this.editorAberto = false;
  }

  async excluir() {
    if (!this.editId) return;
    const ok = await this.confirm.ask({
      title: 'Excluir empresa',
      message: 'Excluir esta empresa da prospecção?',
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    this.store.excluir(this.editId);
    this.editorAberto = false;
  }
}
