import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { NotaProjeto } from '../core/models';
import { dataHoraBr } from '../core/utils';
import { ConfirmService } from './ui/confirm.service';

@Component({
  selector: 'app-notas-projeto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mut tiny mb-8">Anotações da reunião</div>

    <div class="nova">
      <textarea
        class="textarea"
        [(ngModel)]="texto"
        name="novaNota"
        rows="2"
        placeholder="Registre um ponto da conversa com o cliente..."
        (keydown)="aoTeclar($event)"
      ></textarea>
      <button class="btn primary" (click)="adicionar()" [disabled]="!texto.trim()">
        Adicionar nota
      </button>
    </div>

    @if (notas.length) {
      <div class="lista">
        @for (n of notas; track n.id) {
          <div class="nota">
            <div class="min0">
              <div class="mut tiny">{{ fmt(n.criado) }}</div>
              <div class="txt">{{ n.texto }}</div>
            </div>
            <button class="icon-btn sm" (click)="remover(n)" aria-label="Remover nota">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        }
      </div>
    } @else {
      <div class="vazio mut small">
        Nenhuma anotação ainda. Registre aqui os pontos das conversas com o cliente.
      </div>
    }
  `,
  styles: [
    `
      .nova {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 14px;
      }
      .nova .btn {
        align-self: flex-end;
      }
      .lista {
        max-height: 240px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-right: 4px;
      }
      .nota {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        background: var(--soft);
        border-radius: 10px;
        padding: 10px 12px;
      }
      .nota .txt {
        white-space: pre-wrap;
        font-size: 14px;
        margin-top: 2px;
      }
      .min0 {
        min-width: 0;
      }
      .vazio {
        background: var(--soft);
        border-radius: 10px;
        padding: 16px;
        text-align: center;
      }
    `,
  ],
})
export class NotasProjeto implements OnInit {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);

  @Input({ required: true }) projetoId!: number;

  notas: NotaProjeto[] = [];
  texto = '';

  ngOnInit() {
    this.carregar();
  }

  fmt(iso: string) {
    return dataHoraBr(iso);
  }

  carregar() {
    this.api.getNotas(this.projetoId).subscribe((n) => (this.notas = n));
  }

  aoTeclar(ev: KeyboardEvent) {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.adicionar();
    }
  }

  adicionar() {
    const t = this.texto.trim();
    if (!t) return;
    this.api.criarNota(this.projetoId, t).subscribe((nota) => {
      this.notas = [nota, ...this.notas];
      this.texto = '';
    });
  }

  async remover(n: NotaProjeto) {
    const ok = await this.confirm.ask({
      title: 'Remover anotação',
      message: 'Remover esta anotação?',
      confirmText: 'Remover',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.excluirNota(n.id).subscribe(() => {
      this.notas = this.notas.filter((x) => x.id !== n.id);
    });
  }
}
