import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { UiState } from '../../../core/ui-state';
import { dataBr } from '../../../core/utils';
import { AppDatepicker } from '../../../shared/ui/app-datepicker';
import { ProspeccaoTabs } from '../prospeccao-tabs';
import { ProspeccaoStore } from '../prospeccao.store';
import { MetasProspeccao } from '../prospeccao.models';

@Component({
  selector: 'app-prospeccao-metas',
  standalone: true,
  imports: [CommonModule, FormsModule, AppDatepicker, ProspeccaoTabs],
  templateUrl: './prospeccao-metas.html',
})
export class ProspeccaoMetas implements OnInit {
  store = inject(ProspeccaoStore);
  private ui = inject(UiState);

  dataBr = dataBr;
  form: MetasProspeccao = { ...this.store.metas() };
  salvo = false;

  ngOnInit() {
    this.ui.setTitulo('Prospecção');
    this.store.carregar();
    this.form = { ...this.store.metas() };
  }

  valido(): boolean {
    return (
      Number(this.form.metaMrr) > 0 &&
      !!this.form.prazoFinal &&
      Number(this.form.emailsPorSemana) > 0
    );
  }

  salvar() {
    if (!this.valido()) return;
    this.store.salvarMetas({
      ...this.form,
      metaMrr: Number(this.form.metaMrr),
      emailsPorSemana: Number(this.form.emailsPorSemana),
    });
    this.salvo = true;
    setTimeout(() => (this.salvo = false), 2000);
  }

  exportar() {
    const blob = new Blob([this.store.backupJson()], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospeccao-backup-${this.store.metas().dataInicio}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
