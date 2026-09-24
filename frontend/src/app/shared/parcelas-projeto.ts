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
  ParcelamentoInput,
  ParcelaProjeto,
  PlanoInfo,
  Projeto,
} from '../core/models';
import {
  dataBr,
  diasAte,
  dividirValor,
  moeda,
  relativo,
  somarMeses,
} from '../core/utils';
import { Dialog } from './dialog';
import { AppDatepicker } from './ui/app-datepicker';
import { ConfirmService } from './ui/confirm.service';

/** Linha da previa do parcelamento, ja editavel antes de salvar. */
interface LinhaParcelamento {
  descricao: string;
  valor: number;
  vencimento: string;
  /** Marcada quando foi mexida na mao, so para oferecer refazer a divisao. */
  editada: boolean;
}

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
      <div class="items-center gap-6">
        <button class="btn sm" (click)="abrirParcelar()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round" />
          </svg>
          Parcelar
        </button>
        <button class="btn primary sm" (click)="abrirNova()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
          Nova parcela
        </button>
      </div>
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
      } @else if (info.a_combinar && !parcelas.length) {
        <div class="plano-box tiny">
          O orçamento {{ info.orcamento_numero }} ficou com pagamento a
          combinar: nenhum plano foi definido. Cadastre os recebimentos aqui.
        </div>
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

    @if (parcelarAberto) {
      <app-dialog titulo="Parcelar recebimento" [largura]="560" (fechar)="parcelarAberto = false">
        <div class="row-2">
          <div class="field">
            <label for="parc-qtd">Quantidade de parcelas</label>
            <input
              id="parc-qtd"
              class="input"
              type="number"
              min="1"
              max="60"
              [ngModel]="parc.quantidade"
              (ngModelChange)="mudarQuantidade($event)"
              name="quantidade"
            />
          </div>
          <div class="field">
            <label for="parc-total">Valor a parcelar (R$)</label>
            <input
              id="parc-total"
              class="input"
              type="number"
              min="0"
              [ngModel]="parc.valor_total"
              (ngModelChange)="mudarTotal($event)"
              name="valor_total"
            />
          </div>
        </div>

        <div class="atalhos">
          @for (n of atalhos; track n) {
            <button
              class="chip-x"
              type="button"
              [class.on]="parc.quantidade === n"
              (click)="mudarQuantidade(n)"
            >
              {{ n }}x
            </button>
          }
        </div>

        <div class="field">
          <label>Primeiro vencimento</label>
          <app-datepicker
            ariaLabel="Primeiro vencimento"
            [ngModel]="parc.primeiro_vencimento"
            (ngModelChange)="mudarPrimeiroVencimento($event)"
            name="primeiro_vencimento"
          ></app-datepicker>
        </div>

        @if (parcelas.length) {
          <label class="marcar">
            <input type="checkbox" [(ngModel)]="parc.substituir" name="substituir" />
            <span>Substituir as {{ parcelas.length }} parcelas atuais</span>
          </label>
        }

        @if (linhas.length) {
          <div class="previa">
            <div class="between mb-8 wrap gap-6">
              <span class="mut tiny">
                Ajuste o que quiser: mexer numa parcela não altera as outras.
              </span>
              @if (editada) {
                <button class="btn ghost sm" type="button" (click)="refazerDivisao()">
                  Refazer divisão
                </button>
              }
            </div>

            @for (l of linhas; track $index) {
              <div class="linha-edit" [class.tocada]="l.editada">
                <span class="mut tiny num">{{ $index + 1 }}/{{ linhas.length }}</span>
                <input
                  class="input sm"
                  [(ngModel)]="l.descricao"
                  [name]="'lin-desc-' + $index"
                  [attr.aria-label]="'Descrição da parcela ' + ($index + 1)"
                />
                <app-datepicker
                  [ariaLabel]="'Vencimento da parcela ' + ($index + 1)"
                  [(ngModel)]="l.vencimento"
                  (ngModelChange)="l.editada = true"
                  [name]="'lin-venc-' + $index"
                ></app-datepicker>
                <input
                  class="input sm val"
                  type="number"
                  min="0"
                  [(ngModel)]="l.valor"
                  (ngModelChange)="l.editada = true"
                  [name]="'lin-val-' + $index"
                  [attr.aria-label]="'Valor da parcela ' + ($index + 1)"
                />
              </div>
            }

            <div class="soma tiny" [class.warn]="sobra() !== 0">
              Soma: <b>{{ money(somaLinhas()) }}</b>
              @if (sobra() > 0) {
                — faltam {{ money(sobra()) }} para os {{ money(parc.valor_total) }}
              } @else if (sobra() < 0) {
                — {{ money(-sobra()) }} acima dos {{ money(parc.valor_total) }}
              }
            </div>
          </div>
        } @else {
          <div class="aviso tiny">Informe a quantidade e o valor a parcelar.</div>
        }

        <div foot class="items-center">
          <button class="btn ghost" (click)="parcelarAberto = false">Cancelar</button>
          <button
            class="btn primary"
            (click)="gerarParcelamento()"
            [disabled]="parcelando || !linhas.length"
          >
            {{ parcelando ? 'Gerando...' : 'Gerar ' + linhas.length + 'x' }}
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
      .atalhos {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
      }
      .chip-x {
        border: 1px solid var(--borda);
        background: #fff;
        border-radius: 999px;
        padding: 4px 12px;
        font-size: 13px;
        font-weight: 700;
        color: var(--ink2);
        cursor: pointer;
      }
      .chip-x.on {
        background: var(--soft);
        border-color: var(--ink2);
        color: var(--ink);
      }
      .previa {
        background: var(--soft);
        border-radius: 12px;
        padding: 12px 14px;
        margin-top: 12px;
        max-height: 220px;
        overflow: auto;
      }
      .previa .linha-edit {
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr) 128px 96px;
        gap: 6px;
        align-items: center;
        padding: 3px 0;
      }
      .previa .num {
        text-align: right;
      }
      .previa .val {
        text-align: right;
      }
      .previa .input.sm {
        padding: 5px 8px;
        font-size: 13px;
      }
      .linha-edit.tocada .val {
        border-color: var(--info);
      }
      .soma {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--borda);
      }
      .soma.warn {
        color: var(--warn);
      }
      @media (max-width: 620px) {
        .previa .linha-edit {
          grid-template-columns: 28px minmax(0, 1fr) 88px;
        }
        .previa .linha-edit app-datepicker {
          grid-column: 2 / -1;
        }
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

  /* Parcelamento automatico: a quantidade vira as parcelas */
  parcelarAberto = false;
  parcelando = false;
  atalhos = [2, 3, 4, 6, 10, 12];
  parc: ParcelamentoInput = this.novoParcelamento();
  /** Previa ja materializada: cada linha e editavel sem mexer nas outras. */
  linhas: LinhaParcelamento[] = [];

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

  novoParcelamento(): ParcelamentoInput {
    return {
      quantidade: 2,
      valor_total: 0,
      primeiro_vencimento: this.hojeIso(),
      substituir: false,
    };
  }

  private hojeIso(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  abrirParcelar() {
    this.parc = this.novoParcelamento();
    // Parcela o que falta para fechar o projeto; sem parcelas, o valor cheio
    const falta = this.diferenca();
    this.parc.valor_total = falta > 0 ? falta : Number(this.projeto.valor || 0);
    this.refazerDivisao();
    this.parcelarAberto = true;
  }

  /* Mexer na quantidade, no valor ou na data de partida refaz a divisao
     inteira; depois disso cada linha e ajustada sozinha. */
  mudarQuantidade(valor: number) {
    this.parc.quantidade = valor;
    this.refazerDivisao();
  }
  mudarTotal(valor: number) {
    this.parc.valor_total = valor;
    this.refazerDivisao();
  }
  mudarPrimeiroVencimento(valor: string | null) {
    this.parc.primeiro_vencimento = valor;
    this.refazerDivisao();
  }

  /** Divide de novo do zero: sobra na primeira, uma por mes. */
  refazerDivisao() {
    const qtd = Math.floor(Number(this.parc.quantidade) || 0);
    const total = Number(this.parc.valor_total) || 0;
    if (qtd < 1 || qtd > 60 || total <= 0) {
      this.linhas = [];
      return;
    }
    const partida = this.parc.primeiro_vencimento || this.hojeIso();
    this.linhas = dividirValor(total, qtd).map((valor, i) => ({
      descricao: `Parcela ${i + 1}/${qtd}`,
      valor,
      vencimento: somarMeses(partida, i),
      editada: false,
    }));
  }

  /** Alguma linha foi ajustada na mao? */
  get editada(): boolean {
    return this.linhas.some((l) => l.editada);
  }

  somaLinhas(): number {
    return this.linhas.reduce((s, l) => s + (Number(l.valor) || 0), 0);
  }

  /** Quanto falta (ou passou) do valor a parcelar depois dos ajustes. */
  sobra(): number {
    const dif = Number(this.parc.valor_total || 0) - this.somaLinhas();
    return Math.round(dif * 100) / 100;
  }

  async gerarParcelamento() {
    if (!this.linhas.length) return;
    if (this.parc.substituir) {
      const ok = await this.confirm.ask({
        title: 'Substituir parcelas',
        message: `As ${this.parcelas.length} parcelas atuais serão apagadas, inclusive os recebimentos já marcados. Continuar?`,
        confirmText: 'Substituir',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.parcelando = true;
    this.api
      .parcelar(this.projeto.id, {
        ...this.parc,
        quantidade: this.linhas.length,
        valor_total: this.somaLinhas(),
        primeiro_vencimento: this.parc.primeiro_vencimento || this.hojeIso(),
        // Vale o que esta na tela: o backend nao redivide o que foi ajustado
        parcelas: this.linhas.map((l) => ({
          descricao: (l.descricao || '').trim(),
          valor: Number(l.valor) || 0,
          vencimento: l.vencimento || null,
        })),
      })
      .subscribe({
        next: () => {
          this.parcelando = false;
          this.parcelarAberto = false;
          this.carregar();
        },
        error: () => (this.parcelando = false),
      });
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
