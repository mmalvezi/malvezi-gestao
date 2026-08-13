import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UiState } from '../../../core/ui-state';
import { dataBr, moeda } from '../../../core/utils';
import { ProspeccaoTabs } from '../prospeccao-tabs';
import { ProspeccaoStore } from '../prospeccao.store';

@Component({
  selector: 'app-prospeccao-fechados',
  standalone: true,
  imports: [CommonModule, ProspeccaoTabs],
  templateUrl: './prospeccao-fechados.html',
})
export class ProspeccaoFechados implements OnInit {
  store = inject(ProspeccaoStore);
  private ui = inject(UiState);

  money = moeda;
  dataBr = dataBr;

  ngOnInit() {
    this.ui.setTitulo('Prospecção');
    this.store.carregar();
  }
}
