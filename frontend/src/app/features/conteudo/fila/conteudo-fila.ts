import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UiState } from '../../../core/ui-state';
import { dataBr } from '../../../core/utils';
import { Dialog } from '../../../shared/dialog';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { AppSelect, OpcaoSelect } from '../../../shared/ui/app-select';
import { ConteudoTabs } from '../conteudo-tabs';
import { ConteudoStore } from '../conteudo.store';
import {
  FORMATO_LABEL,
  Formato,
  PILAR_LABEL,
  Pilar,
  Post,
  PostInput,
  STATUS_CLASSE,
  STATUS_LABEL,
  StatusPost,
  comandoCarrossel,
  proximoStatus,
} from '../conteudo.models';

@Component({
  selector: 'app-conteudo-fila',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, AppSelect, ConteudoTabs],
  templateUrl: './conteudo-fila.html',
  styleUrl: './conteudo-fila.scss',
})
export class ConteudoFila implements OnInit {
  store = inject(ConteudoStore);
  private ui = inject(UiState);
  private confirm = inject(ConfirmService);

  dataBr = dataBr;
  statusLabel = STATUS_LABEL;
  statusClasse = STATUS_CLASSE;
  pilarLabel = PILAR_LABEL;
  formatoLabel = FORMATO_LABEL;

  busca = '';
  filtroStatus: StatusPost | 'todos' = 'todos';

  filtroOpc: OpcaoSelect[] = [
    { valor: 'todos', rot: 'Todos os status' },
    ...Object.entries(STATUS_LABEL).map(([valor, rot]) => ({ valor, rot })),
  ];
  pilarOpc: OpcaoSelect[] = Object.entries(PILAR_LABEL).map(([valor, rot]) => ({
    valor,
    rot,
  }));
  formatoOpc: OpcaoSelect[] = Object.entries(FORMATO_LABEL).map(
    ([valor, rot]) => ({ valor, rot }),
  );

  editorAberto = false;
  editId: string | null = null;
  form: PostInput = this.novoForm();

  /** Post cujo comando está aberto para copiar e levar ao MazyOS. */
  pedido = signal<Post | null>(null);
  copiado = signal(false);

  lista = computed(() => {
    const t = this.busca.trim().toLowerCase();
    return this.store.posts().filter((p) => {
      if (this.filtroStatus !== 'todos' && p.status !== this.filtroStatus)
        return false;
      if (!t) return true;
      return (
        p.titulo.toLowerCase().includes(t) ||
        p.angulo.toLowerCase().includes(t) ||
        PILAR_LABEL[p.pilar].toLowerCase().includes(t)
      );
    });
  });

  ngOnInit() {
    this.ui.setTitulo('Conteúdo');
    this.store.carregar();
  }

  private novoForm(): PostInput {
    return {
      titulo: '',
      pilar: 'dor',
      formato: 'carrossel',
      vende: false,
      angulo: '',
      observacoes: '',
      dataPrevista: '',
      pasta: '',
      legenda: '',
    };
  }

  abrirNovo() {
    this.editId = null;
    this.form = this.novoForm();
    this.editorAberto = true;
  }

  abrirEditar(p: Post) {
    this.editId = p.id;
    this.form = {
      titulo: p.titulo,
      pilar: p.pilar,
      formato: p.formato,
      vende: p.vende,
      angulo: p.angulo,
      observacoes: p.observacoes,
      dataPrevista: p.dataPrevista || '',
      pasta: p.pasta || '',
      legenda: p.legenda || '',
    };
    this.editorAberto = true;
  }

  salvar() {
    if (!this.form.titulo.trim()) return;
    this.store.salvar(this.form, this.editId ?? undefined);
    this.editorAberto = false;
  }

  async excluir() {
    if (!this.editId) return;
    const ok = await this.confirm.ask({
      title: 'Excluir post',
      message: 'Excluir este post da fila? A ação não volta atrás.',
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    this.store.excluir(this.editId);
    this.editorAberto = false;
  }

  podeAvancar(p: Post) {
    return proximoStatus(p.status) !== null;
  }

  rotuloAvancar(p: Post): string {
    const prox = proximoStatus(p.status);
    return prox ? STATUS_LABEL[prox] : '';
  }

  avancar(p: Post) {
    this.store.avancar(p.id);
  }

  voltar(p: Post) {
    this.store.voltar(p.id);
  }

  mover(p: Post, d: -1 | 1) {
    this.store.mover(p.id, d);
  }

  /** Abre o comando pronto para colar no Claude Code do MazyOS. */
  pedirCriacao(p: Post) {
    this.copiado.set(false);
    this.pedido.set(p);
  }

  comando(p: Post): string {
    return comandoCarrossel(p);
  }

  async copiarComando() {
    const p = this.pedido();
    if (!p) return;
    try {
      await navigator.clipboard.writeText(comandoCarrossel(p));
      this.copiado.set(true);
    } catch {
      // Navegador sem permissão de área de transferência: o texto continua
      // visível no diálogo para seleção manual.
      this.copiado.set(false);
    }
  }
}
