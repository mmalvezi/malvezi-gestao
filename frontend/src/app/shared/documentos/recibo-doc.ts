import { Component, Input } from '@angular/core';
import { BrandMark } from '../brand-mark';
import { Projeto } from '../../core/models';
import { dataBr, moeda, TIPO_LABEL } from '../../core/utils';

@Component({
  selector: 'app-recibo-doc',
  standalone: true,
  imports: [BrandMark],
  template: `
    <div class="doc-sheet">
      <div class="doc-regua"></div>
      <div class="doc-head">
        <app-brand-mark [size]="34" [lockup]="true"></app-brand-mark>
        <div style="text-align:right">
          <div class="doc-titulo">Recibo</div>
          <div class="doc-sub">Pagamento</div>
          <div class="doc-sub">{{ hoje }}</div>
        </div>
      </div>

      <div class="doc-box" style="margin-bottom:20px">
        <div class="mut small">Valor recebido</div>
        <div class="doc-titulo grad-text">{{ money(valorRecebido) }}</div>
      </div>

      <p>
        Recebi de <b>{{ cliente }}</b> a importancia de
        <b>{{ money(valorRecebido) }}</b>, referente ao servico de
        {{ tipoLabel[projeto.tipo] }}{{ projeto.escopo ? ' (' + projeto.escopo + ')' : '' }},
        dando plena e total quitacao do valor ora recebido.
      </p>

      @if (saldo > 0) {
        <div class="doc-box">
          <b>Saldo em aberto:</b> {{ money(saldo) }} sobre o total de
          {{ money(projeto.valor) }}.
        </div>
      } @else {
        <div class="doc-box">
          <b>Situacao:</b> projeto quitado integralmente ({{ money(projeto.valor) }}).
        </div>
      }

      <div class="assinaturas" style="grid-template-columns: minmax(0,1fr)">
        <div class="assinatura">
          Malvezi Sistemas e Automacao<br /><span class="mut">Emitente</span>
        </div>
      </div>

      <div class="doc-foot">
        <span>Malvezi Sistemas e Automacao</span>
        <span>malvezi.com.br</span>
      </div>
    </div>
  `,
})
export class ReciboDoc {
  @Input({ required: true }) projeto!: Projeto;

  money = moeda;
  tipoLabel = TIPO_LABEL;
  hoje = dataBr(new Date().toISOString());

  get cliente(): string {
    return this.projeto.cliente?.nome || 'Cliente';
  }
  get valorRecebido(): number {
    return Number(this.projeto.pago || 0);
  }
  get saldo(): number {
    return Math.max(Number(this.projeto.valor || 0) - Number(this.projeto.pago || 0), 0);
  }
}
