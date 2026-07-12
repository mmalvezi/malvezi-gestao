import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
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
  LIMITE_ANEXO_MB,
  moeda,
  MODELOS_ESCOPO,
  STATUS_ORC,
  tamanhoArquivo,
  TIPO_LABEL,
  TIPOS,
} from '../../core/utils';
import { PropostaAnexo } from '../../shared/documentos/proposta-anexo';
import { AppSelect, OpcaoSelect } from '../../shared/ui/app-select';
import { ConfirmService } from '../../shared/ui/confirm.service';

/** As tres formas de pagamento oferecidas na tela. */
type ModoPagamento = 'a_combinar' | 'unica' | 'personalizadas';

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
  private confirm = inject(ConfirmService);

  @ViewChild('campoArquivo') campoArquivo?: ElementRef<HTMLInputElement>;

  clientes: Cliente[] = [];
  projetos: Projeto[] = [];
  original: Orcamento | null = null;
  carregando = true;
  salvando = false;
  /** Aviso quando tentou emitir sem nenhuma parcela definida. */
  faltaPlano = false;

  form: OrcamentoInput = this.novoForm();
  plano: ParcelaOrcamento[] = [];

  /* Proposta em PDF selecionada antes de salvar (upload adiado) */
  arquivoRetido: File | null = null;
  sobreArquivo = false;
  erroArquivo = '';
  enviandoAnexo = false;
  /** Orcamento salvo mas com o envio do anexo pendente de nova tentativa. */
  erroAnexo = '';
  private idSalvo: number | null = null;

  limiteAnexo = LIMITE_ANEXO_MB;
  tamArquivo = tamanhoArquivo;

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
    if (bruto && !isNaN(id)) return id;
    // Orcamento novo ja salvo nesta tela (ex.: upload do anexo falhou)
    return this.idSalvo;
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
      forma_pagamento: o.forma_pagamento || 'parcelas',
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
      forma_pagamento: 'parcelas',
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

  /* ---------- Forma de pagamento (a combinar | unica | personalizadas) ---------- */
  get aCombinar(): boolean {
    return this.form.forma_pagamento === 'a_combinar';
  }

  /** Qual das tres opcoes esta ativa, para destacar o chip certo. */
  modoAtivo(): ModoPagamento {
    if (this.aCombinar) return 'a_combinar';
    return this.ehParcelaUnica() ? 'unica' : 'personalizadas';
  }

  private ehParcelaUnica(): boolean {
    const p = this.plano[0];
    return (
      this.plano.length === 1 &&
      p.tipo_valor === 'percentual' &&
      Number(p.percentual) === 100 &&
      p.tipo_vencimento === 'marco' &&
      p.marco === 'aprovacao'
    );
  }

  async escolherModo(modo: ModoPagamento) {
    if (modo === this.modoAtivo()) return;
    this.faltaPlano = false;

    if (modo === 'a_combinar') {
      if (this.plano.length) {
        const ok = await this.confirm.ask({
          title: 'Forma de pagamento a combinar',
          message:
            'As parcelas montadas serão descartadas e a forma de pagamento fica para definir com o cliente. Continuar?',
          confirmText: 'Usar a combinar',
          tone: 'danger',
        });
        if (!ok) return;
      }
      this.plano = [];
      this.form.forma_pagamento = 'a_combinar';
      return;
    }

    // Saindo de "a combinar" nada se perde; trocar um plano montado pela
    // parcela unica descarta o que foi montado, entao confirma
    if (modo === 'unica' && this.plano.length && !this.ehParcelaUnica()) {
      const ok = await this.confirm.ask({
        title: 'Parcela única',
        message:
          'O plano atual será substituído por uma parcela única de 100% na aprovação. Continuar?',
        confirmText: 'Usar parcela única',
        tone: 'danger',
      });
      if (!ok) return;
    }

    this.form.forma_pagamento = 'parcelas';
    if (modo === 'unica') {
      this.parcelaUnica();
    } else if (!this.plano.length) {
      this.addParcela();
    }
  }

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

  /* ---------- Proposta em PDF antes de salvar (upload adiado) ---------- */
  escolherArquivo() {
    this.erroArquivo = '';
    this.campoArquivo?.nativeElement.click();
  }

  aoEscolherArquivo(ev: Event) {
    const campo = ev.target as HTMLInputElement;
    const arquivo = campo.files?.[0];
    campo.value = '';
    if (arquivo) this.reterArquivo(arquivo);
  }

  aoArrastarArquivo(ev: DragEvent) {
    ev.preventDefault();
    this.sobreArquivo = true;
  }

  aoSoltarArquivo(ev: DragEvent) {
    ev.preventDefault();
    this.sobreArquivo = false;
    const arquivo = ev.dataTransfer?.files?.[0];
    if (arquivo) this.reterArquivo(arquivo);
  }

  /** Valida na hora e guarda o arquivo; ele so sobe junto com o Salvar. */
  private reterArquivo(arquivo: File) {
    this.erroArquivo = '';
    const ehPdf =
      arquivo.type === 'application/pdf' ||
      arquivo.name.toLowerCase().endsWith('.pdf');
    if (!ehPdf) {
      this.erroArquivo =
        'Somente arquivos PDF sao aceitos. Escolha um arquivo .pdf.';
      return;
    }
    if (arquivo.size > LIMITE_ANEXO_MB * 1024 * 1024) {
      this.erroArquivo = `Arquivo muito grande (${tamanhoArquivo(arquivo.size)}). O limite e ${LIMITE_ANEXO_MB} MB.`;
      return;
    }
    this.arquivoRetido = arquivo;
  }

  removerArquivoRetido() {
    this.arquivoRetido = null;
    this.erroArquivo = '';
  }

  /** Nova tentativa depois de "salvou, mas o anexo falhou". */
  tentarAnexoNovamente() {
    const id = this.editId;
    const arquivo = this.arquivoRetido;
    if (!id || !arquivo) return;
    this.enviandoAnexo = true;
    this.erroAnexo = '';
    this.api.enviarAnexoOrcamento(id, arquivo).subscribe({
      next: (a) => {
        this.enviandoAnexo = false;
        this.arquivoRetido = null;
        if (this.original) {
          this.original = {
            ...this.original,
            tem_anexo: true,
            anexo_nome: a.nome,
            anexo_tamanho: a.tamanho,
            anexo_criado: a.criado,
          };
          this.store.upsert(this.original);
        }
      },
      error: (e) => {
        this.enviandoAnexo = false;
        this.erroAnexo =
          e?.error?.detail ||
          'O envio da proposta falhou de novo. Verifique a conexão e tente outra vez.';
      },
    });
  }

  /* ---------- Salvar ---------- */
  private montarPayload(): OrcamentoInput {
    return {
      ...this.form,
      projeto_id: this.form.projeto_id || null,
      desconto: Number(this.form.desconto) || 0,
      validade_dias: Number(this.form.validade_dias) || 15,
      forma_pagamento: this.form.forma_pagamento || 'parcelas',
      itens: this.form.itens.map((i, idx) => ({
        titulo: i.titulo,
        descricao: i.descricao || '',
        valor: Number(i.valor) || 0,
        ordem: idx + 1,
      })),
      plano: (this.aCombinar ? [] : this.plano).map((p, idx) => ({
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
    this.erroAnexo = '';
    const payload = this.montarPayload();
    const req = this.editId
      ? this.api.atualizarOrcamento(this.editId, payload)
      : this.api.criarOrcamento(payload);
    req.subscribe({
      next: (o) => {
        this.store.upsert(o);
        // Proposta selecionada antes de salvar: sobe agora, com o id em maos
        if (this.arquivoRetido) {
          this.enviandoAnexo = true;
          this.api.enviarAnexoOrcamento(o.id, this.arquivoRetido).subscribe({
            next: () => {
              this.salvando = false;
              this.enviandoAnexo = false;
              this.arquivoRetido = null;
              depois(o);
            },
            error: (e) => {
              // O orcamento NAO se perde: fica na tela, ja salvo, com o
              // aviso e o botao de tentar o envio de novo
              this.salvando = false;
              this.enviandoAnexo = false;
              this.idSalvo = o.id;
              this.original = o;
              this.ui.setTitulo(`Orçamento ${o.numero}`);
              this.erroAnexo =
                e?.error?.detail ||
                'O orçamento foi salvo, mas o envio da proposta em PDF falhou. Tente de novo.';
            },
          });
        } else {
          this.salvando = false;
          depois(o);
        }
      },
      error: () => (this.salvando = false),
    });
  }

  salvar() {
    this.gravar(() => this.router.navigate(['/orcamentos']));
  }

  /** Salva e ja abre o documento para emitir o PDF. */
  salvarEmitir() {
    // Com "a combinar" nao ha parcela para exigir; com plano montado, ao
    // menos uma parcela e obrigatoria para emitir
    if (!this.aCombinar && !this.plano.length) {
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
