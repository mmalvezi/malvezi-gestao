import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/* Navegação interna do módulo de prospecção (mesmo visual dos chips de filtro) */
@Component({
  selector: 'app-prospeccao-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="chips mb-16">
      <a
        class="chip"
        routerLink="/prospeccao"
        routerLinkActive="active"
        [routerLinkActiveOptions]="{ exact: true }"
        >Painel</a
      >
      <a class="chip" routerLink="/prospeccao/pipeline" routerLinkActive="active">Pipeline</a>
      <a class="chip" routerLink="/prospeccao/fechados" routerLinkActive="active">Fechados</a>
      <a class="chip" routerLink="/prospeccao/modelos" routerLinkActive="active">Modelos</a>
      <a class="chip" routerLink="/prospeccao/metas" routerLinkActive="active">Metas</a>
    </nav>
  `,
  styles: [
    `
      a.chip {
        display: inline-flex;
        align-items: center;
      }
      a.chip.active {
        color: #fff;
      }
    `,
  ],
})
export class ProspeccaoTabs {}
