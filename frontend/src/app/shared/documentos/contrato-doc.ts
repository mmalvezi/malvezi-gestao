import { Component, Input } from '@angular/core';
import { BrandMark } from '../brand-mark';
import { Projeto } from '../../core/models';
import { dataBr, moeda, TIPO_LABEL } from '../../core/utils';

@Component({
  selector: 'app-contrato-doc',
  standalone: true,
  imports: [BrandMark],
  template: `
    <div class="doc-sheet">
      <div class="doc-regua"></div>
      <div class="doc-head">
        <app-brand-mark [size]="34" [lockup]="true"></app-brand-mark>
        <div style="text-align:right">
          <div class="doc-titulo">Contrato</div>
          <div class="doc-sub">Prestacao de servico</div>
          <div class="doc-sub">{{ hoje }}</div>
        </div>
      </div>

      <p>
        Pelo presente instrumento, de um lado
        <b>Malvezi Sistemas e Automacao</b> (Contratada) e, de outro lado,
        <b>{{ cliente }}</b>{{ empresa ? ' (' + empresa + ')' : '' }}
        (Contratante), ajustam a prestacao de servico descrita abaixo.
      </p>

      <div class="clausula">
        <b>Clausula 1 - Objeto.</b> A Contratada prestara servico de
        {{ tipoLabel[projeto.tipo] }} conforme escopo:
        {{ projeto.escopo || 'a ser detalhado entre as partes' }}.
      </div>
      <div class="clausula">
        <b>Clausula 2 - Valor e pagamento.</b> O valor total do servico e de
        {{ money(projeto.valor) }}.
        @if (projeto.pago > 0) {
          Ja foi pago o montante de {{ money(projeto.pago) }}, restando
          {{ money(saldo) }}.
        } @else {
          O pagamento seguira as condicoes combinadas entre as partes.
        }
      </div>
      <div class="clausula">
        <b>Clausula 3 - Prazo.</b>
        @if (projeto.entrega) {
          A entrega esta prevista para {{ dataEntrega }}.
        } @else {
          O prazo de entrega sera definido no inicio do projeto.
        }
      </div>
      <div class="clausula">
        <b>Clausula 4 - Responsabilidades.</b> A Contratada compromete-se a
        executar o servico com qualidade tecnica. A Contratante compromete-se a
        fornecer as informacoes e os acessos necessarios no tempo adequado.
      </div>
      <div class="clausula">
        <b>Clausula 5 - Suporte e garantia.</b> Apos a entrega, a Contratada
        oferece 30 dias de garantia para correcao de falhas relacionadas ao
        escopo entregue.
      </div>
      <div class="clausula">
        <b>Clausula 6 - Vigencia.</b> Este contrato vigora a partir da assinatura
        ate a conclusao do objeto e o cumprimento das obrigacoes de ambas as
        partes.
      </div>

      <div class="assinaturas">
        <div class="assinatura">Malvezi Sistemas e Automacao<br /><span class="mut">Contratada</span></div>
        <div class="assinatura">{{ cliente }}<br /><span class="mut">Contratante</span></div>
      </div>

      <div class="doc-foot">
        <span>Malvezi Sistemas e Automacao</span>
        <span>malvezi.com.br</span>
      </div>
    </div>
  `,
})
export class ContratoDoc {
  @Input({ required: true }) projeto!: Projeto;

  money = moeda;
  tipoLabel = TIPO_LABEL;
  hoje = dataBr(new Date().toISOString());

  get cliente(): string {
    return this.projeto.cliente?.nome || 'Cliente';
  }
  get empresa(): string {
    return this.projeto.cliente?.empresa || '';
  }
  get saldo(): number {
    return Math.max(Number(this.projeto.valor || 0) - Number(this.projeto.pago || 0), 0);
  }
  get dataEntrega(): string {
    return dataBr(this.projeto.entrega);
  }
}
