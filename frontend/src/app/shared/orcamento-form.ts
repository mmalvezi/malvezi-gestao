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
} from '../core/models';
import { moeda, MODELOS_ESCOPO, STATUS_ORC, TIPOS } from '../core/utils';
import { Dialog } from './dialog';
import { AppSelect, OpcaoSelect } from './ui/app-select';

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
      @media (max-width: 620px) {
        .item {
          grid-template-columns: 1fr 1fr;
        }
        .item .valor {
          grid-column: 1;
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
  salvando = false;

  tipos = TIPOS;
  statusOpc = STATUS_ORC;
  money = moeda;

  clientesOpc(): OpcaoSelect[] {
    return this.clientes.map((c) => ({ valor: c.id, rot: c.nome }));
  }

  get ehEdicao(): boolean {
    return !!this.inicial && this.inicial.id > 0;
  }

  ngOnInit() {
    if (this.inicial) {
      this.form = {
        cliente_id: this.inicial.cliente_id,
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
