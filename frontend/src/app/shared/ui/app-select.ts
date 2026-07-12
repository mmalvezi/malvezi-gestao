import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
  forwardRef,
  inject,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

export interface OpcaoSelect {
  valor: any;
  rot: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSelect),
      multi: true,
    },
  ],
  template: `
    <button
      #trigger
      type="button"
      class="sel-trigger"
      [class.sm]="compacto"
      [attr.data-cls]="triggerCls"
      [disabled]="disabled"
      (click)="alternar()"
      (keydown)="tecla($event)"
      aria-haspopup="listbox"
      [attr.aria-expanded]="aberto"
      [attr.aria-label]="ariaLabel || placeholder"
    >
      <span class="sel-rot" [class.ph]="!temValor()">{{ rotuloAtual() }}</span>
      <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    @if (aberto && mobile) {
      <div class="sheet-bd" (click)="fechar()"></div>
    }
    @if (aberto) {
      <div
        class="sel-panel"
        [class.sheet]="mobile"
        [style.top.px]="mobile ? null : pos.top"
        [style.left.px]="mobile ? null : pos.left"
        [style.minWidth.px]="mobile ? null : pos.width"
      >
        @if (comBusca()) {
          <input
            #campoBusca
            class="sel-busca"
            type="text"
            placeholder="Buscar..."
            [value]="busca"
            (input)="aoBuscar($any($event.target).value)"
            (keydown)="tecla($event)"
            aria-label="Buscar na lista"
          />
        }
        <ul class="sel-lista" role="listbox">
          @for (o of visiveis(); track o.valor; let i = $index) {
            <li
              role="option"
              [attr.aria-selected]="o.valor === valor"
              class="sel-op"
              [class.ativa]="i === ativo"
              [class.sel]="o.valor === valor"
              (mouseenter)="ativo = i"
              (mousedown)="$event.preventDefault()"
              (click)="escolher(o)"
            >
              <span>{{ o.rot }}</span>
              @if (o.valor === valor) {
                <svg class="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              }
            </li>
          }
          @if (!visiveis().length) {
            <li class="sel-vazio mut small">Nada encontrado.</li>
          }
        </ul>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
      }
      .sel-trigger {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-family: inherit;
        font-size: 14px;
        color: var(--tinta);
        background: #fff;
        border: 1px solid var(--borda);
        border-radius: 10px;
        padding: 10px 12px;
        cursor: pointer;
        text-align: left;
      }
      .sel-trigger:focus-visible {
        outline: none;
        border-color: var(--roxo);
        box-shadow: 0 0 0 3px rgba(110, 75, 255, 0.15);
      }
      .sel-trigger.sm {
        padding: 6px 10px;
        font-size: 13px;
      }
      .sel-trigger:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .sel-rot {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .sel-rot.ph {
        color: var(--mut);
      }
      .chev {
        width: 16px;
        height: 16px;
        color: var(--mut);
        flex-shrink: 0;
      }
      /* Cores de status (mesma paleta do sistema) */
      .sel-trigger[data-cls='ok'] { color: var(--ok); background: var(--ok-bg); border-color: transparent; font-weight: 600; }
      .sel-trigger[data-cls='info'] { color: var(--info); background: var(--info-bg); border-color: transparent; font-weight: 600; }
      .sel-trigger[data-cls='warn'] { color: var(--warn); background: var(--warn-bg); border-color: transparent; font-weight: 600; }
      .sel-trigger[data-cls='bad'] { color: var(--bad); background: var(--bad-bg); border-color: transparent; font-weight: 600; }
      .sel-trigger[data-cls] .chev { color: currentColor; }

      .sel-panel {
        position: fixed;
        z-index: 130;
        padding: 6px;
        background: #fff;
        border: 1px solid var(--borda);
        border-radius: 12px;
        box-shadow: var(--shadow-lg);
        display: flex;
        flex-direction: column;
      }
      .sel-lista {
        margin: 0;
        padding: 0;
        list-style: none;
        max-height: 240px;
        overflow-y: auto;
        /* Chegar na borda da lista nao pode rolar a pagina (fecharia o menu) */
        overscroll-behavior: contain;
      }
      .sel-busca {
        font-family: inherit;
        font-size: 13px;
        color: var(--tinta);
        border: 1px solid var(--borda);
        border-radius: 8px;
        padding: 7px 10px;
        margin-bottom: 6px;
        outline: none;
      }
      .sel-busca:focus {
        border-color: var(--roxo);
        box-shadow: 0 0 0 3px rgba(110, 75, 255, 0.15);
      }
      .sel-vazio {
        padding: 10px;
        text-align: center;
      }
      .sel-op {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        color: var(--tinta);
      }
      .sel-op.ativa {
        background: rgba(110, 75, 255, 0.09);
      }
      .sel-op.sel {
        color: var(--roxo);
        font-weight: 600;
      }
      .ck {
        width: 16px;
        height: 16px;
        color: var(--roxo);
        flex-shrink: 0;
      }
      /* Bottom-sheet no celular */
      .sheet-bd {
        position: fixed;
        inset: 0;
        background: rgba(23, 22, 43, 0.35);
        z-index: 129;
      }
      .sel-panel.sheet {
        left: 0 !important;
        right: 0;
        bottom: 0;
        top: auto !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: none;
        border-radius: 16px 16px 0 0;
        padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
      }
      .sel-panel.sheet .sel-lista {
        max-height: 60vh;
      }
      .sel-panel.sheet .sel-op {
        padding: 13px 12px;
        font-size: 15px;
      }
    `,
  ],
})
export class AppSelect implements ControlValueAccessor {
  private host = inject(ElementRef<HTMLElement>);

  @Input() opcoes: OpcaoSelect[] = [];
  @Input() placeholder = 'Selecione';
  @Input() ariaLabel = '';
  @Input() compacto = false;
  @Input() triggerCls: string | null = null;

  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('campoBusca') campoBusca?: ElementRef<HTMLInputElement>;

  valor: any = null;
  aberto = false;
  ativo = -1;
  disabled = false;
  mobile = false;
  pos = { top: 0, left: 0, width: 0 };
  /** Filtro digitado no campo de busca (listas longas). */
  busca = '';

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: any): void {
    this.valor = v;
  }
  registerOnChange(fn: (v: any) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.disabled = d;
  }

  temValor(): boolean {
    return this.opcoes.some((o) => o.valor === this.valor);
  }
  rotuloAtual(): string {
    return this.opcoes.find((o) => o.valor === this.valor)?.rot ?? this.placeholder;
  }

  /** Listas longas ganham um campo de busca dentro do menu. */
  comBusca(): boolean {
    return this.opcoes.length > 8;
  }

  /** Opcoes visiveis apos o filtro da busca. */
  visiveis(): OpcaoSelect[] {
    const filtro = this.busca.toLowerCase().trim();
    if (!filtro) return this.opcoes;
    return this.opcoes.filter((o) => o.rot.toLowerCase().includes(filtro));
  }

  aoBuscar(texto: string) {
    this.busca = texto;
    this.ativo = 0;
  }

  alternar() {
    if (this.disabled) return;
    this.aberto ? this.fechar() : this.abrir();
  }
  abrir() {
    this.mobile = window.innerWidth <= 640;
    const el = this.trigger?.nativeElement;
    if (el && !this.mobile) {
      const r = el.getBoundingClientRect();
      this.pos = { top: r.bottom + 4, left: r.left, width: r.width };
    }
    this.busca = '';
    this.ativo = this.opcoes.findIndex((o) => o.valor === this.valor);
    this.aberto = true;
    if (this.comBusca()) {
      setTimeout(() => this.campoBusca?.nativeElement.focus());
    }
  }
  fechar() {
    this.aberto = false;
    this.busca = '';
    this.onTouched();
  }

  escolher(o: OpcaoSelect) {
    this.valor = o.valor;
    this.onChange(o.valor);
    this.fechar();
    this.trigger?.nativeElement.focus();
  }

  tecla(ev: KeyboardEvent) {
    if (!this.aberto) {
      if (['ArrowDown', 'Enter', ' '].includes(ev.key)) {
        ev.preventDefault();
        this.abrir();
      }
      return;
    }
    const lista = this.visiveis();
    if (ev.key === 'Escape') {
      ev.preventDefault();
      this.fechar();
      this.trigger?.nativeElement.focus();
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.ativo = Math.min(this.ativo + 1, lista.length - 1);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.ativo = Math.max(this.ativo - 1, 0);
    } else if (ev.key === 'Home') {
      ev.preventDefault();
      this.ativo = 0;
    } else if (ev.key === 'End') {
      ev.preventDefault();
      this.ativo = lista.length - 1;
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      if (lista[this.ativo]) this.escolher(lista[this.ativo]);
    }
    // Demais teclas seguem para o campo de busca digitar normalmente
  }

  @HostListener('document:click', ['$event'])
  aoClicarFora(ev: MouseEvent) {
    if (this.aberto && !this.host.nativeElement.contains(ev.target as Node)) {
      this.fechar();
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  aoRolar() {
    if (this.aberto) this.fechar();
  }
}
