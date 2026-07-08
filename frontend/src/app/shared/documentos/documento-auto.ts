import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DadosDoc, preencherCorpo } from '../../core/preencher';
import { dataBr } from '../../core/utils';
import { imprimirDocumento } from '../../core/imprimir';
import { Timbre } from '../timbre';
import { CORPO_ORCAMENTO, CORPO_RECIBO } from './modelos-auto';

/** Documento automatico (orcamento ou recibo): preenchido, sem edicao, so emitir. */
@Component({
  selector: 'app-documento-auto',
  standalone: true,
  imports: [CommonModule, Timbre],
  template: `
    <div class="doc-overlay">
      <div class="doc-toolbar no-print">
        <button class="btn ghost" (click)="fechar.emit()">Voltar</button>
        <div class="items-center">
          <span class="mut small">{{ titulo }} {{ numero }}</span>
          <button class="btn primary" (click)="imprimir()">Emitir PDF</button>
        </div>
      </div>
      <div class="doc-scroll">
        <app-timbre [titulo]="titulo" [linha1]="linha1" [linha2]="linha2">
          <div [innerHTML]="corpo"></div>
        </app-timbre>
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
        gap: 12px;
        padding: 12px 20px;
        background: #fff;
        border-bottom: 1px solid var(--borda);
        flex-wrap: wrap;
      }
      .doc-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 24px 16px 60px;
      }
    `,
  ],
})
export class DocumentoAuto implements OnInit {
  @Input({ required: true }) tipo!: 'orcamento' | 'recibo';
  @Input({ required: true }) dados!: DadosDoc;
  @Output() fechar = new EventEmitter<void>();

  corpo = '';

  ngOnInit() {
    const modelo = this.tipo === 'orcamento' ? CORPO_ORCAMENTO : CORPO_RECIBO;
    this.corpo = preencherCorpo(modelo, this.dados);
  }

  get titulo() {
    return this.tipo === 'orcamento' ? 'Orçamento' : 'Recibo';
  }
  get numero() {
    return this.dados.numero || '';
  }
  get dataFmt() {
    return dataBr(this.dados.data || new Date().toISOString());
  }
  get linha1() {
    return this.tipo === 'orcamento' ? this.numero : 'Pagamento';
  }
  get linha2() {
    return this.tipo === 'orcamento' ? 'Emitido em ' + this.dataFmt : this.dataFmt;
  }

  imprimir() {
    imprimirDocumento();
  }
}
