import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import { OrcamentosStore } from '../../core/orcamentos.store';
import {
  Cliente,
  Orcamento,
  OrcamentoInput,
  OrcamentoItem,
  ParcelaOrcamento,
  Projeto,
} from '../../core/models';
import {
  moeda,
  MODELOS_ESCOPO,
  STATUS_ORC,
  TIPO_LABEL,
  TIPOS,
} from '../../core/utils';
import { PropostaAnexo } from '../../shared/documentos/proposta-anexo';
import { AppSelect, OpcaoSelect } from '../../shared/ui/app-select';

/** Como a parcela vence, achatado num unico select. */
type VencimentoSel = 'aprovacao' | 'entrega' | 'dias';

/**
 * Tela dedicada de criacao e edicao de orcamento (/orcamentos/novo e
 * /orcamentos/:id), em secoes na ordem natural: cliente e projeto, itens,
 * forma de pagamento (parcelas), condicoes, observacoes e proposta em PDF.
 */
@Component({
  selector: 'app-orcamento-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, PropostaAnexo, AppSelect],
  templateUrl: './orcamento-editor.html',
  styleUrl: './orcamento-editor.scss',
})
export class OrcamentoEditor implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);
  private store = inject(OrcamentosStore);
  private rota = inject(ActivatedRoute);
  private router = inject(Router);

  clientes: Cliente[] = [];
  projetos: Projeto[] = [];
  original: Orcamento | null = null;
  carregando = true;
  salvando = false;
  /** Aviso quando tentou emitir sem nenhuma parcela definida. */
  faltaPlano = false;

  form: OrcamentoInput = this.novoForm();
  plano: ParcelaOrcamento[] = [];

  tipos = TIPOS;
  statusOpc = STATUS_ORC;
  money = moeda;

  tiposValor: OpcaoSelect[] = [
    { valor: 'percentual', rot: '% do total' },
    { valor: 'fixo', rot: 'Valor (R$)' },
  ];
  vencimentos: OpcaoSelect[] = [
    { valor: 'aprovacao', rot: 'Na aprovação' },
    { valor: 'entrega', rot: 'Na entrega' },
    { valor: 'dias', rot: 'Dias após aprovação' },
  ];

  get editId(): number | null {
    const bruto = this.rota.snapshot.paramMap.get('id');
    const id = Number(bruto);
    return bruto && !isNaN(id) ? id : null;
  }

  ngOnInit() {
    this.ui.setTitulo(this.editId ? 'Editar orçamento' : 'Novo orçamento');
    this.api.getClientes().subscribe((c) => {
      this.clientes = c;
      if (!this.editId && !this.form.cliente_id && c.length) {
        this.form.cliente_id = c[0].id;
      }
    });
    this.api.getProjetos().subscribe((p) => (this.projetos = p));

    if (this.editId) {
      this.api.getOrcamento(this.editId).subscribe({
        next: (o) => {
          this.aplicar(o);
          this.carregando = false;
        },
        error: () => {
          this.carregando = false;
          this.router.navigate(['/orcamentos']);
        },
      });
    } else {
      // Novo: pode vir com cliente e projeto pre-definidos (a partir do projeto)
      const q = this.rota.snapshot.queryParamMap;
      const cliente = Number(q.get('cliente'));
      const projeto = Number(q.get('projeto'));
      if (cliente) this.form.cliente_id = cliente;
      if (projeto) this.form.projeto_id = projeto;
      this.aplicarModelo();
      this.carregando = false;
    }
  }

  private aplicar(o: Orcamento) {
    this.original = o;
    this.form = {
      cliente_id: o.cliente_id,
      projeto_id: o.projeto_id ?? null,
      titulo: o.titulo,
      tipo: o.tipo,
      desconto: o.desconto,
      // O texto livre de pagamento saiu da interface; o valor antigo e
      // preservado como esta (o PDF so o usa se nao houver parcelas)
      pagamento: o.pagamento,
      prazo: o.prazo,
      validade_dias: o.validade_dias,
      obs: o.obs,
      status: o.status,
      itens: (o.itens || []).map((i) => ({ ...i })),
    };
    this.plano = (o.plano || []).map((p) => ({ ...p }));
    this.ui.setTitulo(`Orçamento ${o.numero}`);
  }

  novoForm(): OrcamentoInput {
    return {
      cliente_id: 0,
      projeto_id: null,
      titulo: '',
      tipo: 'site',
      desconto: 0,
      pagamento: '',
      prazo: '30 dias',
      validade_dias: 15,
      obs: '',
      status: 'rascunho',
      itens: [],
    };
  }

  clientesOpc(): OpcaoSelect[] {
    return this.clientes.map((c) => ({ valor: c.id, rot: c.nome }));
  }

  projetosOpc(): OpcaoSelect[] {
    const doCliente = this.projetos.filter(
      (p) => p.cliente_id === this.form.cliente_id && p.stage !== 'recusado',
    );
    return [
      { valor: null, rot: 'Sem projeto vinculado' },
      ...doCliente.map((p) => ({
        valor: p.id,
        rot: `${TIPO_LABEL[p.tipo]} · ${moeda(p.valor)}`,
      })),
    ];
  }

  /* ---------- Itens ---------- */
  subtotal(): number {
    return this.form.itens.reduce((s, i) => s + Number(i.valor || 0), 0);
  }
  totalForm(): number {
    return Math.max(this.subtotal() - Number(this.form.desconto || 0), 0);
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

  /* ---------- Forma de pagamento (plano de parcelas) ---------- */
  addParcela() {
    this.faltaPlano = false;
    this.plano.push({
      descricao: '',
      tipo_valor: 'percentual',
      percentual: null,
      valor_fixo: null,
      tipo_vencimento: 'marco',
      marco: 'aprovacao',
      dias: null,
      ordem: this.plano.length,
    });
  }

  /** Caso simples: 100% na aprovacao. */
  parcelaUnica() {
    this.faltaPlano = false;
    this.plano = [
      {
        descricao: 'Parcela única',
        tipo_valor: 'percentual',
        percentual: 100,
        valor_fixo: null,
        tipo_vencimento: 'marco',
        marco: 'aprovacao',
        dias: null,
        ordem: 0,
      },
    ];
  }

  removerParcela(p: ParcelaOrcamento) {
    this.plano = this.plano.filter((x) => x !== p);
  }

  vencSel(p: ParcelaOrcamento): VencimentoSel {
    if (p.tipo_vencimento === 'dias') return 'dias';
    return p.marco === 'entrega' ? 'entrega' : 'aprovacao';
  }

  setVenc(p: ParcelaOrcamento, v: VencimentoSel) {
    if (v === 'dias') {
      p.tipo_vencimento = 'dias';
      p.marco = null;
      p.dias = p.dias ?? 30;
    } else {
      p.tipo_vencimento = 'marco';
      p.marco = v;
      p.dias = null;
    }
  }

  valorParcela(p: ParcelaOrcamento): number {
    if (p.tipo_valor === 'fixo') return Number(p.valor_fixo || 0);
    return (this.totalForm() * Number(p.percentual || 0)) / 100;
  }

  somaPlano(): number {
    return this.plano.reduce((s, p) => s + this.valorParcela(p), 0);
  }

  diferencaPlano(): number {
    return Math.round((this.totalForm() - this.somaPlano()) * 100) / 100;
  }

  /* ---------- Salvar ---------- */
  private montarPayload(): OrcamentoInput {
    return {
      ...this.form,
      projeto_id: this.form.projeto_id || null,
      desconto: Number(this.form.desconto) || 0,
      validade_dias: Number(this.form.validade_dias) || 15,
      itens: this.form.itens.map((i, idx) => ({
        titulo: i.titulo,
        descricao: i.descricao || '',
        valor: Number(i.valor) || 0,
        ordem: idx + 1,
      })),
      plano: this.plano.map((p, idx) => ({
        descricao: (p.descricao || '').trim() || `Parcela ${idx + 1}`,
        tipo_valor: p.tipo_valor,
        percentual:
          p.tipo_valor === 'percentual' ? Number(p.percentual || 0) : null,
        valor_fixo: p.tipo_valor === 'fixo' ? Number(p.valor_fixo || 0) : null,
        tipo_vencimento: p.tipo_vencimento,
        marco: p.tipo_vencimento === 'marco' ? p.marco || 'aprovacao' : null,
        dias: p.tipo_vencimento === 'dias' ? Number(p.dias || 0) : null,
        ordem: idx,
      })),
    };
  }

  get valido(): boolean {
    return !!this.form.cliente_id && !!this.form.titulo.trim();
  }

  private gravar(depois: (o: Orcamento) => void) {
    if (!this.valido) return;
    this.salvando = true;
    const payload = this.montarPayload();
    const req = this.editId
      ? this.api.atualizarOrcamento(this.editId, payload)
      : this.api.criarOrcamento(payload);
    req.subscribe({
      next: (o) => {
        this.salvando = false;
        this.store.upsert(o);
        depois(o);
      },
      error: () => (this.salvando = false),
    });
  }

  salvar() {
    this.gravar(() => this.router.navigate(['/orcamentos']));
  }

  /** Salva e ja abre o documento para emitir o PDF. */
  salvarEmitir() {
    if (!this.plano.length) {
      // Todo orcamento emitido precisa de ao menos uma parcela
      this.faltaPlano = true;
      document
        .getElementById('secao-pagamento')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    this.gravar((o) => {
      this.store.abrirDoc.set(o.id);
      this.router.navigate(['/orcamentos']);
    });
  }

  cancelar() {
    this.router.navigate(['/orcamentos']);
  }

  aoMudarAnexo(o: Orcamento) {
    this.original = o;
    this.store.upsert(o);
  }
}
