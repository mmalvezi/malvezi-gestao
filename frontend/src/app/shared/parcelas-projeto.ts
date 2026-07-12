import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import {
  ParcelaInput,
  ParcelaProjeto,
  PlanoInfo,
  Projeto,
} from '../core/models';
import { dataBr, diasAte, moeda, relativo } from '../core/utils';
import { Dialog } from './dialog';
import { AppDatepicker } from './ui/app-datepicker';
import { ConfirmService } from './ui/confirm.service';

/**
 * Parcelas de recebimento do projeto. O recebido do projeto e a soma das
 * parcelas pagas: nao existe mais campo de valor pago solto.
 */
@Component({
  selector: 'app-parcelas-projeto',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, AppDatepicker],
  template: `
    <div class="between mb-16">
      <span class="section-title" style="margin:0">Parcelas de recebimento</span>
      <button class="btn primary sm" (click)="abrirNova()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Nova parcela
      </button>
    </div>

    <!-- Resumo -->
    <div class="resumo">
      <div>
        <div class="mut tiny">Valor do projeto</div>
        <div class="bold">{{ money(projeto.valor) }}</div>
      </div>
      <div>
        <div class="mut tiny">Recebido</div>
        <div class="bold" style="color:var(--ok)">{{ money(recebido()) }}</div>
      </div>
      <div>
        <div class="mut tiny">Saldo</div>
        <div class="bold">{{ money(saldo()) }}</div>
      </div>
      <div>
        <div class="mut tiny">Parcelas</div>
        <div class="bold">{{ pagas() }} de {{ parcelas.length }} pagas</div>
      </div>
    </div>

    <!-- Plano de pagamento do orcamento vinculado -->
    @if (planoInfo; as info) {
      @if (info.tem_plano) {
        @if (!parcelas.length) {
          <div class="plano-box tiny">
            O orçamento {{ info.orcamento_numero }} tem um plano de pagamento.
            <button class="btn sm" (click)="gerarDoPlano(false)" [disabled]="gerando">
              {{ gerando ? 'Gerando...' : 'Gerar parcelas do plano' }}
            </button>
          </div>
        } @else if (info.plano_mudou) {
          <div class="plano-box tiny warn">
            O plano do orçamento {{ info.orcamento_numero }} mudou depois que
            as parcelas foram geradas. Elas não são alteradas sozinhas.
            <button class="btn sm" (click)="gerarDoPlano(true)" [disabled]="gerando">
              Regerar do plano
            </button>
          </div>
        } @else if (!info.gerado) {
          <div class="plano-box tiny">
            Este projeto já tem recebimentos cadastrados. O plano do orçamento
            {{ info.orcamento_numero }} não foi aplicado.
            <button class="btn sm" (click)="gerarDoPlano(true)" [disabled]="gerando">
              Substituir pelas do plano
            </button>
          </div>
        }
      }
    }

    @if (parcelas.length && diferenca() !== 0) {
      <div class="aviso tiny">
        A soma das parcelas ({{ money(somaParcelas()) }}) não bate com o valor do
        projeto ({{ money(projeto.valor) }}).
        @if (diferenca() > 0) {
          Faltam {{ money(diferenca()) }} para fechar.
        } @else {
          Passou {{ money(-diferenca()) }} do valor.
        }
      </div>
    }

    @if (parcelas.length) {
      <div class="lista">
        @for (p of parcelas; track p.id) {
          <div class="parcela" [class.paga]="p.pago" [class.vencida]="vencida(p)">
            <button
              class="check"
              [class.on]="p.pago"
              (click)="alternar(p)"
              [attr.aria-label]="p.pago ? 'Desmarcar recebimento' : 'Marcar como recebida'"
            >
              @if (p.pago) {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              }
            </button>

            <div class="min0">
              <div class="bold small trunc">{{ p.descricao }}</div>
              <div class="mut tiny">
                @if (p.pago) {
                  Recebida em {{ data(p.pago_em) }}
                } @else if (p.vencimento) {
                  @if (vencida(p)) {
                    Venceu em {{ data(p.vencimento) }} {{ rel(p.vencimento) }}
                  } @else {
                    Vence em {{ data(p.vencimento) }} {{ rel(p.vencimento) }}
                  }
                } @else {
                  Sem vencimento definido
                }
              </div>
            </div>

            <span class="valor bold">{{ money(p.valor) }}</span>

            <div class="items-center gap-6">
              <button class="icon-btn sm" (click)="abrirEditar(p)" aria-label="Editar parcela">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <button class="icon-btn sm" (click)="excluir(p)" aria-label="Excluir parcela">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="vazio mut small">
        Nenhuma parcela cadastrada. Enquanto não houver parcelas, o projeto
        aparece como totalmente em aberto.
      </div>
    }

    @if (editorAberto) {
      <app-dialog
        [titulo]="editId ? 'Editar parcela' : 'Nova parcela'"
        [largura]="480"
        (fechar)="editorAberto = false"
      >
        <div class="field">
          <label for="parcela-desc">Descrição</label>
          <input
            id="parcela-desc"
            class="input"
            [(ngModel)]="form.descricao"
            name="descricao"
            placeholder="Ex.: Entrada, 2a parcela, Na entrega"
          />
        </div>
        <div class="row-2">
          <div class="field">
            <label for="parcela-valor">Valor (R$)</label>
            <input
              id="parcela-valor"
              class="input"
              type="number"
              min="0"
              [(ngModel)]="form.valor"
              name="valor"
            />
          </div>
          <div class="field">
            <label>Vencimento</label>
            <app-datepicker
              ariaLabel="Vencimento da parcela"
              [(ngModel)]="form.vencimento"
              name="vencimento"
            ></app-datepicker>
          </div>
        </div>
        <label class="marcar">
          <input type="checkbox" [(ngModel)]="form.pago" name="pago" />
          <span>Já recebida</span>
        </label>

        <div foot class="items-center">
          <button class="btn ghost" (click)="editorAberto = false">Cancelar</button>
          <button class="btn primary" (click)="salvar()" [disabled]="salvando">
            {{ salvando ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </app-dialog>
    }
  `,
  styles: [
    `
      .min0 {
        min-width: 0;
      }
      .trunc {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .resumo {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        background: var(--soft);
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 12px;
      }
      .aviso {
        background: var(--warn-bg);
        color: var(--warn);
        border-radius: 10px;
        padding: 9px 12px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .plano-box {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        background: var(--info-bg);
        color: var(--info);
        border-radius: 10px;
        padding: 9px 12px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .plano-box.warn {
        background: var(--warn-bg);
        color: var(--warn);
      }
      .lista {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .parcela {
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1px solid var(--borda);
        border-radius: 12px;
        padding: 10px 12px;
        background: #fff;
      }
      .parcela .min0 {
        flex: 1;
      }
      .parcela.paga {
        background: var(--ok-bg);
        border-color: transparent;
      }
      .parcela.vencida {
        border-color: var(--bad);
        background: var(--bad-bg);
      }
      .valor {
        white-space: nowrap;
      }
      .check {
        width: 24px;
        height: 24px;
        border-radius: 8px;
        border: 2px solid var(--borda);
        background: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #fff;
        flex-shrink: 0;
      }
      .check.on {
        background: var(--ok);
        border-color: var(--ok);
      }
      .check svg {
        width: 13px;
        height: 13px;
      }
      .vazio {
        background: var(--soft);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
      }
      .marcar {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        color: var(--ink2);
      }
      @media (max-width: 620px) {
        .resumo {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .parcela {
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class ParcelasProjeto implements OnInit {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);

  @Input({ required: true }) projeto!: Projeto;
  /** Avisa o pai que o recebido mudou. */
  @Output() mudou = new EventEmitter<ParcelaProjeto[]>();

  parcelas: ParcelaProjeto[] = [];
  planoInfo: PlanoInfo | null = null;
  gerando = false;

  money = moeda;
  data = dataBr;
  rel = relativo;

  editorAberto = false;
  editId: number | null = null;
  salvando = false;
  form: ParcelaInput = this.novoForm();

  ngOnInit() {
    this.carregar();
    this.carregarPlanoInfo();
  }

  carregar() {
    this.api.getParcelas(this.projeto.id).subscribe((p) => {
      this.parcelas = p;
      this.mudou.emit(this.parcelas);
    });
  }

  carregarPlanoInfo() {
    this.api.getPlanoInfo(this.projeto.id).subscribe({
      next: (info) => (this.planoInfo = info),
      error: () => (this.planoInfo = null),
    });
  }

  /** Gera (ou substitui) as parcelas a partir do plano do orcamento. */
  async gerarDoPlano(substituir: boolean) {
    if (substituir) {
      const ok = await this.confirm.ask({
        title: 'Substituir parcelas',
        message:
          'Substituir as parcelas atuais pelas do plano do orçamento? Os recebimentos já marcados serão perdidos.',
        confirmText: 'Substituir',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.gerando = true;
    this.api.gerarParcelasDoPlano(this.projeto.id, substituir).subscribe({
      next: () => {
        this.gerando = false;
        this.carregar();
        this.carregarPlanoInfo();
      },
      error: () => (this.gerando = false),
    });
  }

  novoForm(): ParcelaInput {
    return { descricao: '', valor: 0, vencimento: null, pago: false };
  }

  recebido(): number {
    return this.parcelas
      .filter((p) => p.pago)
      .reduce((s, p) => s + Number(p.valor || 0), 0);
  }
  saldo(): number {
    return Math.max(Number(this.projeto.valor || 0) - this.recebido(), 0);
  }
  pagas(): number {
    return this.parcelas.filter((p) => p.pago).length;
  }
  somaParcelas(): number {
    return this.parcelas.reduce((s, p) => s + Number(p.valor || 0), 0);
  }
  diferenca(): number {
    return Number(this.projeto.valor || 0) - this.somaParcelas();
  }

  vencida(p: ParcelaProjeto): boolean {
    return !p.pago && !!p.vencimento && diasAte(p.vencimento) < 0;
  }

  abrirNova() {
    this.editId = null;
    this.form = this.novoForm();
    // Sugere o que falta para fechar o valor do projeto
    const falta = this.diferenca();
    if (falta > 0) this.form.valor = falta;
    this.editorAberto = true;
  }

  abrirEditar(p: ParcelaProjeto) {
    this.editId = p.id;
    this.form = {
      descricao: p.descricao,
      valor: p.valor,
      vencimento: p.vencimento || null,
      pago: p.pago,
    };
    this.editorAberto = true;
  }

  salvar() {
    this.salvando = true;
    const payload: ParcelaInput = {
      ...this.form,
      valor: Number(this.form.valor) || 0,
      vencimento: this.form.vencimento || null,
    };
    const req = this.editId
      ? this.api.atualizarParcela(this.editId, payload)
      : this.api.criarParcela(this.projeto.id, payload);
    req.subscribe({
      next: () => {
        this.salvando = false;
        this.editorAberto = false;
        this.carregar();
      },
      error: () => (this.salvando = false),
    });
  }

  alternar(p: ParcelaProjeto) {
    this.api.pagarParcela(p.id).subscribe((atual) => {
      p.pago = atual.pago;
      p.pago_em = atual.pago_em;
      this.mudou.emit(this.parcelas);
    });
  }

  async excluir(p: ParcelaProjeto) {
    const ok = await this.confirm.ask({
      title: 'Excluir parcela',
      message: `Excluir a parcela "${p.descricao}"?`,
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.excluirParcela(p.id).subscribe(() => this.carregar());
  }
}
