import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-editor-corpo',
  standalone: true,
  template: `
    <div class="editor">
      <div class="barra no-print">
        <button type="button" class="fb" (click)="cmd('bold')" title="Negrito" aria-label="Negrito"><b>N</b></button>
        <button type="button" class="fb" (click)="cmd('italic')" title="Italico" aria-label="Italico"><i>I</i></button>
        <span class="sep"></span>
        <button type="button" class="fb" (click)="bloco('H3')" title="Titulo" aria-label="Titulo">Titulo</button>
        <button type="button" class="fb" (click)="bloco('P')" title="Paragrafo" aria-label="Paragrafo">Paragrafo</button>
        <button type="button" class="fb" (click)="cmd('insertUnorderedList')" title="Lista" aria-label="Lista">Lista</button>
      </div>
      <div
        #area
        class="corpo"
        contenteditable="true"
        (input)="aoDigitar()"
        (blur)="aoDigitar()"
      ></div>
    </div>
  `,
  styles: [
    `
      .barra {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        padding: 8px;
        margin-bottom: 12px;
        background: var(--soft);
        border-radius: 10px;
      }
      .fb {
        border: 1px solid var(--borda);
        background: #fff;
        border-radius: 8px;
        min-width: 34px;
        height: 32px;
        padding: 0 10px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        color: var(--ink2);
        cursor: pointer;
      }
      .fb:hover {
        background: var(--soft);
      }
      .sep {
        width: 1px;
        height: 20px;
        background: var(--borda);
      }
      .corpo {
        outline: none;
        min-height: 120px;
        line-height: 1.55;
      }
      .corpo:focus {
        outline: none;
      }
      @media print {
        .barra {
          display: none !important;
        }
        .corpo {
          min-height: 0;
        }
      }
    `,
  ],
})
export class EditorCorpo implements AfterViewInit {
  @Input() valor = '';
  @Output() valorChange = new EventEmitter<string>();
  @ViewChild('area', { static: true }) area!: ElementRef<HTMLDivElement>;

  ngAfterViewInit() {
    this.area.nativeElement.innerHTML = this.valor || '';
  }

  /** Define o HTML do editor de fora (carregar outro documento/modelo). */
  setHtml(html: string) {
    this.area.nativeElement.innerHTML = html || '';
    this.aoDigitar();
  }

  /** Insere texto (ex.: um marcador) no ponto do cursor. */
  inserir(texto: string) {
    const el = this.area.nativeElement;
    el.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && el.contains(sel.anchorNode)) {
      document.execCommand('insertText', false, texto);
    } else {
      el.innerHTML += texto;
    }
    this.aoDigitar();
  }

  cmd(comando: string) {
    this.area.nativeElement.focus();
    document.execCommand(comando, false);
    this.aoDigitar();
  }

  bloco(tag: string) {
    this.area.nativeElement.focus();
    document.execCommand('formatBlock', false, tag);
    this.aoDigitar();
  }

  aoDigitar() {
    this.valorChange.emit(this.area.nativeElement.innerHTML);
  }
}
