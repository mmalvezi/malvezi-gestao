import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { ApiService } from '../../core/api.service';
import { Cliente, Orcamento } from '../../core/models';
import { dataBr } from '../../core/utils';
import { preencherCorpo } from '../../core/preencher';
import { dadosDeOrcamento } from '../../core/dados-doc';
import { imprimirDocumento } from '../../core/imprimir';
import { Dialog } from '../dialog';
import { Timbre } from '../timbre';
import { CORPO_ORCAMENTO } from './modelos-auto';
import { PropostaAnexo } from './proposta-anexo';

/**
 * Documento do orcamento.
 *
 * Se houver proposta em PDF anexada, ela e o documento que abre por padrao,
 * com um botao para ver o orcamento automatico (gerado dos dados). Sem anexo,
 * abre direto o automatico, como sempre. O botao Alterar (formulario de itens)
 * existe nos dois casos: os dados seguem alimentando totais e KPIs.
 */
@Component({
  selector: 'app-orcamento-viewer',
  standalone: true,
  imports: [CommonModule, Dialog, Timbre, PropostaAnexo],
  template: `
    <div class="doc-overlay">
      <div class="doc-toolbar no-print">
        <button class="btn ghost" (click)="fechar.emit()">Voltar</button>
        <div class="items-center wrap">
          <span class="mut small">Orçamento {{ orc.numero }}</span>

          @if (orc.tem_anexo) {
            @if (modo === 'anexo') {
              <button class="btn" (click)="verAutomatico()">Ver orçamento automático</button>
            } @else {
              <button class="btn" (click)="verProposta()">Ver proposta anexada</button>
            }
          }

          @if (podeAnexar) {
            <button class="btn" (click)="propostaAberta = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.49" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              Proposta (PDF)
            </button>
          }

          @if (podeAnexar) {
            <button class="btn" (click)="alterar()">Alterar</button>
          }

          @if (modo === 'anexo') {
            <button class="btn primary" (click)="abrirEmNovaAba()">Abrir em nova aba</button>
          } @else {
            <button class="btn primary" (click)="imprimir()">Emitir PDF</button>
          }
        </div>
      </div>

      <div class="doc-scroll">
        @if (modo === 'anexo') {
          @if (carregandoPdf) {
            <div class="loading"><span class="spin"></span> Abrindo a proposta...</div>
          } @else if (erroPdf) {
            <div class="card card-pad empty">
              {{ erroPdf }}
              <div class="mt-16">
                <button class="btn" (click)="verAutomatico()">Ver orçamento automático</button>
              </div>
            </div>
          } @else if (pdfUrl) {
            <iframe
              class="pdf"
              [src]="pdfUrl"
              title="Proposta em PDF do orçamento {{ orc.numero }}"
            ></iframe>
          }
        } @else {
          <app-timbre titulo="Orçamento" [linha1]="orc.numero" [linha2]="linha2">
            <div [innerHTML]="corpo"></div>
          </app-timbre>
        }
      </div>
    </div>

    @if (propostaAberta) {
      <app-dialog
        titulo="Proposta do orçamento"
        [largura]="560"
        [zIndex]="90"
        (fechar)="propostaAberta = false"
      >
        <app-proposta-anexo [orc]="orc" (mudou)="aoMudarAnexo($event)"></app-proposta-anexo>
        <div foot class="items-center">
          <button class="btn ghost" (click)="propostaAberta = false">Fechar</button>
        </div>
      </app-dialog>
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
      .pdf {
        display: block;
        width: 100%;
        max-width: 900px;
        height: 100%;
        min-height: 70vh;
        margin: 0 auto;
        border: 1px solid var(--borda);
        border-radius: 12px;
        background: #fff;
        box-shadow: var(--shadow);
      }
    `,
  ],
})
export class OrcamentoViewer implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  @Input({ required: true }) orc!: Orcamento;
  @Input() clientes: Cliente[] = [];
  @Output() fechar = new EventEmitter<void>();
  @Output() atualizado = new EventEmitter<Orcamento>();

  /** 'anexo' mostra a proposta em PDF; 'auto' mostra o documento gerado. */
  modo: 'anexo' | 'auto' = 'auto';
  corpo = '';
  propostaAberta = false;

  pdfUrl: SafeResourceUrl | null = null;
  private blobUrl: string | null = null;
  carregandoPdf = false;
  erroPdf = '';

  /** Orcamento sintetico (id 0, vindo de um projeto sem orcamento) nao anexa. */
  get podeAnexar(): boolean {
    return this.orc.id > 0;
  }

  ngOnInit() {
    this.render();
    if (this.orc.tem_anexo && this.podeAnexar) this.verProposta();
  }

  ngOnDestroy() {
    this.liberarPdf();
  }

  render() {
    this.corpo = preencherCorpo(CORPO_ORCAMENTO, dadosDeOrcamento(this.orc));
  }

  get linha2() {
    return 'Emitido em ' + dataBr(new Date().toISOString());
  }

  /* ---- Proposta anexada ---- */
  verProposta() {
    this.modo = 'anexo';
    if (this.pdfUrl || this.carregandoPdf) return;
    this.carregandoPdf = true;
    this.erroPdf = '';
    this.api.baixarAnexoOrcamento(this.orc.id).subscribe({
      next: (blob) => {
        this.carregandoPdf = false;
        this.blobUrl = URL.createObjectURL(
          new Blob([blob], { type: 'application/pdf' }),
        );
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl);
      },
      error: () => {
        this.carregandoPdf = false;
        this.erroPdf = 'Nao foi possivel abrir a proposta anexada.';
      },
    });
  }

  verAutomatico() {
    this.modo = 'auto';
  }

  abrirEmNovaAba() {
    if (this.blobUrl) window.open(this.blobUrl, '_blank');
  }

  private liberarPdf() {
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    this.blobUrl = null;
    this.pdfUrl = null;
  }

  aoMudarAnexo(o: Orcamento) {
    this.orc = o;
    this.liberarPdf();
    this.erroPdf = '';
    if (o.tem_anexo) {
      this.propostaAberta = false;
      this.verProposta();
    } else {
      this.modo = 'auto';
    }
    this.atualizado.emit(o);
  }

  /** Abre a tela dedicada de edicao do orcamento. */
  alterar() {
    this.fechar.emit();
    this.router.navigate(['/orcamentos', this.orc.id]);
  }

  imprimir() {
    imprimirDocumento();
  }
}
