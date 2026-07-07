import { Component, Input } from '@angular/core';
import { BrandMark } from '../brand-mark';
import { Orcamento } from '../../core/models';
import { dataBr, moeda, TIPO_LABEL } from '../../core/utils';

@Component({
  selector: 'app-orcamento-doc',
  standalone: true,
  imports: [BrandMark],
  template: `
    <div class="doc-sheet">
      <div class="doc-regua"></div>
      <div class="doc-head">
        <app-brand-mark [size]="34" [lockup]="true"></app-brand-mark>
        <div style="text-align:right">
          <div class="doc-titulo">Orcamento</div>
          <div class="doc-sub">{{ orc.numero }}</div>
          <div class="doc-sub">Emitido em {{ hoje }}</div>
        </div>
      </div>

      <div class="row-2">
        <div class="doc-box">
          <h4 style="margin-top:0">Cliente</h4>
          <div class="bold">{{ orc.cliente?.nome || 'Cliente' }}</div>
          @if (orc.cliente?.empresa) {
            <div class="doc-sub">{{ orc.cliente?.empresa }}</div>
          }
          @if (orc.cliente?.contato) {
            <div class="doc-sub">{{ orc.cliente?.contato }}</div>
          }
        </div>
        <div class="doc-box">
          <h4 style="margin-top:0">Projeto</h4>
          <div class="bold">{{ orc.titulo }}</div>
          <div class="doc-sub">{{ tipoLabel[orc.tipo] }}</div>
          <div class="doc-sub">Validade: {{ orc.validade_dias }} dias</div>
        </div>
      </div>

      <h4>Entregas do escopo</h4>
      <table>
        <thead>
          <tr>
            <th style="width:34px">#</th>
            <th>Item</th>
            <th style="width:130px;text-align:right">Valor</th>
          </tr>
        </thead>
        <tbody>
          @for (item of orc.itens; track $index) {
            <tr>
              <td><span class="num">{{ $index + 1 }}</span></td>
              <td>
                <div class="bold">{{ item.titulo }}</div>
                @if (item.descricao) {
                  <div class="doc-sub">{{ item.descricao }}</div>
                }
              </td>
              <td style="text-align:right">{{ money(item.valor) }}</td>
            </tr>
          }
        </tbody>
      </table>

      <div class="totais">
        <div class="linha">
          <span class="mut">Subtotal</span>
          <span>{{ money(subtotal) }}</span>
        </div>
        <div class="linha">
          <span class="mut">Desconto</span>
          <span>- {{ money(orc.desconto) }}</span>
        </div>
        <div class="linha total">
          <span>Total</span>
          <span>{{ money(orc.total) }}</span>
        </div>
      </div>

      <h4>Condicoes</h4>
      <div class="doc-box">
        <div><b>Pagamento:</b> {{ orc.pagamento || 'A combinar' }}</div>
        <div><b>Prazo de entrega:</b> {{ orc.prazo || 'A combinar' }}</div>
        @if (orc.obs) {
          <div style="margin-top:6px"><b>Observacoes:</b> {{ orc.obs }}</div>
        }
      </div>

      <div class="doc-foot">
        <span>Malvezi Sistemas e Automacao</span>
        <span>malvezi.com.br</span>
      </div>
    </div>
  `,
})
export class OrcamentoDoc {
  @Input({ required: true }) orc!: Orcamento;

  money = moeda;
  tipoLabel = TIPO_LABEL;
  hoje = dataBr(new Date().toISOString());

  get subtotal(): number {
    return (this.orc.itens || []).reduce((s, i) => s + Number(i.valor || 0), 0);
  }
}
