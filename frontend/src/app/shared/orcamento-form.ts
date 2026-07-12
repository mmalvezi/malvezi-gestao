import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { OrcamentosStore } from '../core/orcamentos.store';
import {
  Cliente,
  Orcamento,
  OrcamentoInput,
  OrcamentoItem,
  ParcelaOrcamento,
  Projeto,
} from '../core/models';
import {
  moeda,
  MODELOS_ESCOPO,
  STATUS_ORC,
  TIPO_LABEL,
  TIPOS,
} from '../core/utils';
import { Dialog } from './dialog';
import { AppSelect, OpcaoSelect } from './ui/app-select';

/** Como a parcela vence, achatado num unico select. */
type VencimentoSel = 'aprovacao' | 'entrega' | 'dias';

@Component({
  selector: 'app-orcamento-form',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, AppSelect],
  template: `
    <app-dialog
      [titulo]="ehEdicao ? 'Editar orçamento' : 'Novo orçamento'"
      [largura]="720"
      [zIndex]="zIndex"
      (fechar)="fechar.emit()"
    >
      <div class="row-2">
        <div class="field">
          <label>Cliente</label>
          <app-select
            [opcoes]="clientesOpc()"
            placeholder="Selecione o cliente"
            ariaLabel="Cliente"
            [(ngModel)]="form.cliente_id"
            name="cliente_id"
          ></app-select>
        </div>
        <div class="field">
          <label>Tipo (modelo de escopo)</label>
          <div class="items-center">
            <app-select
              style="flex:1"
              [opcoes]="tipos"
              ariaLabel="Tipo"
              [(ngModel)]="form.tipo"
              name="tipo"
            ></app-select>
            <button class="btn sm ghost" type="button" (click)="aplicarModelo()">Aplicar</button>
          </div>
        </div>
      </div>

      <div class="field">
        <label>Título</label>
        <input class="input" [(ngModel)]="form.titulo" name="titulo" placeholder="Ex.: Site institucional" />
      </div>

      <div class="field">
        <label>Projeto vinculado (para gerar as parcelas na aprovação)</label>
        <app-select
          [opcoes]="projetosOpc()"
          placeholder="Sem projeto vinculado"
          ariaLabel="Projeto vinculado"
          [(ngModel)]="form.projeto_id"
          name="projeto_id"
        ></app-select>
      </div>

      <div class="itens">
        <div class="between mb-8">
          <span class="mut tiny">Itens do escopo</span>
          <button class="btn sm ghost" type="button" (click)="addItem()">+ Adicionar item</button>
        </div>
        @for (item of form.itens; track $index) {
          <div class="item">
            <input class="input" [(ngModel)]="item.titulo" [name]="'it-tit-' + $index" placeholder="Título" />
            <input class="input" [(ngModel)]="item.descricao" [name]="'it-desc-' + $index" placeholder="Descrição" />
            <input class="input valor" type="number" min="0" [(ngModel)]="item.valor" [name]="'it-val-' + $index" placeholder="Valor" />
            <button class="icon-btn" type="button" (click)="removerItem(item)" aria-label="Remover item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        }
        @if (!form.itens.length) {
          <div class="mut tiny">Sem itens. Use Aplicar para carregar o modelo ou + Adicionar item.</div>
        }
      </div>

      <div class="row-3 mt-16">
        <div class="field">
          <label>Desconto (R$)</label>
          <input class="input" type="number" min="0" [(ngModel)]="form.desconto" name="desconto" />
        </div>
        <div class="field">
          <label>Validade (dias)</label>
          <input class="input" type="number" min="1" [(ngModel)]="form.validade_dias" name="validade" />
        </div>
        <div class="field">
          <label>Status</label>
          <app-select [opcoes]="statusOpc" ariaLabel="Status" [(ngModel)]="form.status" name="status"></app-select>
        </div>
      </div>

      <div class="row-2">
        <div class="field">
          <label>Pagamento</label>
          <input class="input" [(ngModel)]="form.pagamento" name="pagamento" />
        </div>
        <div class="field">
          <label>Prazo</label>
          <input class="input" [(ngModel)]="form.prazo" name="prazo" />
        </div>
      </div>

      <div class="field">
        <label>Observações</label>
        <textarea class="textarea" [(ngModel)]="form.obs" name="obs"></textarea>
      </div>

      <!-- Plano de pagamento: vira as parcelas do projeto na aprovacao -->
      <div class="itens plano">
        <div class="between mb-8 wrap">
          <span class="mut tiny">Plano de pagamento (vira as parcelas do projeto na aprovação)</span>
          <span class="items-center gap-6">
            <button class="btn sm ghost" type="button" (click)="parcelaUnica()">Parcela única</button>
            <button class="btn sm ghost" type="button" (click)="addParcela()">+ Adicionar parcela</button>
          </span>
        </div>

        @for (p of plano; track $index) {
          <div class="parc">
            <input
              class="input"
              [(ngModel)]="p.descricao"
              [name]="'pl-desc-' + $index"
              placeholder="Ex.: Entrada, 2a parcela, Na entrega"
            />
            <app-select
              [opcoes]="tiposValor"
              [compacto]="true"
              ariaLabel="Tipo de valor"
              [(ngModel)]="p.tipo_valor"
              [name]="'pl-tv-' + $index"
            ></app-select>
            @if (p.tipo_valor === 'percentual') {
              <input
                class="input num"
                type="number"
                min="0"
                max="100"
                [(ngModel)]="p.percentual"
                [name]="'pl-pct-' + $index"
                placeholder="%"
                aria-label="Percentual da parcela"
              />
            } @else {
              <input
                class="input num"
                type="number"
                min="0"
                [(ngModel)]="p.valor_fixo"
                [name]="'pl-fix-' + $index"
                placeholder="R$"
                aria-label="Valor fixo da parcela"
              />
            }
            <app-select
              [opcoes]="vencimentos"
              [compacto]="true"
              ariaLabel="Vencimento da parcela"
              [ngModel]="vencSel(p)"
              (ngModelChange)="setVenc(p, $event)"
              [name]="'pl-venc-' + $index"
            ></app-select>
            @if (p.tipo_vencimento === 'dias') {
              <input
                class="input num"
                type="number"
                min="0"
                [(ngModel)]="p.dias"
                [name]="'pl-dias-' + $index"
                placeholder="dias"
                aria-label="Dias corridos após a aprovação"
              />
            } @else {
              <span></span>
            }
            <span class="calc bold small">{{ money(valorParcela(p)) }}</span>
            <button class="icon-btn" type="button" (click)="removerParcela(p)" aria-label="Remover parcela">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        }

        @if (!plano.length) {
          <div class="mut tiny">
            Sem plano cadastrado: as condições continuam só no campo de texto,
            como hoje, e as parcelas do projeto seguem manuais.
          </div>
        } @else {
          <div class="fecho tiny" [class.ok]="diferencaPlano() === 0" [class.warn]="diferencaPlano() !== 0">
            @if (diferencaPlano() === 0) {
              As parcelas fecham o total de {{ money(totalForm()) }}.
            } @else if (diferencaPlano() > 0) {
              As parcelas somam {{ money(somaPlano()) }}. Faltam {{ money(diferencaPlano()) }} para fechar o total.
            } @else {
              As parcelas somam {{ money(somaPlano()) }}, {{ money(-diferencaPlano()) }} a mais que o total.
            }
          </div>
        }
      </div>

      <div class="resumo">
        <span class="mut">Subtotal {{ money(subtotal()) }} &middot; Desconto {{ money(form.desconto) }}</span>
        <span class="total">Total {{ money(totalForm()) }}</span>
      </div>

      <div foot class="between" style="width:100%">
        <span></span>
        <span class="items-center">
          <button class="btn ghost" (click)="fechar.emit()">Cancelar</button>
          <button class="btn primary" (click)="salvar()" [disabled]="salvando || !form.cliente_id || !form.titulo.trim()">
            {{ salvando ? 'Salvando...' : 'Salvar' }}
          </button>
        </span>
      </div>
    </app-dialog>
  `,
  styles: [
    `
      .itens {
        border: 1px solid var(--borda);
        border-radius: 12px;
        padding: 14px;
        background: var(--soft);
      }
      .item {
        display: grid;
        grid-template-columns: 1.1fr 1.4fr 110px 34px;
        gap: 8px;
        margin-bottom: 8px;
        align-items: center;
      }
      .item .input {
        background: #fff;
      }
      .item .valor {
        text-align: right;
      }
      .resumo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 16px;
        padding: 12px 16px;
        background: var(--soft);
        border-radius: 12px;
        flex-wrap: wrap;
      }
      .resumo .total {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        font-size: 18px;
      }

      /* Plano de pagamento */
      .plano {
        margin-top: 14px;
      }
      .parc {
        display: grid;
        grid-template-columns: 1.3fr 118px 76px 172px 70px 92px 34px;
        gap: 8px;
        margin-bottom: 8px;
        align-items: center;
      }
      .parc .input {
        background: #fff;
      }
      .parc .num {
        text-align: right;
      }
      .parc .calc {
        text-align: right;
        white-space: nowrap;
      }
      .fecho {
        border-radius: 10px;
        padding: 8px 12px;
        font-weight: 600;
        margin-top: 4px;
      }
      .fecho.ok {
        background: var(--ok-bg);
        color: var(--ok);
      }
      .fecho.warn {
        background: var(--warn-bg);
        color: var(--warn);
      }

      @media (max-width: 620px) {
        .item {
          grid-template-columns: 1fr 1fr;
        }
        .item .valor {
          grid-column: 1;
        }
        .parc {
          grid-template-columns: 1fr 1fr;
        }
        .parc .calc {
          text-align: left;
        }
      }
    `,
  ],
})
export class OrcamentoForm implements OnInit {
  private api = inject(ApiService);
  private store = inject(OrcamentosStore);

  /** Orcamento existente (id > 0) para editar, ou base (id 0) para criar. */
  @Input() inicial: Orcamento | null = null;
  @Input() clientes: Cliente[] = [];
  @Input() clienteIdInicial?: number;
  /** Quando aberto por cima do documento (viewer), sobrepor com z-index 90. */
  @Input() zIndex?: number;

  @Output() salvo = new EventEmitter<Orcamento>();
  @Output() fechar = new EventEmitter<void>();

  form: OrcamentoInput = this.novoForm();
  /** Plano de pagamento, editado a parte e enviado junto no salvar. */
  plano: ParcelaOrcamento[] = [];
  projetos: Projeto[] = [];
  salvando = false;

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

  clientesOpc(): OpcaoSelect[] {
    return this.clientes.map((c) => ({ valor: c.id, rot: c.nome }));
  }

  /** Projetos do cliente escolhido (as parcelas nascem num deles). */
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

  get ehEdicao(): boolean {
    return !!this.inicial && this.inicial.id > 0;
  }

  ngOnInit() {
    this.api.getProjetos().subscribe((p) => (this.projetos = p));
    if (this.inicial) {
      this.form = {
        cliente_id: this.inicial.cliente_id,
        projeto_id: this.inicial.projeto_id ?? null,
        titulo: this.inicial.titulo,
        tipo: this.inicial.tipo,
        desconto: this.inicial.desconto,
        pagamento: this.inicial.pagamento,
        prazo: this.inicial.prazo,
        validade_dias: this.inicial.validade_dias,
        obs: this.inicial.obs,
        status: this.inicial.status,
        itens: (this.inicial.itens || []).map((i) => ({ ...i })),
      };
      this.plano = (this.inicial.plano || []).map((p) => ({ ...p }));
    } else {
      this.form = this.novoForm();
      this.form.cliente_id =
        this.clienteIdInicial || (this.clientes[0]?.id ?? 0);
      this.aplicarModelo();
    }
  }

  novoForm(): OrcamentoInput {
    return {
      cliente_id: 0,
      projeto_id: null,
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

  /* ---------- Plano de pagamento ---------- */
  addParcela() {
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

  /** Valor calculado ao vivo (percentual sobre o total, ou o fixo). */
  valorParcela(p: ParcelaOrcamento): number {
    if (p.tipo_valor === 'fixo') return Number(p.valor_fixo || 0);
    return (this.totalForm() * Number(p.percentual || 0)) / 100;
  }

  somaPlano(): number {
    return this.plano.reduce((s, p) => s + this.valorParcela(p), 0);
  }

  /** Positivo: falta para fechar; negativo: passou do total. */
  diferencaPlano(): number {
    return Math.round((this.totalForm() - this.somaPlano()) * 100) / 100;
  }

  salvar() {
    if (!this.form.cliente_id || !this.form.titulo.trim()) return;
    this.salvando = true;
    const payload: OrcamentoInput = {
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
    const req =
      this.inicial && this.inicial.id > 0
        ? this.api.atualizarOrcamento(this.inicial.id, payload)
        : this.api.criarOrcamento(payload);
    req.subscribe({
      next: (o) => {
        this.salvando = false;
        this.store.upsert(o);
        this.salvo.emit(o);
      },
      error: () => (this.salvando = false),
    });
  }
}
