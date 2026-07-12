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
import { Projeto, Recorrencia, RecorrenciaInput } from '../core/models';
import {
  DIAS_VENCIMENTO,
  STATUS_REC_CLASSE,
  STATUS_REC_LABEL,
  moeda,
} from '../core/utils';
import { AppSelect } from './ui/app-select';
import { ConfirmService } from './ui/confirm.service';

/**
 * Mensalidade do projeto. Nasce prevista e so passa a valer (ativa, entrando
 * no MRR) quando o projeto e entregue.
 */
@Component({
  selector: 'app-mensalidade-projeto',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSelect],
  template: `
    <div class="between mb-16">
      <span class="section-title" style="margin:0">Mensalidade</span>
      @if (rec) {
        <span class="badge" [class]="'badge ' + classe[rec.status]">
          <span class="dot"></span>
          {{ statusLabel[rec.status] }}
        </span>
      }
    </div>

    <label class="interruptor">
      <input
        type="checkbox"
        [checked]="!!rec"
        (change)="alternarMensalidade($any($event.target).checked)"
      />
      <span>Este projeto terá mensalidade (suporte, hospedagem, evoluções)</span>
    </label>

    @if (rec) {
      @if (rec.status === 'previsto') {
        <div class="aviso tiny">
          Começa a valer quando o projeto for entregue. Enquanto isso, não entra
          no MRR.
        </div>
      }

      <div class="field mt-16">
        <label for="mens-plano">O que inclui (plano)</label>
        <input
          id="mens-plano"
          class="input"
          [(ngModel)]="form.plano"
          name="plano"
          placeholder="Ex.: Hospedagem, suporte e pequenas evoluções"
          (blur)="salvar()"
        />
      </div>

      <div class="row-3">
        <div class="field">
          <label for="mens-valor">Valor por mês (R$)</label>
          <input
            id="mens-valor"
            class="input"
            type="number"
            min="0"
            [(ngModel)]="form.valor"
            name="valor"
            (blur)="salvar()"
          />
        </div>
        <div class="field">
          <label>Dia do vencimento</label>
          <app-select
            [opcoes]="dias"
            ariaLabel="Dia do vencimento"
            [(ngModel)]="form.dia_vencimento"
            name="dia_vencimento"
            (ngModelChange)="salvar()"
          ></app-select>
        </div>
        <div class="field">
          <label for="mens-contato">Contato da cobrança</label>
          <input
            id="mens-contato"
            class="input"
            [(ngModel)]="form.contato"
            name="contato"
            placeholder="WhatsApp ou e-mail"
            (blur)="salvar()"
          />
        </div>
      </div>

      <div class="between wrap">
        <span class="mut tiny">
          @if (salvando) {
            Salvando...
          } @else {
            {{ money(form.valor) }} por mês, todo dia {{ form.dia_vencimento }}
          }
        </span>
        <span class="items-center">
          @if (rec.status === 'ativo') {
            <button class="btn sm" (click)="trocarStatus('pausado')">Pausar</button>
          } @else if (rec.status === 'pausado') {
            <button class="btn sm" (click)="trocarStatus('ativo')">Reativar</button>
          } @else {
            <button class="btn sm" (click)="trocarStatus('ativo')">
              Ativar agora
            </button>
          }
        </span>
      </div>
    }
  `,
  styles: [
    `
      .interruptor {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 600;
        color: var(--ink2);
        background: var(--soft);
        border-radius: 12px;
        padding: 12px 14px;
        cursor: pointer;
      }
      .aviso {
        margin-top: 12px;
        background: var(--info-bg);
        color: var(--info);
        border-radius: 10px;
        padding: 9px 12px;
        font-weight: 600;
      }
    `,
  ],
})
export class MensalidadeProjeto implements OnInit {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);

  @Input({ required: true }) projeto!: Projeto;
  @Output() mudou = new EventEmitter<Recorrencia | null>();

  rec: Recorrencia | null = null;
  salvando = false;

  dias = DIAS_VENCIMENTO;
  statusLabel = STATUS_REC_LABEL;
  classe = STATUS_REC_CLASSE;
  money = moeda;

  form: RecorrenciaInput = this.novoForm();

  ngOnInit() {
    this.api.getRecorrenciasDoProjeto(this.projeto.id).subscribe((lista) => {
      this.rec = lista[0] || null;
      if (this.rec) this.form = this.doRegistro(this.rec);
    });
  }

  private novoForm(): RecorrenciaInput {
    return {
      cliente_id: this.projeto?.cliente_id || 0,
      projeto_id: this.projeto?.id || null,
      plano: 'Hospedagem, suporte e pequenas evoluções',
      valor: 0,
      // Prevista: so vira ativa quando o projeto for entregue
      status: this.projeto?.stage === 'entregue' ? 'ativo' : 'previsto',
      dia_vencimento: 10,
      inicio: null,
      contato: this.projeto?.cliente?.contato || null,
    };
  }

  private doRegistro(r: Recorrencia): RecorrenciaInput {
    return {
      cliente_id: r.cliente_id,
      projeto_id: r.projeto_id ?? this.projeto.id,
      plano: r.plano,
      valor: r.valor,
      status: r.status,
      dia_vencimento: r.dia_vencimento,
      inicio: r.inicio || null,
      contato: r.contato || null,
    };
  }

  alternarMensalidade(ligado: boolean) {
    if (ligado && !this.rec) {
      this.form = this.novoForm();
      this.salvando = true;
      this.api.criarRecorrencia(this.form).subscribe({
        next: (r) => {
          this.salvando = false;
          this.rec = r;
          this.form = this.doRegistro(r);
          this.mudou.emit(r);
        },
        error: () => (this.salvando = false),
      });
    } else if (!ligado && this.rec) {
      this.remover();
    }
  }

  private async remover() {
    const atual = this.rec;
    if (!atual) return;
    const ok = await this.confirm.ask({
      title: 'Remover mensalidade',
      message: 'Remover a mensalidade deste projeto? As cobranças geradas também saem.',
      confirmText: 'Remover',
      tone: 'danger',
    });
    if (!ok) {
      // Desfaz o interruptor visualmente
      this.rec = { ...atual };
      return;
    }
    this.api.excluirRecorrencia(atual.id).subscribe(() => {
      this.rec = null;
      this.mudou.emit(null);
    });
  }

  salvar() {
    if (!this.rec) return;
    this.salvando = true;
    const payload: RecorrenciaInput = {
      ...this.form,
      valor: Number(this.form.valor) || 0,
      dia_vencimento: Number(this.form.dia_vencimento) || 10,
    };
    this.api.atualizarRecorrencia(this.rec.id, payload).subscribe({
      next: (r) => {
        this.salvando = false;
        this.rec = r;
        this.form = this.doRegistro(r);
        this.mudou.emit(r);
      },
      error: () => (this.salvando = false),
    });
  }

  trocarStatus(status: 'ativo' | 'pausado') {
    if (!this.rec) return;
    this.api.patchStatusRecorrencia(this.rec.id, status).subscribe((r) => {
      this.rec = r;
      this.form = this.doRegistro(r);
      this.mudou.emit(r);
    });
  }
}
