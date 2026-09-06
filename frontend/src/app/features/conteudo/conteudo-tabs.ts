import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/* Navegação interna do módulo de conteúdo (mesmo visual da prospecção) */
@Component({
  selector: 'app-conteudo-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="chips mb-16">
      <a
        class="chip"
        routerLink="/conteudo"
        routerLinkActive="active"
        [routerLinkActiveOptions]="{ exact: true }"
        >Fila</a
      >
      <a class="chip" routerLink="/conteudo/calendario" routerLinkActive="active"
        >Calendário</a
      >
      <a class="chip" routerLink="/conteudo/pilares" routerLinkActive="active"
        >Pilares</a
      >
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
export class ConteudoTabs {}
