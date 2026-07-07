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
          <div class="doc-sub">Prestação de serviços</div>
          <div class="doc-sub">{{ hoje }}</div>
        </div>
      </div>

      <p>
        Pelo presente instrumento, de um lado
        <b>Malvezi Sistemas e Automação</b> (Contratada) e, de outro lado,
        <b>{{ cliente }}</b>{{ empresa ? ' (' + empresa + ')' : '' }}
        (Contratante), ajustam a prestação de serviços descrita abaixo.
      </p>

      <div class="clausula">
        <b>Cláusula 1. Objeto.</b> A Contratada prestará serviço de
        {{ tipoLabel[projeto.tipo] }} conforme o escopo:
        {{ projeto.escopo || 'a ser detalhado entre as partes' }}.
      </div>
      <div class="clausula">
        <b>Cláusula 2. Valor e pagamento.</b> O valor total do serviço é de
        {{ money(projeto.valor) }}.
        @if (projeto.pago > 0) {
          Já foi pago o montante de {{ money(projeto.pago) }}, restando
          {{ money(saldo) }}.
        } @else {
          O pagamento seguirá as condições combinadas entre as partes.
        }
      </div>
      <div class="clausula">
        <b>Cláusula 3. Prazo.</b>
        @if (projeto.entrega) {
          A entrega está prevista para {{ dataEntrega }}.
        } @else {
          O prazo de entrega será definido no início do projeto.
        }
      </div>
      <div class="clausula">
        <b>Cláusula 4. Responsabilidades.</b> A Contratada compromete-se a
        executar o serviço com qualidade técnica. A Contratante compromete-se a
        fornecer as informações e os acessos necessários no tempo adequado.
      </div>
      <div class="clausula">
        <b>Cláusula 5. Suporte e garantia.</b> Após a entrega, a Contratada
        oferece 30 dias de garantia para correção de falhas relacionadas ao
        escopo entregue.
      </div>
      <div class="clausula">
        <b>Cláusula 6. Vigência.</b> Este contrato vigora a partir da assinatura
        até a conclusão do objeto e o cumprimento das obrigações de ambas as
        partes. Fica eleito o foro da comarca de Jundiaí para tratar de qualquer
        questão, estando a Contratada sediada em Cabreúva.
      </div>

      <div class="assinaturas">
        <div class="assinatura">Malvezi Sistemas e Automação<br /><span class="mut">Contratada</span></div>
        <div class="assinatura">{{ cliente }}<br /><span class="mut">Contratante</span></div>
      </div>

      <div class="doc-foot">
        <span>Malvezi Sistemas e Automação</span>
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
