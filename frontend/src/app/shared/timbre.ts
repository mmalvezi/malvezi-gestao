import { Component, Input } from '@angular/core';
import { BrandMark } from './brand-mark';

@Component({
  selector: 'app-timbre',
  standalone: true,
  imports: [BrandMark],
  template: `
    <div class="doc-sheet">
      <div class="doc-regua"></div>
      <div class="doc-head">
        <app-brand-mark [size]="34" [lockup]="true"></app-brand-mark>
        <div style="text-align:right">
          <div class="doc-titulo">{{ titulo }}</div>
          @if (linha1) {
            <div class="doc-sub">{{ linha1 }}</div>
          }
          @if (linha2) {
            <div class="doc-sub">{{ linha2 }}</div>
          }
        </div>
      </div>

      <div class="doc-corpo">
        <ng-content></ng-content>
      </div>

      <div class="doc-foot">
        <span>Malvezi Sistemas e Automação</span>
        <span>malvezi.com.br</span>
      </div>
    </div>
  `,
})
export class Timbre {
  @Input() titulo = '';
  @Input() linha1 = '';
  @Input() linha2 = '';
}
