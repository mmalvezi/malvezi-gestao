import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import {
  AreaTarefa,
  ColunaTarefa,
  TarefaProjeto,
  TarefaProjetoInput,
} from '../core/models';
import {
  AREAS,
  AREA_LABEL,
  COLUNAS,
  COLUNA_LABEL,
  PRIORIDADES,
  PRIORIDADE_LABEL,
  RESPONSAVEIS,
  dataBr,
  diasAte,
  iniciais,
} from '../core/utils';
import { Dialog } from './dialog';
import { AppSelect, OpcaoSelect } from './ui/app-select';
import { AppDatepicker } from './ui/app-datepicker';
import { ConfirmService } from './ui/confirm.service';

@Component({
  selector: 'app-quadro-tarefas',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, AppSelect, AppDatepicker],
  template: `
    <!-- Topo: busca, filtro de area e nova tarefa -->
    <div class="quadro-topo">
      <div class="busca-tarefa">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" stroke-linecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Buscar tarefa..."
          [(ngModel)]="busca"
          name="buscaTarefa"
          aria-label="Buscar tarefa pelo título"
        />
      </div>

      <div class="chips">
        <button class="chip" [class.active]="filtroArea === 'todas'" (click)="filtroArea = 'todas'">
          Todas
        </button>
        @for (a of areas; track a.valor) {
          <button class="chip" [class.active]="filtroArea === a.valor" (click)="filtroArea = a.valor">
            {{ a.rot }}
          </button>
        }
      </div>

      <span class="items-center gap-6">
        <button
          class="btn ghost sm"
          (click)="aplicarModelo()"
          [disabled]="aplicando"
          title="Gera as tarefas do roteiro deste tipo de projeto, do estágio atual e anteriores, sem duplicar"
        >
          {{ aplicando ? 'Aplicando...' : 'Aplicar modelo de tarefas' }}
        </button>
        <button class="btn primary" (click)="abrirNova('afazer')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
          Nova tarefa
        </button>
      </span>
    </div>

    <!-- Quadro -->
    <div class="quadro-tarefas">
      @for (c of colunas; track c.valor) {
        <section
          class="col"
          [class.valid]="c.valor === 'validacao'"
          [class.alvo]="alvo === c.valor"
          (dragover)="sobreColuna($event, c.valor)"
          (dragleave)="sairColuna($event, c.valor)"
          (drop)="soltar($event, c.valor)"
        >
          <header class="col-topo">
            <span class="col-nome">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="c.icone" />
              </svg>
              {{ c.rot }}
            </span>
            <span class="badge">{{ daColuna(c.valor).length }}</span>
          </header>

          <div class="col-corpo">
            @for (t of daColuna(c.valor); track t.id; let i = $index) {
              <article
                class="tarefa"
                draggable="true"
                [class.arrastando]="arrastando?.id === t.id"
                (dragstart)="iniciarArraste($event, t)"
                (dragend)="fimArraste()"
                (dragover)="sobreCartao($event, c.valor, i)"
              >
                <div class="t-topo">
                  <span class="area" [attr.data-area]="t.area">{{ areaLabel[t.area] }}</span>
                  <button
                    class="icon-btn sm menu-btn"
                    (click)="abrirMenu($event, t)"
                    [attr.aria-label]="'Ações da tarefa ' + t.titulo"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="1.6" />
                      <circle cx="12" cy="12" r="1.6" />
                      <circle cx="12" cy="19" r="1.6" />
                    </svg>
                  </button>
                </div>

                <h4 class="t-titulo">{{ t.titulo }}</h4>
                @if (t.descricao) {
                  <p class="t-desc">{{ t.descricao }}</p>
                }

                <div class="t-pe">
                  <span class="items-center gap-6">
                    <span class="badge" [attr.data-pri]="t.prioridade">
                      {{ prioridadeLabel[t.prioridade] }}
                    </span>
                    @if (t.prazo) {
                      <span
                        class="prazo tiny"
                        [class.vencido]="prazoVencido(t)"
                        [title]="'Prazo: ' + data(t.prazo)"
                      >
                        {{ data(t.prazo) }}
                      </span>
                    }
                  </span>
                  @if (t.responsavel) {
                    <span class="resp" [title]="t.responsavel">{{ ini(t.responsavel) }}</span>
                  }
                </div>

                @if (c.valor === 'validacao') {
                  <div class="t-valid">
                    <button class="btn sm aprovar" (click)="mover(t, 'concluido')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                        <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      Aprovar
                    </button>
                    <button class="btn sm ajuste" (click)="mover(t, 'fazendo')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <path d="M9 14 4 9l5-5" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M4 9h11a5 5 0 0 1 0 10h-3" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                      Pedir ajuste
                    </button>
                  </div>
                }
              </article>
            }

            @if (!daColuna(c.valor).length) {
              <div class="col-vazia mut tiny">Nada por aqui ainda</div>
            }
          </div>

          <button class="add-col" (click)="abrirNova(c.valor)" [attr.aria-label]="'Adicionar tarefa em ' + c.rot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14" stroke-linecap="round" />
            </svg>
            Adicionar tarefa
          </button>
        </section>
      }
    </div>

    <!-- Menu do cartao (posicao fixa, nao e cortado pela rolagem do quadro) -->
    @if (menu) {
      <div class="menu-bd" (click)="fecharMenu()"></div>
      <div class="menu-cartao" [style.top.px]="menuPos.top" [style.left.px]="menuPos.left" role="menu">
        <button role="menuitem" (click)="editar(menu!)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Editar
        </button>

        <div class="menu-sep"></div>
        <div class="menu-rot mut tiny">Mover para</div>
        @for (c of colunas; track c.valor) {
          @if (c.valor !== menu!.coluna) {
            <button role="menuitem" (click)="moverPeloMenu(c.valor)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {{ colunaLabel[c.valor] }}
            </button>
          }
        }

        <div class="menu-sep"></div>
        <button role="menuitem" class="perigo" (click)="excluir(menu!)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Excluir
        </button>
      </div>
    }

    <!-- Editor da tarefa -->
    @if (editorAberto) {
      <app-dialog
        [titulo]="editId ? 'Editar tarefa' : 'Nova tarefa'"
        [largura]="560"
        (fechar)="fecharEditor()"
      >
        <div class="field">
          <label for="tarefa-titulo">Título</label>
          <input
            id="tarefa-titulo"
            class="input"
            [(ngModel)]="form.titulo"
            name="titulo"
            placeholder="O que precisa ser feito"
            maxlength="120"
          />
        </div>

        <div class="field">
          <label for="tarefa-desc">Descrição</label>
          <textarea
            id="tarefa-desc"
            class="textarea"
            [(ngModel)]="form.descricao"
            name="descricao"
            placeholder="Detalhes, links, criterios de aceite..."
          ></textarea>
        </div>

        <div class="row-3">
          <div class="field">
            <label>Prioridade</label>
            <app-select
              [opcoes]="prioridades"
              ariaLabel="Prioridade"
              [(ngModel)]="form.prioridade"
              name="prioridade"
            ></app-select>
          </div>
          <div class="field">
            <label>Área</label>
            <app-select
              [opcoes]="areas"
              ariaLabel="Área"
              [(ngModel)]="form.area"
              name="area"
            ></app-select>
          </div>
          <div class="field">
            <label>Responsável</label>
            <app-select
              [opcoes]="responsaveis"
              ariaLabel="Responsável"
              [(ngModel)]="form.responsavel"
              name="responsavel"
            ></app-select>
          </div>
        </div>

        <div class="field">
          <label>Prazo (opcional)</label>
          <app-datepicker
            ariaLabel="Prazo da tarefa"
            [(ngModel)]="form.prazo"
            name="prazo"
          ></app-datepicker>
        </div>

        @if (!editId) {
          <div class="field">
            <label>Coluna</label>
            <app-select
              [opcoes]="colunasOpc()"
              ariaLabel="Coluna"
              [(ngModel)]="form.coluna"
              name="coluna"
            ></app-select>
          </div>
        }

        <div foot class="items-center">
          <button class="btn ghost" (click)="fecharEditor()">Cancelar</button>
          <button
            class="btn primary"
            (click)="salvar()"
            [disabled]="salvando || !form.titulo.trim()"
          >
            {{ salvando ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </app-dialog>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Topo do quadro */
      .quadro-topo {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 14px;
      }
      .quadro-topo .chips {
        flex: 1;
      }
      .busca-tarefa {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #fff;
        border: 1px solid var(--borda);
        border-radius: 999px;
        padding: 8px 14px;
        min-width: 200px;
        flex: 1 1 200px;
        max-width: 300px;
      }
      .busca-tarefa svg {
        width: 16px;
        height: 16px;
        color: var(--mut);
        flex-shrink: 0;
      }
      .busca-tarefa input {
        border: none;
        outline: none;
        font-family: inherit;
        font-size: 14px;
        color: var(--tinta);
        background: transparent;
        width: 100%;
        min-width: 0;
      }

      /* Grade das colunas: rola dentro do container, nunca na pagina */
      .quadro-tarefas {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(0, 1fr);
        gap: 14px;
        overflow-x: auto;
        padding-bottom: 10px;
        -webkit-overflow-scrolling: touch;
      }
      .col {
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: var(--soft);
        border: 1px solid transparent;
        border-radius: 14px;
        padding: 12px;
        min-width: 0;
      }
      .col.valid {
        background: rgba(110, 75, 255, 0.06);
        border-color: rgba(110, 75, 255, 0.22);
      }
      .col.alvo {
        border-color: var(--roxo);
        box-shadow: 0 0 0 3px rgba(110, 75, 255, 0.14);
      }
      .col-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .col-nome {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-family: 'Space Grotesk', sans-serif;
        font-size: 13px;
        font-weight: 700;
        color: var(--tinta);
        min-width: 0;
      }
      .col-nome svg {
        width: 15px;
        height: 15px;
        color: var(--roxo);
        flex-shrink: 0;
      }
      .col-corpo {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 40px;
      }
      .col-vazia {
        text-align: center;
        padding: 18px 8px;
        border: 1px dashed var(--borda);
        border-radius: 12px;
      }

      /* Cartao da tarefa */
      .tarefa {
        background: #fff;
        border: 1px solid var(--borda);
        border-radius: 12px;
        box-shadow: var(--shadow);
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        cursor: grab;
      }
      .tarefa:active {
        cursor: grabbing;
      }
      .tarefa.arrastando {
        opacity: 0.45;
      }
      .t-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .menu-btn {
        width: 28px;
        height: 28px;
        min-width: 28px;
        border-color: transparent;
        background: transparent;
      }
      .menu-btn svg {
        width: 16px;
        height: 16px;
      }
      .area {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 3px 9px;
        border-radius: 999px;
      }
      .area[data-area='dev'] {
        background: rgba(110, 75, 255, 0.12);
        color: var(--roxo);
      }
      .area[data-area='design'] {
        background: rgba(46, 134, 255, 0.12);
        color: var(--azul);
      }
      .area[data-area='produto'] {
        background: var(--warn-bg);
        color: var(--warn);
      }
      .area[data-area='cliente'] {
        background: var(--ok-bg);
        color: var(--ok);
      }
      .t-titulo {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 14px;
        font-weight: 700;
        margin: 0;
        overflow-wrap: anywhere;
      }
      .t-desc {
        margin: 0;
        font-size: 13px;
        color: var(--ink2);
        display: -webkit-box;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        overflow-wrap: anywhere;
      }
      .t-pe {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .badge[data-pri='alta'] {
        background: var(--bad-bg);
        color: var(--bad);
      }
      .badge[data-pri='media'] {
        background: rgba(110, 75, 255, 0.11);
        color: var(--roxo);
      }
      .badge[data-pri='baixa'] {
        background: var(--soft);
        color: var(--mut);
      }
      .prazo {
        font-weight: 600;
        color: var(--mut);
        white-space: nowrap;
      }
      .prazo.vencido {
        color: var(--bad);
      }
      .resp {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: var(--grad);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        font-family: 'Space Grotesk', sans-serif;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      /* Botoes da coluna de validacao */
      .t-valid {
        display: flex;
        gap: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--borda);
      }
      .t-valid .btn {
        flex: 1;
        justify-content: center;
        padding: 6px 8px;
        font-size: 12px;
      }
      .t-valid .btn svg {
        width: 14px;
        height: 14px;
      }
      .t-valid .aprovar {
        background: var(--ok-bg);
        color: var(--ok);
        border-color: transparent;
      }
      .t-valid .ajuste {
        background: var(--warn-bg);
        color: var(--warn);
        border-color: transparent;
      }

      /* Adicionar tarefa no rodape da coluna */
      .add-col {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        width: 100%;
        border: 1px dashed var(--borda);
        background: transparent;
        border-radius: 10px;
        padding: 9px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        color: var(--ink2);
        cursor: pointer;
      }
      .add-col:hover {
        border-color: var(--roxo);
        color: var(--roxo);
      }
      .add-col svg {
        width: 15px;
        height: 15px;
      }

      /* Menu do cartao */
      .menu-bd {
        position: fixed;
        inset: 0;
        z-index: 120;
      }
      .menu-cartao {
        position: fixed;
        z-index: 121;
        width: 190px;
        background: #fff;
        border: 1px solid var(--borda);
        border-radius: 12px;
        box-shadow: var(--shadow-lg);
        padding: 6px;
      }
      .menu-cartao button {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        border: none;
        background: transparent;
        font-family: inherit;
        font-size: 14px;
        color: var(--tinta);
        text-align: left;
        padding: 9px 10px;
        border-radius: 8px;
        cursor: pointer;
      }
      .menu-cartao button:hover {
        background: var(--soft);
      }
      .menu-cartao button svg {
        width: 15px;
        height: 15px;
        color: var(--mut);
        flex-shrink: 0;
      }
      .menu-cartao button.perigo {
        color: var(--bad);
      }
      .menu-cartao button.perigo svg {
        color: var(--bad);
      }
      .menu-sep {
        height: 1px;
        background: var(--borda);
        margin: 5px 4px;
      }
      .menu-rot {
        padding: 4px 10px 2px;
      }

      @media (max-width: 860px) {
        .quadro-tarefas {
          grid-auto-columns: 80%;
        }
        .busca-tarefa {
          max-width: none;
        }
      }
    `,
  ],
})
export class QuadroTarefas implements OnInit {
  private api = inject(ApiService);
  private confirm = inject(ConfirmService);

  @Input({ required: true }) projetoId!: number;
  /** Avisa o pai que o progresso mudou (para atualizar contadores). */
  @Output() mudou = new EventEmitter<TarefaProjeto[]>();

  tarefas: TarefaProjeto[] = [];

  colunas = COLUNAS;
  areas = AREAS;
  prioridades = PRIORIDADES;
  responsaveis = RESPONSAVEIS;
  colunaLabel = COLUNA_LABEL;
  areaLabel = AREA_LABEL;
  prioridadeLabel = PRIORIDADE_LABEL;
  ini = iniciais;
  data = dataBr;

  busca = '';
  filtroArea: AreaTarefa | 'todas' = 'todas';
  aplicando = false;

  /* Arrastar e soltar */
  arrastando: TarefaProjeto | null = null;
  alvo: ColunaTarefa | null = null;
  private alvoIdx: number | null = null;

  /* Menu do cartao */
  menu: TarefaProjeto | null = null;
  menuPos = { top: 0, left: 0 };

  /* Editor */
  editorAberto = false;
  editId: number | null = null;
  salvando = false;
  form: TarefaProjetoInput = this.novoForm();

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.api.getTarefasProjeto(this.projetoId).subscribe((t) => {
      this.tarefas = t;
      this.mudou.emit(this.tarefas);
    });
  }

  novoForm(coluna: ColunaTarefa = 'afazer'): TarefaProjetoInput {
    return {
      titulo: '',
      descricao: '',
      coluna,
      prioridade: 'media',
      area: 'dev',
      responsavel: '',
      prazo: null,
    };
  }

  /** Prazo estourado (e a tarefa ainda nao concluida). */
  prazoVencido(t: TarefaProjeto): boolean {
    return !!t.prazo && t.coluna !== 'concluido' && diasAte(t.prazo) < 0;
  }

  /** Gera as tarefas do roteiro (estagio atual e anteriores), sem duplicar. */
  aplicarModelo() {
    this.aplicando = true;
    this.api.aplicarModeloTarefas(this.projetoId).subscribe({
      next: () => {
        this.aplicando = false;
        this.carregar();
      },
      error: () => (this.aplicando = false),
    });
  }

  colunasOpc(): OpcaoSelect[] {
    return this.colunas.map((c) => ({ valor: c.valor, rot: c.rot }));
  }

  /** Tarefas de uma coluna, ja com busca e filtro de area aplicados. */
  daColuna(coluna: ColunaTarefa): TarefaProjeto[] {
    const busca = this.busca.toLowerCase().trim();
    return this.tarefas
      .filter((t) => t.coluna === coluna)
      .filter((t) => this.filtroArea === 'todas' || t.area === this.filtroArea)
      .filter((t) => !busca || t.titulo.toLowerCase().includes(busca))
      .sort((a, b) => a.ordem - b.ordem);
  }

  /* ---------- Arrastar e soltar ---------- */
  iniciarArraste(ev: DragEvent, t: TarefaProjeto) {
    this.arrastando = t;
    this.alvoIdx = null;
    ev.dataTransfer?.setData('text/plain', String(t.id));
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
  }

  fimArraste() {
    this.arrastando = null;
    this.alvo = null;
    this.alvoIdx = null;
  }

  /** Fora dos cartoes: solta no fim da coluna (sobreCartao trava a propagacao). */
  sobreColuna(ev: DragEvent, coluna: ColunaTarefa) {
    if (!this.arrastando) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
    this.alvo = coluna;
    this.alvoIdx = null;
  }

  sairColuna(ev: DragEvent, coluna: ColunaTarefa) {
    // dragleave tambem sobe dos cartoes: so limpa ao sair mesmo da coluna
    const col = ev.currentTarget as HTMLElement;
    const indo = ev.relatedTarget as Node | null;
    if (indo && col.contains(indo)) return;
    if (this.alvo === coluna) this.alvo = null;
  }

  /** Passar por cima de um cartao define a posicao de insercao. */
  sobreCartao(ev: DragEvent, coluna: ColunaTarefa, i: number) {
    if (!this.arrastando) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.alvo = coluna;
    this.alvoIdx = i;
  }

  soltar(ev: DragEvent, coluna: ColunaTarefa) {
    ev.preventDefault();
    const t = this.arrastando;
    const idx = this.alvoIdx;
    this.fimArraste();
    if (!t) return;
    this.mover(t, coluna, idx ?? undefined);
  }

  /* ---------- Mover (arrastar, menu ou botoes da validacao) ---------- */
  mover(t: TarefaProjeto, coluna: ColunaTarefa, ordem?: number) {
    const origem = t.coluna;
    const origemOrdem = t.ordem;
    if (origem === coluna && (ordem == null || ordem === origemOrdem)) return;

    // Atualiza na hora e reordena as duas colunas; se a API falhar, recarrega
    const destino = this.tarefas
      .filter((x) => x.coluna === coluna && x.id !== t.id)
      .sort((a, b) => a.ordem - b.ordem);
    const pos = ordem == null ? destino.length : Math.max(0, Math.min(ordem, destino.length));
    destino.splice(pos, 0, t);
    t.coluna = coluna;
    destino.forEach((x, i) => (x.ordem = i));

    if (origem !== coluna) {
      this.tarefas
        .filter((x) => x.coluna === origem)
        .sort((a, b) => a.ordem - b.ordem)
        .forEach((x, i) => (x.ordem = i));
    }
    this.mudou.emit(this.tarefas);

    this.api.moverTarefaProjeto(t.id, coluna, pos).subscribe({
      next: () => {},
      error: () => this.carregar(),
    });
  }

  /* ---------- Menu do cartao ---------- */
  abrirMenu(ev: MouseEvent, t: TarefaProjeto) {
    ev.stopPropagation();
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const largura = 190;
    const left = Math.max(8, Math.min(r.right - largura, window.innerWidth - largura - 8));
    const top = Math.min(r.bottom + 6, Math.max(8, window.innerHeight - 300));
    this.menuPos = { top, left };
    this.menu = t;
  }

  fecharMenu() {
    this.menu = null;
  }

  moverPeloMenu(coluna: ColunaTarefa) {
    const t = this.menu;
    this.fecharMenu();
    if (t) this.mover(t, coluna);
  }

  @HostListener('document:keydown.escape')
  aoEscapar() {
    this.fecharMenu();
  }

  /* ---------- Editor ---------- */
  abrirNova(coluna: ColunaTarefa) {
    this.editId = null;
    this.form = this.novoForm(coluna);
    this.editorAberto = true;
  }

  editar(t: TarefaProjeto) {
    this.fecharMenu();
    this.editId = t.id;
    this.form = {
      titulo: t.titulo,
      descricao: t.descricao || '',
      coluna: t.coluna,
      prioridade: t.prioridade,
      area: t.area,
      responsavel: t.responsavel || '',
      prazo: t.prazo || null,
    };
    this.editorAberto = true;
  }

  fecharEditor() {
    this.editorAberto = false;
  }

  salvar() {
    const titulo = this.form.titulo.trim();
    if (!titulo) return;
    this.salvando = true;
    const payload = {
      ...this.form,
      titulo,
      responsavel: this.form.responsavel || null,
      prazo: this.form.prazo || null,
    };

    const req = this.editId
      ? this.api.atualizarTarefaProjeto(this.editId, {
          titulo: payload.titulo,
          descricao: payload.descricao,
          prioridade: payload.prioridade,
          area: payload.area,
          responsavel: payload.responsavel,
          prazo: payload.prazo,
        })
      : this.api.criarTarefaProjeto(this.projetoId, payload);

    req.subscribe({
      next: (tarefa) => {
        this.salvando = false;
        this.editorAberto = false;
        if (this.editId) {
          this.tarefas = this.tarefas.map((t) => (t.id === tarefa.id ? tarefa : t));
        } else {
          this.tarefas = [...this.tarefas, tarefa];
        }
        this.mudou.emit(this.tarefas);
      },
      error: () => (this.salvando = false),
    });
  }

  async excluir(t: TarefaProjeto) {
    this.fecharMenu();
    const ok = await this.confirm.ask({
      title: 'Excluir tarefa',
      message: `Excluir a tarefa "${t.titulo}"?`,
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.excluirTarefaProjeto(t.id).subscribe(() => {
      this.tarefas = this.tarefas.filter((x) => x.id !== t.id);
      this.mudou.emit(this.tarefas);
    });
  }
}
