import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { ModeloVerificacao, TipoProjeto } from '../../core/models';
import { TIPOS } from '../../core/utils';
import { ConfirmService } from '../../shared/ui/confirm.service';

/**
 * Configuracao do checklist mensal dos projetos entregues, por tipo.
 * Os itens daqui viram a verificacao que nasce todo mes para cada entregue.
 */
@Component({
  selector: 'app-checklist-verificacao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (carregando) {
      <div class="loading"><span class="spin"></span> Carregando checklist...</div>
    } @else {
      <p class="mut small explica">
        Todo mês, cada projeto entregue ganha uma verificação de saúde com os
        itens abaixo, conforme o tipo. Marque tudo e conclua para manter a
        mensalidade sustentada.
      </p>

      <div class="chips mb-16">
        @for (t of tipos; track t.valor) {
          <button class="chip" [class.active]="tipoSel === t.valor" (click)="tipoSel = t.valor">
            {{ t.rot }}
          </button>
        }
      </div>

      <div class="card card-pad">
        @for (m of doTipo(); track m.id; let i = $index; let ultimo = $last) {
          <div class="linha">
            <div class="ordena">
              <button class="mini-btn" [disabled]="i === 0" (click)="mover(m, -1)" aria-label="Mover para cima">▲</button>
              <button class="mini-btn" [disabled]="ultimo" (click)="mover(m, 1)" aria-label="Mover para baixo">▼</button>
            </div>
            <input
              class="input titulo"
              [(ngModel)]="m.titulo"
              [name]="'chk-' + m.id"
              (blur)="salvar(m)"
              aria-label="Item do checklist"
            />
            <button class="icon-btn sm" (click)="excluir(m)" aria-label="Excluir item do checklist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        }
        @if (!doTipo().length) {
          <div class="mut tiny vazio">Nenhum item para este tipo ainda.</div>
        }

        <form class="novo" (ngSubmit)="adicionar()">
          <input
            class="input"
            [(ngModel)]="novoTitulo"
            name="novoTitulo"
            placeholder="Novo item do checklist..."
            maxlength="120"
          />
          <button class="btn primary sm" type="submit" [disabled]="!novoTitulo.trim()">
            Adicionar
          </button>
        </form>
      </div>
    }
  `,
  styles: [
    `
      .explica {
        margin: 0 0 14px;
      }
      .linha {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .linha .titulo {
        flex: 1;
      }
      .ordena {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex-shrink: 0;
      }
      .mini-btn {
        border: 1px solid var(--borda);
        background: #fff;
        border-radius: 6px;
        width: 22px;
        height: 18px;
        font-size: 8px;
        line-height: 1;
        color: var(--ink2);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .mini-btn:hover:not(:disabled) {
        background: var(--soft);
      }
      .mini-btn:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .vazio {
        border: 1px dashed var(--borda);
        border-radius: 10px;
        padding: 12px;
        text-align: center;
        margin-bottom: 8px;
      }
      .novo {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }
      .novo .input {
        flex: 1;
      }
    `,
  ],
})
export class ChecklistVerificacao implements OnInit {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);

  itens: ModeloVerificacao[] = [];
  carregando = true;
  tipoSel: TipoProjeto = 'site';
  novoTitulo = '';

  tipos = TIPOS;

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.api.getModelosVerificacao().subscribe({
      next: (m) => {
        this.itens = m;
        this.carregando = false;
      },
      error: () => (this.carregando = false),
    });
  }

  doTipo(): ModeloVerificacao[] {
    return this.itens
      .filter((m) => m.tipo_projeto === this.tipoSel)
      .sort((a, b) => a.ordem - b.ordem);
  }

  adicionar() {
    const titulo = this.novoTitulo.trim();
    if (!titulo) return;
    this.api
      .criarModeloVerificacao({
        tipo_projeto: this.tipoSel,
        titulo,
        ordem: this.doTipo().length,
        ativo: true,
      })
      .subscribe(() => {
        this.novoTitulo = '';
        this.carregar();
      });
  }

  salvar(m: ModeloVerificacao) {
    if (!m.id || !m.titulo.trim()) return;
    this.api.atualizarModeloVerificacao(m.id, m).subscribe();
  }

  mover(m: ModeloVerificacao, direcao: -1 | 1) {
    const grupo = this.doTipo();
    const i = grupo.findIndex((x) => x.id === m.id);
    const j = i + direcao;
    if (i < 0 || j < 0 || j >= grupo.length) return;
    [grupo[i], grupo[j]] = [grupo[j], grupo[i]];
    grupo.forEach((x, idx) => (x.ordem = idx));
    this.api
      .reordenarModelosVerificacao(grupo.map((x) => x.id!))
      .subscribe(() => this.carregar());
  }

  async excluir(m: ModeloVerificacao) {
    const ok = await this.confirm.ask({
      title: 'Excluir item',
      message: `Excluir "${m.titulo}" do checklist? As verificações já criadas não são afetadas.`,
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok || !m.id) return;
    this.api.excluirModeloVerificacao(m.id).subscribe(() => this.carregar());
  }
}
