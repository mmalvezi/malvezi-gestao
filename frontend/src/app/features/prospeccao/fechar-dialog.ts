import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Dialog } from '../../shared/dialog';
import { EmpresaProspeccao } from './prospeccao.models';

/**
 * Fechamento de empresa: a mensalidade é obrigatória (> 0).
 * Não existe fechamento sem recorrência.
 */
@Component({
  selector: 'app-fechar-dialog',
  standalone: true,
  imports: [FormsModule, Dialog],
  template: `
    <app-dialog titulo="Fechar {{ empresa.nome }} 🎉" [largura]="440" (fechar)="cancelar.emit()">
      <p class="mut small" style="margin-top:0">
        Todo fechamento tem recorrência. Informe a mensalidade de suporte e
        manutenção pra concluir.
      </p>
      <div class="field">
        <label>Mensalidade (R$/mês)</label>
        <input
          class="input"
          type="number"
          min="1"
          [(ngModel)]="valor"
          name="mensalidade"
          placeholder="Ex.: 400"
          autofocus
        />
      </div>

      <div foot class="items-center" style="justify-content:flex-end;width:100%">
        <button class="btn ghost" (click)="cancelar.emit()">Cancelar</button>
        <button class="btn primary" [disabled]="!(valor > 0)" (click)="ok()">
          Fechar cliente
        </button>
      </div>
    </app-dialog>
  `,
})
export class FecharDialog {
  @Input({ required: true }) empresa!: EmpresaProspeccao;
  @Output() confirmar = new EventEmitter<number>();
  @Output() cancelar = new EventEmitter<void>();

  valor = 0;

  ngOnInit() {
    this.valor = Number(this.empresa.mensalidade || 0);
  }

  ok() {
    if (this.valor > 0) this.confirmar.emit(Number(this.valor));
  }
}
