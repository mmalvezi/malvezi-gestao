import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { Documento, Orcamento, Projeto, TipoDocumento } from '../../core/models';
import { dataBr, TIPO_LABEL } from '../../core/utils';
import { DadosDoc, preencherCorpo } from '../../core/preencher';
import { Dialog } from '../dialog';
import { DocumentoEditor } from './documento-editor';

const TIPO_DOC_LABEL: Record<TipoDocumento, string> = {
  contrato: 'Contrato',
  orcamento: 'Orçamento',
  recibo: 'Recibo',
};

interface CfgEditor {
  tipo: TipoDocumento;
  numero: string;
  corpo: string;
  docId: number | null;
  data?: string;
  tituloDoc: string;
}

@Component({
  selector: 'app-documentos-area',
  standalone: true,
  imports: [CommonModule, Dialog, DocumentoEditor],
  template: `
    <div class="mut tiny mb-8">Documentos</div>
    <div class="chips">
      @for (t of tipos; track t) {
        <button class="btn sm" (click)="clicarTipo(t)" [disabled]="ocupado">
          {{ docLabel[t] }}
        </button>
      }
    </div>

    @if (documentos.length) {
      <div class="salvos">
        <div class="mut tiny mb-8 mt-16">Documentos salvos</div>
        @for (d of documentos; track d.id) {
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

    <!-- Escolha: abrir salvo ou gerar novo -->
    @if (escolha) {
      <app-dialog
        [titulo]="'Ja existe ' + docLabel[escolha] + ' salvo'"
        [largura]="440"
        (fechar)="escolha = null"
      >
        <p class="mut small">
          Deseja abrir o documento salvo mais recente ou gerar um novo a partir do
          modelo?
        </p>
        <div foot class="items-center" style="width:100%;justify-content:flex-end">
          <button class="btn ghost" (click)="gerarNovo(escolha!); escolha = null">
            Gerar novo
          </button>
          <button class="btn primary" (click)="abrirUltimoSalvo(escolha!); escolha = null">
            Abrir salvo
          </button>
        </div>
      </app-dialog>
    }

    <!-- Editor do documento final -->
    @if (cfg) {
      <app-documento-editor
        [tipo]="cfg.tipo"
        [numero]="cfg.numero"
        [corpo]="cfg.corpo"
        [docId]="cfg.docId"
        [data]="cfg.data"
        [projetoId]="projeto?.id"
        [orcamentoId]="orcamento?.id"
        [tituloDoc]="cfg.tituloDoc"
        (salvo)="aoSalvar($event)"
        (fechar)="cfg = null"
      ></app-documento-editor>
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

  @Input({ required: true }) tipos: TipoDocumento[] = [];
  @Input() projeto?: Projeto;
  @Input() orcamento?: Orcamento;

  documentos: Documento[] = [];
  escolha: TipoDocumento | null = null;
  cfg: CfgEditor | null = null;
  ocupado = false;

  docLabel = TIPO_DOC_LABEL;

  ngOnInit() {
    this.carregar();
  }

  fmtData(iso: string) {
    return dataBr(iso);
  }

  carregar() {
    const vinculo = this.projeto
      ? { projeto_id: this.projeto.id }
      : this.orcamento
        ? { orcamento_id: this.orcamento.id }
        : null;
    if (!vinculo) return;
    this.api.getDocumentos(vinculo).subscribe((d) => (this.documentos = d));
  }

  clicarTipo(tipo: TipoDocumento) {
    const existe = this.documentos.some((d) => d.tipo === tipo);
    if (existe) {
      this.escolha = tipo;
    } else {
      this.gerarNovo(tipo);
    }
  }

  abrirUltimoSalvo(tipo: TipoDocumento) {
    const doc = this.documentos
      .filter((d) => d.tipo === tipo)
      .sort((a, b) => b.id - a.id)[0];
    if (doc) this.abrirSalvo(doc);
  }

  abrirSalvo(d: Documento) {
    this.cfg = {
      tipo: d.tipo,
      numero: d.numero,
      corpo: d.conteudo,
      docId: d.id,
      data: d.criado,
      tituloDoc: d.titulo,
    };
  }

  gerarNovo(tipo: TipoDocumento) {
    this.ocupado = true;
    const orcId = this.orcamento?.id;
    forkJoin({
      modelo: this.api.getModelo(tipo),
      prox: this.api.proximoNumero(tipo, orcId),
    }).subscribe({
      next: ({ modelo, prox }) => {
        const dados = this.montarDados(tipo, prox.numero);
        this.cfg = {
          tipo,
          numero: prox.numero,
          corpo: preencherCorpo(modelo.corpo, dados),
          docId: null,
          data: new Date().toISOString(),
          tituloDoc: `${TIPO_DOC_LABEL[tipo]} ${dados.cliente || ''}`.trim(),
        };
        this.ocupado = false;
      },
      error: () => (this.ocupado = false),
    });
  }

  private montarDados(tipo: TipoDocumento, numero: string): DadosDoc {
    const cli = this.projeto?.cliente || this.orcamento?.cliente;
    const base: DadosDoc = {
      data: new Date().toISOString(),
      cliente: cli?.nome || '',
      empresa: cli?.empresa || '',
      contato: cli?.contato || '',
      numero,
      cidade_sede: 'Cabreúva',
      foro: 'comarca de Jundiaí',
    };

    if (this.orcamento && tipo === 'orcamento') {
      const o = this.orcamento;
      return {
        ...base,
        titulo: o.titulo,
        tipo: TIPO_LABEL[o.tipo],
        itens: o.itens.map((i) => ({
          titulo: i.titulo,
          descricao: i.descricao,
          valor: i.valor,
        })),
        desconto: o.desconto,
        validade: o.validade_dias,
        pagamento: o.pagamento,
        prazo: o.prazo,
        obs: o.obs,
        valor: o.total,
      };
    }

    const p = this.projeto;
    if (!p) return base;

    if (tipo === 'orcamento') {
      return {
        ...base,
        titulo: p.escopo ? p.escopo.slice(0, 60) : TIPO_LABEL[p.tipo],
        tipo: TIPO_LABEL[p.tipo],
        itens: [
          {
            titulo: TIPO_LABEL[p.tipo],
            descricao: p.escopo || '',
            valor: p.valor,
          },
        ],
        desconto: 0,
        validade: 15,
        pagamento: 'A combinar',
        prazo: 'A combinar',
        obs: '',
        valor: p.valor,
      };
    }

    // contrato ou recibo, a partir do projeto
    return {
      ...base,
      tipo: TIPO_LABEL[p.tipo],
      escopo: p.escopo || '',
      valor: tipo === 'recibo' ? p.pago : p.valor,
      pagamento: 'A combinar',
      prazo: 'A combinar',
      entrega: p.entrega || null,
      referente: `serviço de ${TIPO_LABEL[p.tipo]}${p.escopo ? ` (${p.escopo})` : ''}`,
    };
  }

  aoSalvar(d: Documento) {
    const i = this.documentos.findIndex((x) => x.id === d.id);
    if (i >= 0) this.documentos[i] = d;
    else this.documentos = [d, ...this.documentos];
  }

  excluir(d: Documento) {
    if (!confirm(`Excluir ${TIPO_DOC_LABEL[d.tipo]} ${d.numero}?`)) return;
    this.api.excluirDocumento(d.id).subscribe(() => {
      this.documentos = this.documentos.filter((x) => x.id !== d.id);
    });
  }
}
