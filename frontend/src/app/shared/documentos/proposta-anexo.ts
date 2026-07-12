import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { ApiService } from '../../core/api.service';
import { Orcamento } from '../../core/models';
import { LIMITE_ANEXO_MB, dataBr, tamanhoArquivo } from '../../core/utils';
import { ConfirmService } from '../ui/confirm.service';

/**
 * Secao Proposta (PDF) do orcamento: anexar, abrir, substituir e remover.
 * Quando existe anexo, ele passa a ser o documento padrao do orcamento.
 */
@Component({
  selector: 'app-proposta-anexo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="between mb-8">
      <span class="section-title" style="margin:0">Proposta (PDF)</span>
      @if (orc.tem_anexo) {
        <span class="badge ok">
          <span class="dot"></span>
          Anexada
        </span>
      }
    </div>

    @if (orc.tem_anexo) {
      <div class="anexo">
        <div class="icone-pdf" aria-hidden="true">PDF</div>
        <div class="min0">
          <div class="bold small trunc">{{ orc.anexo_nome }}</div>
          <div class="mut tiny">
            {{ tam(orc.anexo_tamanho) }} · enviada em {{ data(orc.anexo_criado) }}
          </div>
        </div>
      </div>

      <div class="acoes">
        <button class="btn primary" (click)="abrirEmNovaAba()" [disabled]="ocupado">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Abrir em nova aba
        </button>
        <button class="btn" (click)="escolher()" [disabled]="ocupado">Substituir</button>
        <button class="btn danger" (click)="remover()" [disabled]="ocupado">Remover</button>
      </div>
      <p class="mut tiny mt-8">
        Ao substituir, a proposta anterior e apagada e a nova passa a ser o
        documento padrao deste orcamento.
      </p>
    } @else {
      <div
        class="solta"
        [class.sobre]="sobre"
        (dragover)="aoArrastar($event)"
        (dragleave)="sobre = false"
        (drop)="aoSoltar($event)"
      >
        <span class="icone-envio" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <div class="bold small">Anexe a proposta pronta em PDF</div>
        <div class="mut tiny">
          Arraste o arquivo aqui ou use o botao. Somente PDF, ate {{ limite }} MB.
        </div>
        <button class="btn primary mt-8" (click)="escolher()" [disabled]="ocupado">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.49" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Anexar proposta em PDF
        </button>
      </div>
    }

    @if (ocupado) {
      <div class="items-center mt-8 mut small">
        <span class="spin"></span> Enviando a proposta...
      </div>
    }

    @if (erro) {
      <div class="erro mt-8">{{ erro }}</div>
    }

    <input
      #campo
      type="file"
      accept="application/pdf,.pdf"
      hidden
      (change)="aoEscolher($event)"
    />
  `,
  styles: [
    `
      .min0 {
        min-width: 0;
      }
      .trunc {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .anexo {
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--soft);
        border-radius: 12px;
        padding: 12px 14px;
      }
      .icone-pdf {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: var(--grad);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        font-family: 'Space Grotesk', sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .acoes {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .solta {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        text-align: center;
        border: 1px dashed var(--borda);
        border-radius: 14px;
        padding: 24px 16px;
        background: var(--soft);
      }
      .solta.sobre {
        border-color: var(--roxo);
        background: rgba(110, 75, 255, 0.07);
      }
      /* Icone branco sobre o degrade da marca, igual ao botao de anexar */
      .icone-envio {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: var(--grad);
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 6px;
        flex-shrink: 0;
      }
      .icone-envio svg {
        width: 22px;
        height: 22px;
      }
      .erro {
        background: var(--bad-bg);
        color: var(--bad);
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 600;
      }
    `,
  ],
})
export class PropostaAnexo {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);

  @Input({ required: true }) orc!: Orcamento;
  /** Avisa o pai (lista/visualizacao) que o anexo mudou. */
  @Output() mudou = new EventEmitter<Orcamento>();

  @ViewChild('campo') campo?: ElementRef<HTMLInputElement>;

  ocupado = false;
  sobre = false;
  erro = '';
  limite = LIMITE_ANEXO_MB;

  tam = tamanhoArquivo;
  data = dataBr;

  escolher() {
    this.erro = '';
    this.campo?.nativeElement.click();
  }

  aoEscolher(ev: Event) {
    const campo = ev.target as HTMLInputElement;
    const arquivo = campo.files?.[0];
    campo.value = '';
    if (arquivo) this.enviar(arquivo);
  }

  aoArrastar(ev: DragEvent) {
    ev.preventDefault();
    this.sobre = true;
  }

  aoSoltar(ev: DragEvent) {
    ev.preventDefault();
    this.sobre = false;
    const arquivo = ev.dataTransfer?.files?.[0];
    if (arquivo) this.enviar(arquivo);
  }

  private enviar(arquivo: File) {
    this.erro = '';

    const ehPdf =
      arquivo.type === 'application/pdf' ||
      arquivo.name.toLowerCase().endsWith('.pdf');
    if (!ehPdf) {
      this.erro = 'Somente arquivos PDF sao aceitos. Escolha um arquivo .pdf.';
      return;
    }
    if (arquivo.size > LIMITE_ANEXO_MB * 1024 * 1024) {
      this.erro = `Arquivo muito grande (${tamanhoArquivo(arquivo.size)}). O limite e ${LIMITE_ANEXO_MB} MB.`;
      return;
    }

    this.ocupado = true;
    this.api.enviarAnexoOrcamento(this.orc.id, arquivo).subscribe({
      next: (a) => {
        this.ocupado = false;
        this.orc = {
          ...this.orc,
          tem_anexo: true,
          anexo_nome: a.nome,
          anexo_tamanho: a.tamanho,
          anexo_criado: a.criado,
        };
        this.mudou.emit(this.orc);
      },
      error: (e) => {
        this.ocupado = false;
        this.erro =
          e?.error?.detail ||
          'Nao foi possivel enviar o arquivo. Verifique a conexao e tente de novo.';
      },
    });
  }

  abrirEmNovaAba() {
    this.ocupado = true;
    this.api.baixarAnexoOrcamento(this.orc.id).subscribe({
      next: (blob) => {
        this.ocupado = false;
        const url = URL.createObjectURL(
          new Blob([blob], { type: 'application/pdf' }),
        );
        window.open(url, '_blank');
        // A aba ja carregou o PDF; liberamos a memoria depois
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: () => {
        this.ocupado = false;
        this.erro = 'Nao foi possivel abrir o PDF.';
      },
    });
  }

  async remover() {
    const ok = await this.confirm.ask({
      title: 'Remover proposta',
      message:
        'Remover a proposta anexada? O orcamento volta a usar o documento automatico.',
      confirmText: 'Remover',
      tone: 'danger',
    });
    if (!ok) return;
    this.ocupado = true;
    this.api.excluirAnexoOrcamento(this.orc.id).subscribe({
      next: () => {
        this.ocupado = false;
        this.orc = {
          ...this.orc,
          tem_anexo: false,
          anexo_nome: null,
          anexo_tamanho: null,
          anexo_criado: null,
        };
        this.mudou.emit(this.orc);
      },
      error: () => {
        this.ocupado = false;
        this.erro = 'Nao foi possivel remover a proposta.';
      },
    });
  }
}
