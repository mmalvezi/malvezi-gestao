import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { ItemVerificacao, Verificacao } from '../core/models';
import { competenciaBr, dataBr } from '../core/utils';

/**
 * Historico das verificacoes mensais de saude do projeto entregue: cada mes
 * com o checklist do tipo do projeto, observacoes e o botao de concluir.
 */
@Component({
  selector: 'app-verificacoes-projeto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="between mb-16">
      <span class="section-title" style="margin:0">Verificações mensais</span>
    </div>

    @if (carregando) {
      <div class="loading"><span class="spin"></span> Carregando verificações...</div>
    } @else if (!verificacoes.length) {
      <div class="vazio mut small">
        Nenhuma verificação ainda. Elas nascem todo mês, sozinhas, quando o
        projeto está entregue.
      </div>
    } @else {
      @for (v of verificacoes; track v.id) {
        <div class="mes card" [class.aberta-borda]="v.status === 'aberta'">
          <button class="mes-topo" (click)="alternar(v)" [attr.aria-expanded]="expandida === v.id">
            <span class="bold small">{{ competencia(v.competencia) }}</span>
            <span class="items-center gap-6">
              @if (v.status === 'concluida') {
                <span class="badge ok"><span class="dot"></span> Concluída em {{ data(v.concluida_em) }}</span>
              } @else {
                <span class="badge warn"><span class="dot"></span> Aberta · {{ pendentes(v) }} de {{ v.itens.length }} itens</span>
              }
              <svg class="chev" [class.girada]="expandida === v.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
          </button>

          @if (expandida === v.id) {
            <div class="mes-corpo">
              @for (item of v.itens; track item.id) {
                <div class="item">
                  <button
                    class="check"
                    [class.on]="item.ok"
                    [disabled]="v.status === 'concluida'"
                    (click)="marcar(v, item)"
                    [attr.aria-label]="(item.ok ? 'Desmarcar: ' : 'Marcar: ') + item.titulo"
                  >
                    @if (item.ok) {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    }
                  </button>
                  <div class="min0">
                    <div class="small" [class.feito]="item.ok">{{ item.titulo }}</div>
                    @if (v.status === 'aberta') {
                      <input
                        class="input obs"
                        [(ngModel)]="item.observacao"
                        [name]="'obs-' + item.id"
                        placeholder="Observação (opcional)"
                        (blur)="salvarObs(v, item)"
                      />
                    } @else if (item.observacao) {
                      <div class="mut tiny">{{ item.observacao }}</div>
                    }
                  </div>
                </div>
              }

              @if (v.status === 'aberta') {
                <div class="field mt-16">
                  <label [for]="'obs-geral-' + v.id">Observações do mês</label>
                  <textarea
                    [id]="'obs-geral-' + v.id"
                    class="textarea"
                    [(ngModel)]="v.observacoes"
                    [name]="'obs-geral-' + v.id"
                    placeholder="Como está a saúde do projeto? Registre o que precisar."
                  ></textarea>
                </div>
                @if (erro) {
                  <div class="erro tiny">{{ erro }}</div>
                }
                <div class="between">
                  <span class="mut tiny">
                    @if (pendentes(v)) {
                      Para concluir com itens pendentes, registre o motivo nas observações.
                    }
                  </span>
                  <button class="btn primary" (click)="concluir(v)" [disabled]="salvando">
                    {{ salvando ? 'Concluindo...' : 'Concluir verificação do mês' }}
                  </button>
                </div>
              } @else {
                @if (v.observacoes) {
                  <div class="obs-final mut small">{{ v.observacoes }}</div>
                }
                <button class="btn sm ghost mt-16" (click)="reabrir(v)">Reabrir</button>
              }
            </div>
          }
        </div>
      }
    }
  `,
  styles: [
    `
      .vazio {
        background: var(--soft);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
      }
      .mes {
        margin-bottom: 10px;
        overflow: hidden;
      }
      .mes.aberta-borda {
        border-color: rgba(110, 75, 255, 0.35);
      }
      .mes-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        width: 100%;
        border: none;
        background: transparent;
        font-family: inherit;
        padding: 14px 16px;
        cursor: pointer;
        text-align: left;
      }
      .chev {
        width: 16px;
        height: 16px;
        color: var(--mut);
        transition: transform 0.15s ease;
      }
      .chev.girada {
        transform: rotate(180deg);
      }
      .mes-corpo {
        padding: 0 16px 16px;
        border-top: 1px solid var(--borda);
        padding-top: 12px;
      }
      .item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 7px 0;
      }
      .item .min0 {
        min-width: 0;
        flex: 1;
      }
      .item .feito {
        color: var(--mut);
        text-decoration: line-through;
      }
      .item .obs {
        margin-top: 4px;
        padding: 6px 10px;
        font-size: 13px;
      }
      .check {
        width: 24px;
        height: 24px;
        border-radius: 8px;
        border: 2px solid var(--borda);
        background: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #fff;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .check.on {
        background: var(--ok);
        border-color: var(--ok);
      }
      .check:disabled {
        cursor: default;
        opacity: 0.8;
      }
      .check svg {
        width: 13px;
        height: 13px;
      }
      .erro {
        background: var(--bad-bg);
        color: var(--bad);
        border-radius: 10px;
        padding: 8px 12px;
        font-weight: 600;
        margin-bottom: 10px;
      }
      .obs-final {
        background: var(--soft);
        border-radius: 10px;
        padding: 10px 12px;
        margin-top: 8px;
        white-space: pre-wrap;
      }
    `,
  ],
})
export class VerificacoesProjeto implements OnInit {
  private api = inject(ApiService);

  @Input({ required: true }) projetoId!: number;

  verificacoes: Verificacao[] = [];
  carregando = true;
  expandida: number | null = null;
  salvando = false;
  erro = '';

  competencia = competenciaBr;
  data = dataBr;

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.api.getVerificacoesProjeto(this.projetoId).subscribe({
      next: (v) => {
        this.verificacoes = v;
        this.carregando = false;
        // Abre a verificacao pendente do mes, se houver
        const aberta = v.find((x) => x.status === 'aberta');
        if (aberta && this.expandida === null) this.expandida = aberta.id;
      },
      error: () => (this.carregando = false),
    });
  }

  alternar(v: Verificacao) {
    this.expandida = this.expandida === v.id ? null : v.id;
    this.erro = '';
  }

  pendentes(v: Verificacao): number {
    return v.itens.filter((i) => !i.ok).length;
  }

  private trocar(atual: Verificacao) {
    this.verificacoes = this.verificacoes.map((x) =>
      x.id === atual.id ? atual : x,
    );
  }

  marcar(v: Verificacao, item: ItemVerificacao) {
    const novo = !item.ok;
    item.ok = novo; // resposta imediata na tela
    this.api
      .marcarItemVerificacao(item.id, { ok: novo, observacao: item.observacao })
      .subscribe({
        error: () => (item.ok = !novo),
      });
  }

  salvarObs(v: Verificacao, item: ItemVerificacao) {
    this.api
      .marcarItemVerificacao(item.id, {
        ok: item.ok,
        observacao: item.observacao || '',
      })
      .subscribe();
  }

  concluir(v: Verificacao) {
    this.erro = '';
    this.salvando = true;
    this.api.concluirVerificacao(v.id, v.observacoes || '').subscribe({
      next: (atual) => {
        this.salvando = false;
        this.trocar(atual);
      },
      error: (e) => {
        this.salvando = false;
        this.erro =
          e?.error?.detail || 'Não foi possível concluir a verificação.';
      },
    });
  }

  reabrir(v: Verificacao) {
    this.api.reabrirVerificacao(v.id).subscribe((atual) => this.trocar(atual));
  }
}
