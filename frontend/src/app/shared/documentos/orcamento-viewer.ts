import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Cliente, Orcamento } from '../../core/models';
import { dataBr } from '../../core/utils';
import { preencherCorpo } from '../../core/preencher';
import { dadosDeOrcamento } from '../../core/dados-doc';
import { imprimirDocumento } from '../../core/imprimir';
import { Timbre } from '../timbre';
import { OrcamentoForm } from '../orcamento-form';
import { CORPO_ORCAMENTO } from './modelos-auto';

/**
 * Documento de orcamento (retrato automatico dos dados) com botao Alterar,
 * que abre o formulario de itens. Ao salvar, o documento reabre com os dados
 * novos e o total recalculado.
 */
@Component({
  selector: 'app-orcamento-viewer',
  standalone: true,
  imports: [CommonModule, Timbre, OrcamentoForm],
  template: `
    <div class="doc-overlay">
      <div class="doc-toolbar no-print">
        <button class="btn ghost" (click)="fechar.emit()">Voltar</button>
        <div class="items-center">
          <span class="mut small">Orçamento {{ orc.numero }}</span>
          <button class="btn" (click)="formAberto = true">Alterar</button>
          <button class="btn primary" (click)="imprimir()">Emitir PDF</button>
        </div>
      </div>
      <div class="doc-scroll">
        <app-timbre titulo="Orçamento" [linha1]="orc.numero" [linha2]="linha2">
          <div [innerHTML]="corpo"></div>
        </app-timbre>
      </div>
    </div>

    @if (formAberto) {
      <app-orcamento-form
        [inicial]="orc"
        [clientes]="clientes"
        [zIndex]="90"
        (salvo)="aoSalvar($event)"
        (fechar)="formAberto = false"
      ></app-orcamento-form>
    }
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
export class OrcamentoViewer implements OnInit {
  @Input({ required: true }) orc!: Orcamento;
  @Input() clientes: Cliente[] = [];
  @Output() fechar = new EventEmitter<void>();
  @Output() atualizado = new EventEmitter<Orcamento>();

  corpo = '';
  formAberto = false;

  ngOnInit() {
    this.render();
  }

  render() {
    this.corpo = preencherCorpo(CORPO_ORCAMENTO, dadosDeOrcamento(this.orc));
  }

  get linha2() {
    return 'Emitido em ' + dataBr(new Date().toISOString());
  }

  aoSalvar(o: Orcamento) {
    this.orc = o;
    this.render();
    this.formAberto = false;
    this.atualizado.emit(o);
  }

  imprimir() {
    imprimirDocumento();
  }
}
