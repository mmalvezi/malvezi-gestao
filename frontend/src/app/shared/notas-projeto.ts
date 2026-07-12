import { Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { NotaProjeto } from '../core/models';
import { dataHoraBr } from '../core/utils';
import { Dialog } from './dialog';
import { EditorCorpo } from './editor-corpo';
import { ConfirmService } from './ui/confirm.service';

/**
 * Anotacoes do projeto, com titulo e texto formatado (negrito, italico e
 * lista). O HTML e sanitizado no backend, como no contrato. Clicar numa nota
 * abre o popup com o conteudo completo, editar e excluir.
 */
@Component({
  selector: 'app-notas-projeto',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, EditorCorpo],
  template: `
    <div class="mut tiny mb-8">Anotações da reunião</div>

    <!-- Nova nota -->
    <div class="nova">
      <input
        class="input"
        [(ngModel)]="titulo"
        name="novoTitulo"
        placeholder="Assunto (ex.: Reunião de alinhamento 12/07)"
        maxlength="120"
      />
      <app-editor-corpo
        #editorNovo
        [compacto]="true"
        [(valor)]="texto"
      ></app-editor-corpo>
      <button class="btn primary" (click)="adicionar()" [disabled]="!temTexto()">
        Adicionar nota
      </button>
    </div>

    @if (notas.length) {
      <div class="lista">
        @for (n of notas; track n.id) {
          <button class="nota" (click)="abrir(n)" [attr.aria-label]="'Abrir nota ' + (n.titulo || 'sem assunto')">
            <div class="min0">
              <div class="bold small trunc">{{ n.titulo || 'Sem assunto' }}</div>
              <div class="mut tiny">{{ fmt(n.criado) }}</div>
              <div class="resumo mut small trunc">{{ resumo(n) }}</div>
            </div>
            <svg class="seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        }
      </div>
    } @else {
      <div class="vazio mut small">
        Nenhuma anotação ainda. Registre aqui os pontos das conversas com o cliente.
      </div>
    }

    <!-- Popup da nota -->
    @if (aberta) {
      <app-dialog
        [titulo]="editando ? 'Editar nota' : (aberta.titulo || 'Sem assunto')"
        [largura]="620"
        [zIndex]="90"
        (fechar)="fecharPopup()"
      >
        @if (editando) {
          <div class="field">
            <label for="nota-titulo">Assunto</label>
            <input
              id="nota-titulo"
              class="input"
              [(ngModel)]="tituloEdicao"
              name="tituloEdicao"
              maxlength="120"
            />
          </div>
          <div class="field">
            <label>Texto</label>
            <app-editor-corpo
              [compacto]="true"
              [valor]="textoEdicao"
              (valorChange)="textoEdicao = $event"
            ></app-editor-corpo>
          </div>
        } @else {
          <div class="mut tiny mb-8">Criada em {{ fmt(aberta.criado) }}</div>
          <div class="conteudo" [innerHTML]="aberta.texto"></div>
        }

        <div foot class="between" style="width:100%">
          <span>
            @if (!editando) {
              <button class="btn danger" (click)="excluir(aberta)">Excluir</button>
            }
          </span>
          <span class="items-center">
            @if (editando) {
              <button class="btn ghost" (click)="editando = false">Cancelar</button>
              <button class="btn primary" (click)="salvarEdicao()" [disabled]="salvando">
                {{ salvando ? 'Salvando...' : 'Salvar' }}
              </button>
            } @else {
              <button class="btn ghost" (click)="fecharPopup()">Fechar</button>
              <button class="btn" (click)="editar()">Editar</button>
            }
          </span>
        </div>
      </app-dialog>
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
      .nova app-editor-corpo {
        border: 1px solid var(--borda);
        border-radius: 10px;
        padding: 10px 12px;
        background: #fff;
      }
      .lista {
        max-height: 300px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-right: 4px;
      }
      .nota {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        width: 100%;
        text-align: left;
        font-family: inherit;
        border: none;
        background: var(--soft);
        border-radius: 10px;
        padding: 10px 12px;
        cursor: pointer;
        transition: background 0.12s ease;
      }
      .nota:hover {
        background: var(--info-bg);
      }
      .nota .resumo {
        margin-top: 2px;
      }
      .nota .seta {
        width: 16px;
        height: 16px;
        color: var(--mut);
        flex-shrink: 0;
      }
      .min0 {
        min-width: 0;
        flex: 1;
      }
      .trunc {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .vazio {
        background: var(--soft);
        border-radius: 10px;
        padding: 16px;
        text-align: center;
      }
      .conteudo {
        font-size: 14px;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }
      .conteudo ::ng-deep ul {
        margin: 8px 0;
        padding-left: 22px;
      }
      .conteudo ::ng-deep p {
        margin: 0 0 8px;
      }
    `,
  ],
})
export class NotasProjeto implements OnInit {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);

  @Input({ required: true }) projetoId!: number;
  @ViewChild('editorNovo') editorNovo?: EditorCorpo;

  notas: NotaProjeto[] = [];

  /* Nova nota */
  titulo = '';
  texto = '';

  /* Popup */
  aberta: NotaProjeto | null = null;
  editando = false;
  tituloEdicao = '';
  textoEdicao = '';
  salvando = false;

  ngOnInit() {
    this.carregar();
  }

  fmt(iso: string) {
    return dataHoraBr(iso);
  }

  carregar() {
    this.api.getNotas(this.projetoId).subscribe((n) => (this.notas = n));
  }

  /** Resumo em texto puro (sem as tags) para a lista. */
  resumo(n: NotaProjeto): string {
    const div = document.createElement('div');
    div.innerHTML = n.texto || '';
    const puro = (div.textContent || '').replace(/\s+/g, ' ').trim();
    return puro.length > 90 ? puro.slice(0, 90) + '...' : puro;
  }

  temTexto(): boolean {
    const div = document.createElement('div');
    div.innerHTML = this.texto || '';
    return !!(div.textContent || '').trim();
  }

  adicionar() {
    if (!this.temTexto()) return;
    this.api
      .criarNota(this.projetoId, {
        titulo: this.titulo.trim(),
        texto: this.texto,
      })
      .subscribe((nota) => {
        this.notas = [nota, ...this.notas];
        this.titulo = '';
        this.texto = '';
        this.editorNovo?.setHtml('');
      });
  }

  /* ---------- Popup ---------- */
  abrir(n: NotaProjeto) {
    this.aberta = n;
    this.editando = false;
  }

  fecharPopup() {
    this.aberta = null;
    this.editando = false;
  }

  editar() {
    if (!this.aberta) return;
    this.tituloEdicao = this.aberta.titulo || '';
    this.textoEdicao = this.aberta.texto || '';
    this.editando = true;
  }

  salvarEdicao() {
    const nota = this.aberta;
    if (!nota) return;
    this.salvando = true;
    this.api
      .atualizarNota(nota.id, {
        titulo: this.tituloEdicao.trim(),
        texto: this.textoEdicao,
      })
      .subscribe({
        next: (atual) => {
          this.salvando = false;
          this.notas = this.notas.map((x) => (x.id === atual.id ? atual : x));
          this.aberta = atual;
          this.editando = false;
        },
        error: () => (this.salvando = false),
      });
  }

  async excluir(n: NotaProjeto) {
    const ok = await this.confirm.ask({
      title: 'Excluir nota',
      message: `Excluir a nota "${n.titulo || 'sem assunto'}"?`,
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.excluirNota(n.id).subscribe(() => {
      this.notas = this.notas.filter((x) => x.id !== n.id);
      this.fecharPopup();
    });
  }
}
