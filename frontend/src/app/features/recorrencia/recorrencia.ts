import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import {
  Cliente,
  Cobranca,
  Projeto,
  Recorrencia as Rec,
  RecorrenciaInput,
  StatusRecorrencia,
} from '../../core/models';
import {
  competenciaBr,
  dataBr,
  diasAte,
  relativo,
  moeda,
  STATUS_COB_LABEL,
  STATUS_REC,
  STATUS_REC_CLASSE,
  STATUS_REC_LABEL,
  TIPO_LABEL,
} from '../../core/utils';
import { Dialog } from '../../shared/dialog';
import { ConfirmService } from '../../shared/ui/confirm.service';
import { AppSelect, OpcaoSelect } from '../../shared/ui/app-select';

type Aba = 'mensalidades' | 'cobrancas';

@Component({
  selector: 'app-recorrencia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Dialog, AppSelect],
  templateUrl: './recorrencia.html',
  styleUrl: './recorrencia.scss',
})
export class Recorrencia implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);
  private confirm = inject(ConfirmService);

  itens: Rec[] = [];
  clientes: Cliente[] = [];
  projetos: Projeto[] = [];
  cobrancas: Cobranca[] = [];
  carregando = true;

  aba: Aba = 'mensalidades';
  abas: { valor: Aba; rot: string }[] = [
    { valor: 'mensalidades', rot: 'Mensalidades' },
    { valor: 'cobrancas', rot: 'Cobranças do mês' },
  ];

  /** Filtro por situação na lista de mensalidades. */
  filtro: StatusRecorrencia | 'todas' = 'todas';

  money = moeda;
  data = dataBr;
  rel = relativo;
  competencia = competenciaBr;
  statusOpc = STATUS_REC;
  statusLabel = STATUS_REC_LABEL;
  statusClasse = STATUS_REC_CLASSE;
  cobLabel = STATUS_COB_LABEL;

  editorAberto = false;
  editId: number | null = null;
  form: RecorrenciaInput = this.novoForm();
  salvando = false;
  /** Erro do dia do vencimento (fora de 1 a 28). */
  erroDia = '';

  copiada: number | null = null;

  ngOnInit() {
    this.ui.setTitulo('Mensalidades');
    this.carregar();
  }

  carregar() {
    this.carregando = true;
    this.api.getClientes().subscribe((c) => (this.clientes = c));
    this.api.getProjetos().subscribe((p) => (this.projetos = p));
    forkJoin({
      recorrencias: this.api.getRecorrencias(),
      cobrancas: this.api.getCobrancas(),
    }).subscribe({
      next: ({ recorrencias, cobrancas }) => {
        this.itens = recorrencias;
        this.cobrancas = cobrancas;
        this.carregando = false;
      },
      error: () => (this.carregando = false),
    });
  }

  clientesOpc(): OpcaoSelect[] {
    return this.clientes.map((c) => ({ valor: c.id, rot: c.nome }));
  }

  projetosOpc(): OpcaoSelect[] {
    return [
      { valor: null, rot: 'Sem projeto vinculado' },
      ...this.projetos.map((p) => ({
        valor: p.id,
        rot: `${p.cliente?.nome || 'Cliente'} (${p.tipo})`,
      })),
    ];
  }

  /* ---------- Mensalidades ---------- */
  filtradas(): Rec[] {
    if (this.filtro === 'todas') return this.itens;
    return this.itens.filter((r) => r.status === this.filtro);
  }

  contar(status: StatusRecorrencia): number {
    return this.itens.filter((r) => r.status === status).length;
  }

  /** MRR: so as ativas contam. */
  mrr(): number {
    return this.itens
      .filter((r) => r.status === 'ativo')
      .reduce((s, r) => s + Number(r.valor || 0), 0);
  }

  /** Previstas: comecam a valer quando o projeto for entregue. */
  previsto(): number {
    return this.itens
      .filter((r) => r.status === 'previsto')
      .reduce((s, r) => s + Number(r.valor || 0), 0);
  }

  projetoDe(r: Rec): Projeto | undefined {
    return this.projetos.find((p) => p.id === r.projeto_id);
  }

  tipoDoProjeto(p: Projeto): string {
    return TIPO_LABEL[p.tipo];
  }

  novoForm(): RecorrenciaInput {
    return {
      cliente_id: 0,
      projeto_id: null,
      plano: '',
      valor: 0,
      status: 'ativo',
      dia_vencimento: 10,
      inicio: null,
      contato: null,
    };
  }

  abrirNovo() {
    this.editId = null;
    this.erroDia = '';
    this.form = this.novoForm();
    if (this.clientes.length) this.form.cliente_id = this.clientes[0].id;
    this.editorAberto = true;
  }

  abrirEditar(r: Rec) {
    this.editId = r.id;
    this.erroDia = '';
    this.form = {
      cliente_id: r.cliente_id,
      projeto_id: r.projeto_id ?? null,
      plano: r.plano,
      valor: r.valor,
      status: r.status,
      dia_vencimento: r.dia_vencimento,
      inicio: r.inicio || null,
      contato: r.contato || null,
    };
    this.editorAberto = true;
  }

  fecharEditor() {
    this.editorAberto = false;
  }

  salvar() {
    if (!this.form.cliente_id || !this.form.plano.trim()) return;
    // Vazio volta ao padrao 10; fora de 1 a 28 avisa e nao salva
    const bruto = this.form.dia_vencimento;
    const dia = bruto == null || `${bruto}` === '' ? 10 : Number(bruto);
    if (!Number.isInteger(dia) || dia < 1 || dia > 28) {
      this.erroDia = 'Informe um dia de 1 a 28.';
      return;
    }
    this.erroDia = '';
    this.salvando = true;
    const payload: RecorrenciaInput = {
      ...this.form,
      valor: Number(this.form.valor) || 0,
      dia_vencimento: dia,
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

  trocarStatus(r: Rec, status: StatusRecorrencia) {
    this.api.patchStatusRecorrencia(r.id, status).subscribe(() => this.carregar());
  }

  async excluir(r: Rec) {
    const ok = await this.confirm.ask({
      title: 'Excluir mensalidade',
      message: 'Excluir esta mensalidade? As cobranças geradas também saem.',
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.excluirRecorrencia(r.id).subscribe(() => this.carregar());
  }

  /* ---------- Cobrancas do mes ---------- */
  vencida(c: Cobranca): boolean {
    return c.status === 'aberta' && diasAte(c.vencimento) < 0;
  }
  aVencer(c: Cobranca): boolean {
    const d = diasAte(c.vencimento);
    return c.status === 'aberta' && d >= 0 && d <= 3;
  }

  /** "Vence hoje", "Vence amanhã", "Vence em 12 dias". */
  venceTexto(c: Cobranca): string {
    const d = diasAte(c.vencimento);
    if (d === 0) return 'Vence hoje';
    if (d === 1) return 'Vence amanhã';
    return `Vence em ${d} dias`;
  }

  /** Recebido no mes corrente (cobrancas pagas da competencia atual). */
  recebidoMes(): number {
    return this.cobrancas
      .filter((c) => c.status === 'paga' && c.competencia === this.mesAtual())
      .reduce((s, c) => s + Number(c.valor || 0), 0);
  }
  emAbertoMes(): number {
    return this.cobrancas
      .filter((c) => c.status === 'aberta' && c.competencia === this.mesAtual())
      .reduce((s, c) => s + Number(c.valor || 0), 0);
  }
  vencidoTotal(): number {
    return this.cobrancas
      .filter((c) => this.vencida(c))
      .reduce((s, c) => s + Number(c.valor || 0), 0);
  }

  mesAtual(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  pagar(c: Cobranca) {
    this.api.pagarCobranca(c.id).subscribe((atual) => this.trocarCobranca(atual));
  }
  cancelar(c: Cobranca) {
    this.api.cancelarCobranca(c.id).subscribe((atual) => this.trocarCobranca(atual));
  }
  reabrir(c: Cobranca) {
    this.api.reabrirCobranca(c.id).subscribe((atual) => this.trocarCobranca(atual));
  }

  private trocarCobranca(c: Cobranca) {
    this.cobrancas = this.cobrancas.map((x) => (x.id === c.id ? c : x));
  }

  /** Texto pronto para colar no WhatsApp. Só copia, sem integração. */
  copiarMensagem(c: Cobranca) {
    const texto =
      `Olá ${c.cliente || ''}, tudo bem? Passando para lembrar da mensalidade ` +
      `de ${competenciaBr(c.competencia)}, no valor de ${moeda(c.valor)}, ` +
      `com vencimento em ${dataBr(c.vencimento)}. Qualquer dúvida é só chamar.`;
    navigator.clipboard?.writeText(texto).then(
      () => {
        this.copiada = c.id;
        setTimeout(() => (this.copiada = null), 2500);
      },
      () => {},
    );
  }
}
