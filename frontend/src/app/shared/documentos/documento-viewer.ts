import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Orcamento, Projeto } from '../../core/models';
import { OrcamentoDoc } from './orcamento-doc';
import { ContratoDoc } from './contrato-doc';
import { ReciboDoc } from './recibo-doc';

export type TipoDocumento = 'orcamento' | 'contrato' | 'recibo';

@Component({
  selector: 'app-documento-viewer',
  standalone: true,
  imports: [OrcamentoDoc, ContratoDoc, ReciboDoc],
  template: `
    <div class="doc-overlay">
      <div class="doc-toolbar no-print">
        <button class="btn ghost" (click)="fechar.emit()">Voltar</button>
        <div class="items-center">
          <span class="mut small">{{ rotulo }}</span>
          <button class="btn primary" (click)="imprimir()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            Imprimir / PDF
          </button>
        </div>
      </div>

      <div class="doc-scroll">
        @if (tipo === 'orcamento' && orcamento) {
          <app-orcamento-doc [orc]="orcamento"></app-orcamento-doc>
        } @else if (tipo === 'contrato' && projeto) {
          <app-contrato-doc [projeto]="projeto"></app-contrato-doc>
        } @else if (tipo === 'recibo' && projeto) {
          <app-recibo-doc [projeto]="projeto"></app-recibo-doc>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .doc-overlay {
        position: fixed;
        inset: 0;
        background: var(--bg);
        z-index: 80;
        display: flex;
        flex-direction: column;
      }
      .doc-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        background: #fff;
        border-bottom: 1px solid var(--borda);
      }
      .doc-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 24px 16px 60px;
      }
    `,
  ],
})
export class DocumentoViewer {
  @Input({ required: true }) tipo!: TipoDocumento;
  @Input() orcamento?: Orcamento;
  @Input() projeto?: Projeto;
  @Output() fechar = new EventEmitter<void>();

  get rotulo(): string {
    return this.tipo === 'orcamento'
      ? 'Orçamento'
      : this.tipo === 'contrato'
        ? 'Contrato de prestação de serviços'
        : 'Recibo de pagamento';
  }

  imprimir() {
    window.print();
  }
}
