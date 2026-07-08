import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ApiService } from '../../core/api.service';
import { Documento, TipoDocumento } from '../../core/models';
import { dataBr } from '../../core/utils';
import { imprimirDocumento } from '../../core/imprimir';
import { Timbre } from '../timbre';
import { EditorCorpo } from '../editor-corpo';

const CABECALHO: Record<TipoDocumento, { titulo: string; sub: string }> = {
  contrato: { titulo: 'Contrato', sub: 'Prestação de serviços' },
  orcamento: { titulo: 'Orçamento', sub: '' },
  recibo: { titulo: 'Recibo', sub: 'Pagamento' },
};

@Component({
  selector: 'app-documento-editor',
  standalone: true,
  imports: [CommonModule, Timbre, EditorCorpo],
  template: `
    <div class="doc-overlay">
      <div class="doc-toolbar no-print">
        <button class="btn ghost" (click)="fechar.emit()">Voltar</button>
        <div class="items-center">
          @if (salvoEm) {
            <span class="badge ok"><span class="dot"></span> Salvo</span>
          }
          <span class="mut small">{{ rotulo }} {{ numero }}</span>
          <button class="btn" (click)="salvar()" [disabled]="salvando">
            {{ salvando ? 'Salvando...' : docId ? 'Salvar' : 'Salvar' }}
          </button>
          <button class="btn primary" (click)="imprimir()">Emitir PDF</button>
        </div>
      </div>

      <div class="doc-scroll">
        <app-timbre [titulo]="cab.titulo" [linha1]="linha1" [linha2]="linha2">
          <app-editor-corpo [valor]="corpo" (valorChange)="corpo = $event"></app-editor-corpo>
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
export class DocumentoEditor implements OnInit {
  private api = inject(ApiService);

  @Input({ required: true }) tipo!: TipoDocumento;
  @Input() numero = '';
  @Input() data?: string; // iso
  @Input() corpo = '';
  @Input() docId: number | null = null;
  @Input() projetoId?: number | null;
  @Input() orcamentoId?: number | null;
  @Input() tituloDoc = '';

  @Output() fechar = new EventEmitter<void>();
  @Output() salvo = new EventEmitter<Documento>();

  salvando = false;
  salvoEm = false;

  get cab() {
    return CABECALHO[this.tipo];
  }
  get rotulo() {
    return this.cab.titulo;
  }
  get dataFmt() {
    return dataBr(this.data || new Date().toISOString());
  }
  get linha1() {
    return this.tipo === 'orcamento' ? this.numero : this.cab.sub;
  }
  get linha2() {
    return this.tipo === 'orcamento'
      ? 'Emitido em ' + this.dataFmt
      : this.dataFmt;
  }

  ngOnInit() {
    if (!this.data) this.data = new Date().toISOString();
  }

  salvar() {
    this.salvando = true;
    if (this.docId) {
      this.api
        .atualizarDocumento(this.docId, {
          titulo: this.tituloDoc,
          conteudo: this.corpo,
        })
        .subscribe({
          next: (d) => this.aposSalvar(d),
          error: () => (this.salvando = false),
        });
    } else {
      this.api
        .criarDocumento({
          tipo: this.tipo,
          numero: this.numero || undefined,
          projeto_id: this.projetoId ?? null,
          orcamento_id: this.orcamentoId ?? null,
          titulo: this.tituloDoc,
          conteudo: this.corpo,
        })
        .subscribe({
          next: (d) => this.aposSalvar(d),
          error: () => (this.salvando = false),
        });
    }
  }

  private aposSalvar(d: Documento) {
    this.salvando = false;
    this.salvoEm = true;
    this.docId = d.id;
    this.numero = d.numero;
    this.salvo.emit(d);
  }

  imprimir() {
    imprimirDocumento();
  }
}
