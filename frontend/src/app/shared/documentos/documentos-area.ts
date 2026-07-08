import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { Cliente, Documento, Orcamento, Projeto, TipoDocumento } from '../../core/models';
import { dataBr } from '../../core/utils';
import { DadosDoc, preencherCorpo } from '../../core/preencher';
import { dadosDeProjeto, orcamentoDeProjeto } from '../../core/dados-doc';
import { Dialog } from '../dialog';
import { DocumentoEditor } from './documento-editor';
import { DocumentoAuto } from './documento-auto';
import { OrcamentoViewer } from './orcamento-viewer';
import { ConfirmService } from '../ui/confirm.service';

const TIPO_DOC_LABEL: Record<TipoDocumento, string> = {
  contrato: 'Contrato',
  orcamento: 'Orçamento',
  recibo: 'Recibo',
};

interface CfgEditor {
  numero: string;
  corpo: string;
  docId: number | null;
  data?: string;
  tituloDoc: string;
}

function pad(id: number): string {
  return String(id).padStart(4, '0');
}

@Component({
  selector: 'app-documentos-area',
  standalone: true,
  imports: [CommonModule, Dialog, DocumentoEditor, DocumentoAuto, OrcamentoViewer],
  template: `
    <div class="mut tiny mb-8">Documentos</div>
    <div class="chips">
      @for (t of tipos; track t) {
        <button class="btn sm" (click)="clicarTipo(t)" [disabled]="ocupado">
          {{ docLabel[t] }}
        </button>
      }
    </div>

    @if (contratosSalvos().length) {
      <div class="salvos">
        <div class="mut tiny mb-8 mt-16">Contratos salvos</div>
        @for (d of contratosSalvos(); track d.id) {
          <div class="salvo">
            <div class="min0">
              <div class="bold small trunc">{{ docLabel[d.tipo] }} {{ d.numero }}</div>
              <div class="mut tiny">{{ fmtData(d.criado) }}</div>
            </div>
            <div class="items-center">
              <button class="btn sm ghost" (click)="abrirSalvo(d)">Abrir</button>
              <button class="icon-btn sm" (click)="excluir(d)" aria-label="Excluir documento">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        }
      </div>
    }

    <!-- Contrato: escolha abrir salvo ou gerar novo -->
    @if (escolha) {
      <app-dialog
        titulo="Ja existe contrato salvo"
        [largura]="440"
        (fechar)="escolha = false"
      >
        <p class="mut small">
          Deseja abrir o contrato salvo mais recente ou gerar um novo a partir do
          modelo?
        </p>
        <div foot class="items-center" style="width:100%;justify-content:flex-end">
          <button class="btn ghost" (click)="gerarContrato(); escolha = false">
            Gerar novo
          </button>
          <button class="btn primary" (click)="abrirUltimoContrato(); escolha = false">
            Abrir salvo
          </button>
        </div>
      </app-dialog>
    }

    <!-- Contrato: editor do documento final -->
    @if (cfg) {
      <app-documento-editor
        tipo="contrato"
        [numero]="cfg.numero"
        [corpo]="cfg.corpo"
        [docId]="cfg.docId"
        [data]="cfg.data"
        [projetoId]="projeto.id"
        [tituloDoc]="cfg.tituloDoc"
        (salvo)="aoSalvar($event)"
        (fechar)="cfg = null"
      ></app-documento-editor>
    }

    <!-- Orcamento: documento automatico com botao Alterar -->
    @if (orcViewer) {
      <app-orcamento-viewer
        [orc]="orcViewer"
        [clientes]="clientes"
        (fechar)="orcViewer = null"
      ></app-orcamento-viewer>
    }

    <!-- Recibo: automatico, so emitir -->
    @if (auto) {
      <app-documento-auto
        [tipo]="auto.tipo"
        [dados]="auto.dados"
        (fechar)="auto = null"
      ></app-documento-auto>
    }
  `,
  styles: [
    `
      .salvo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid var(--borda);
      }
      .salvo:last-child {
        border-bottom: none;
      }
      .min0 {
        min-width: 0;
      }
      .trunc {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
})
export class DocumentosArea implements OnInit {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);

  @Input({ required: true }) tipos: TipoDocumento[] = [];
  @Input({ required: true }) projeto!: Projeto;
  @Input() clientes: Cliente[] = [];

  documentos: Documento[] = [];
  escolha = false;
  cfg: CfgEditor | null = null;
  auto: { tipo: 'recibo'; dados: DadosDoc } | null = null;
  orcViewer: Orcamento | null = null;
  ocupado = false;

  docLabel = TIPO_DOC_LABEL;

  ngOnInit() {
    this.carregar();
  }

  fmtData(iso: string) {
    return dataBr(iso);
  }

  carregar() {
    this.api
      .getDocumentos({ projeto_id: this.projeto.id })
      .subscribe((d) => (this.documentos = d));
  }

  contratosSalvos(): Documento[] {
    return this.documentos.filter((d) => d.tipo === 'contrato');
  }

  clicarTipo(tipo: TipoDocumento) {
    if (tipo === 'contrato') {
      if (this.contratosSalvos().length) this.escolha = true;
      else this.gerarContrato();
    } else if (tipo === 'orcamento') {
      this.orcViewer = orcamentoDeProjeto(this.projeto);
    } else {
      const numero = 'RC-' + pad(this.projeto.id);
      this.auto = {
        tipo: 'recibo',
        dados: dadosDeProjeto(this.projeto, 'recibo', numero),
      };
    }
  }

  /* ---- Contrato (dois niveis) ---- */
  gerarContrato() {
    this.ocupado = true;
    forkJoin({
      modelo: this.api.getModelo('contrato'),
      prox: this.api.proximoNumero('contrato'),
    }).subscribe({
      next: ({ modelo, prox }) => {
        const dados = dadosDeProjeto(this.projeto, 'contrato', prox.numero);
        this.cfg = {
          numero: prox.numero,
          corpo: preencherCorpo(modelo.corpo, dados),
          docId: null,
          data: new Date().toISOString(),
          tituloDoc: `Contrato ${dados.cliente || ''}`.trim(),
        };
        this.ocupado = false;
      },
      error: () => (this.ocupado = false),
    });
  }

  abrirUltimoContrato() {
    const doc = this.contratosSalvos().sort((a, b) => b.id - a.id)[0];
    if (doc) this.abrirSalvo(doc);
  }

  abrirSalvo(d: Documento) {
    this.cfg = {
      numero: d.numero,
      corpo: d.conteudo,
      docId: d.id,
      data: d.criado,
      tituloDoc: d.titulo,
    };
  }

  aoSalvar(d: Documento) {
    const i = this.documentos.findIndex((x) => x.id === d.id);
    if (i >= 0) this.documentos[i] = d;
    else this.documentos = [d, ...this.documentos];
  }

  async excluir(d: Documento) {
    const ok = await this.confirm.ask({
      title: 'Excluir documento',
      message: `Excluir ${TIPO_DOC_LABEL[d.tipo]} ${d.numero}?`,
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.excluirDocumento(d.id).subscribe(() => {
      this.documentos = this.documentos.filter((x) => x.id !== d.id);
    });
  }

}
