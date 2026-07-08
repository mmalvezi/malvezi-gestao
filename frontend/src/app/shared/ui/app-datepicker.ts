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

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface Dia {
  n: number;
  iso: string;
  hoje: boolean;
  sel: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
function iso(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

@Component({
  selector: 'app-datepicker',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppDatepicker),
      multi: true,
    },
  ],
  template: `
    <button
      #trigger
      type="button"
      class="dp-trigger"
      [disabled]="disabled"
      (click)="alternar()"
      (keydown)="tecla($event)"
      [attr.aria-label]="ariaLabel || 'Escolher data'"
    >
      <span [class.ph]="!valor">{{ valor ? textoBr() : placeholder }}</span>
      <svg class="cal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" stroke-linecap="round" />
      </svg>
    </button>

    @if (aberto && mobile) {
      <div class="sheet-bd" (click)="fechar()"></div>
    }
    @if (aberto) {
      <div
        class="dp-panel"
        [class.sheet]="mobile"
        [style.top.px]="mobile ? null : pos.top"
        [style.left.px]="mobile ? null : pos.left"
      >
        <div class="dp-topo">
          <button type="button" class="dp-nav" (click)="mudarMes(-1)" aria-label="Mes anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <span class="dp-mes">{{ nomeMes }} {{ ano }}</span>
          <button type="button" class="dp-nav" (click)="mudarMes(1)" aria-label="Proximo mes">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <div class="dp-semana">
          @for (s of semana; track $index) {
            <span>{{ s }}</span>
          }
        </div>
        <div class="dp-grade">
          @for (b of brancos; track $index) {
            <span class="dp-vazio"></span>
          }
          @for (d of dias; track d.iso) {
            <button
              type="button"
              class="dp-dia"
              [class.hoje]="d.hoje"
              [class.sel]="d.sel"
              (click)="escolher(d)"
            >
              {{ d.n }}
            </button>
          }
        </div>
        <div class="dp-rodape">
          <button type="button" class="dp-hoje" (click)="irHoje()">Hoje</button>
          @if (valor) {
            <button type="button" class="dp-limpar" (click)="limpar()">Limpar</button>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
      }
      .dp-trigger {
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
      .dp-trigger:focus-visible {
        outline: none;
        border-color: var(--roxo);
        box-shadow: 0 0 0 3px rgba(110, 75, 255, 0.15);
      }
      .dp-trigger .ph {
        color: var(--mut);
      }
      .cal {
        width: 17px;
        height: 17px;
        color: var(--mut);
        flex-shrink: 0;
      }
      .dp-panel {
        position: fixed;
        z-index: 130;
        width: 268px;
        background: #fff;
        border: 1px solid var(--borda);
        border-radius: 14px;
        box-shadow: var(--shadow-lg);
        padding: 12px;
      }
      .dp-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .dp-mes {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        font-size: 14px;
      }
      .dp-nav {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        border: 1px solid var(--borda);
        background: #fff;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--ink2);
      }
      .dp-nav:hover {
        background: var(--soft);
      }
      .dp-nav svg {
        width: 16px;
        height: 16px;
      }
      .dp-semana,
      .dp-grade {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
      }
      .dp-semana span {
        text-align: center;
        font-size: 11px;
        font-weight: 600;
        color: var(--mut);
        padding: 4px 0;
      }
      .dp-dia {
        aspect-ratio: 1;
        border: none;
        background: transparent;
        border-radius: 8px;
        font-family: inherit;
        font-size: 13px;
        color: var(--tinta);
        cursor: pointer;
      }
      .dp-dia:hover {
        background: rgba(110, 75, 255, 0.09);
      }
      .dp-dia.hoje {
        box-shadow: inset 0 0 0 1px var(--roxo);
        color: var(--roxo);
        font-weight: 700;
      }
      .dp-dia.sel {
        background: var(--grad);
        color: #fff;
        font-weight: 700;
        box-shadow: none;
      }
      .dp-rodape {
        display: flex;
        justify-content: space-between;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--borda);
      }
      .dp-hoje,
      .dp-limpar {
        border: none;
        background: transparent;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        color: var(--roxo);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 8px;
      }
      .dp-hoje:hover,
      .dp-limpar:hover {
        background: var(--soft);
      }
      .dp-limpar {
        color: var(--mut);
      }
      /* Bottom-sheet no celular */
      .sheet-bd {
        position: fixed;
        inset: 0;
        background: rgba(23, 22, 43, 0.35);
        z-index: 129;
      }
      .dp-panel.sheet {
        left: 0 !important;
        right: 0;
        bottom: 0;
        top: auto !important;
        width: 100%;
        border-radius: 18px 18px 0 0;
        padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
      }
      .dp-panel.sheet .dp-dia {
        font-size: 15px;
      }
    `,
  ],
})
export class AppDatepicker implements ControlValueAccessor {
  private host = inject(ElementRef<HTMLElement>);

  @Input() placeholder = 'dd/mm/aaaa';
  @Input() ariaLabel = '';

  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>;

  valor: string | null = null; // 'yyyy-MM-dd'
  aberto = false;
  disabled = false;
  mobile = false;
  pos = { top: 0, left: 0 };

  ano = 2026;
  mes = 0; // 0-11
  semana = SEMANA;

  private onChange: (v: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string | null): void {
    this.valor = v || null;
  }
  registerOnChange(fn: (v: string | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.disabled = d;
  }

  get nomeMes(): string {
    return MESES[this.mes];
  }

  get brancos(): number[] {
    const primeiro = new Date(this.ano, this.mes, 1).getDay(); // 0=domingo
    return Array.from({ length: primeiro });
  }

  get dias(): Dia[] {
    const total = new Date(this.ano, this.mes + 1, 0).getDate();
    const hoje = new Date();
    const lista: Dia[] = [];
    for (let n = 1; n <= total; n++) {
      const s = iso(this.ano, this.mes, n);
      lista.push({
        n,
        iso: s,
        hoje:
          hoje.getFullYear() === this.ano &&
          hoje.getMonth() === this.mes &&
          hoje.getDate() === n,
        sel: this.valor === s,
      });
    }
    return lista;
  }

  textoBr(): string {
    if (!this.valor) return '';
    const [y, m, d] = this.valor.split('-');
    return `${d}/${m}/${y}`;
  }

  alternar() {
    if (this.disabled) return;
    this.aberto ? this.fechar() : this.abrir();
  }
  abrir() {
    const base = this.valor ? new Date(this.valor + 'T00:00:00') : new Date();
    this.ano = base.getFullYear();
    this.mes = base.getMonth();
    this.mobile = window.innerWidth <= 640;
    const el = this.trigger?.nativeElement;
    if (el && !this.mobile) {
      const r = el.getBoundingClientRect();
      this.pos = { top: r.bottom + 4, left: r.left };
    }
    this.aberto = true;
  }
  fechar() {
    this.aberto = false;
    this.onTouched();
  }

  mudarMes(delta: number) {
    let m = this.mes + delta;
    let a = this.ano;
    if (m < 0) {
      m = 11;
      a--;
    } else if (m > 11) {
      m = 0;
      a++;
    }
    this.mes = m;
    this.ano = a;
  }

  irHoje() {
    const h = new Date();
    this.ano = h.getFullYear();
    this.mes = h.getMonth();
  }

  escolher(d: Dia) {
    this.valor = d.iso;
    this.onChange(this.valor);
    this.fechar();
    this.trigger?.nativeElement.focus();
  }

  limpar() {
    this.valor = null;
    this.onChange(null);
    this.fechar();
  }

  tecla(ev: KeyboardEvent) {
    if (!this.aberto && ['ArrowDown', 'Enter', ' '].includes(ev.key)) {
      ev.preventDefault();
      this.abrir();
    } else if (this.aberto && ev.key === 'Escape') {
      ev.preventDefault();
      this.fechar();
    }
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
