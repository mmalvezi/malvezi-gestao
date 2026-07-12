/* Layouts fixos (nao editaveis) do orcamento e do recibo automaticos.
   Sao preenchidos com preencherCorpo e renderizados dentro do timbre. */

export const CORPO_ORCAMENTO = `
<div class="row-2">
  <div class="doc-box">
    <h4 style="margin-top:0">Cliente</h4>
    <b>{{cliente}}</b>
    <div class="doc-sub">{{empresa}}</div>
    <div class="doc-sub">{{contato}}</div>
  </div>
  <div class="doc-box">
    <h4 style="margin-top:0">Projeto</h4>
    <b>{{titulo}}</b>
    <div class="doc-sub">{{tipo}}</div>
    <div class="doc-sub">Validade: {{validade}} dias</div>
  </div>
</div>

<h4>Entregas do escopo</h4>
{{itens}}

<div class="totais">
  <div class="linha"><span class="mut">Subtotal</span><span>{{subtotal}}</span></div>
  <div class="linha"><span class="mut">Desconto</span><span>- {{desconto}}</span></div>
  <div class="linha total"><span>Total</span><span>{{total}}</span></div>
</div>

<h4>Forma de pagamento</h4>
{{parcelas}}

<h4>Condições</h4>
<div class="doc-box">
  <div><b>Prazo de entrega:</b> {{prazo}}</div>
  <div><b>Validade do orçamento:</b> {{validade}} dias</div>
  <div style="margin-top:6px"><b>Observações:</b> {{obs}}</div>
</div>
`.trim();

export const CORPO_RECIBO = `
<div class="doc-box" style="margin-bottom:20px">
  <div class="mut small">Valor recebido</div>
  <div class="doc-titulo grad-text">{{valor}}</div>
</div>

<p>Recebi de <b>{{cliente}}</b> a importância de <b>{{valor}}</b>, referente ao
{{referente}}, dando plena e total quitação do valor ora recebido.</p>

<div class="assinaturas" style="grid-template-columns: minmax(0,1fr)">
  <div class="assinatura">Malvezi Sistemas e Automação<br><span class="mut">Emitente</span></div>
</div>
`.trim();
