import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';

import { BrandMark } from '../shared/brand-mark';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { UiState } from '../core/ui-state';

interface ItemMenu {
  rota: string;
  rot: string;
  icone: string;
  chave?: 'projetos' | 'orcamentos' | 'recorrencias' | 'clientes';
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, BrandMark],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  ui = inject(UiState);

  gaveta = false;

  contagens: Record<string, number> = {
    projetos: 0,
    orcamentos: 0,
    recorrencias: 0,
    clientes: 0,
  };

  itens: ItemMenu[] = [
    {
      rota: '/painel',
      rot: 'Painel',
      icone: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
    },
    {
      rota: '/projetos',
      rot: 'Projetos',
      chave: 'projetos',
      icone: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
    },
    {
      rota: '/orcamentos',
      rot: 'Orçamentos',
      chave: 'orcamentos',
      icone: 'M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M9 3h6v4H9zM8 12h8M8 16h5',
    },
    {
      rota: '/mensalidades',
      rot: 'Mensalidades',
      chave: 'recorrencias',
      icone: 'M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8Zm0 3h20',
    },
    {
      rota: '/clientes',
      rot: 'Clientes',
      chave: 'clientes',
      icone: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11',
    },
    {
      rota: '/financeiro',
      rot: 'Financeiro',
      icone: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    },
    {
      rota: '/configuracoes',
      rot: 'Configurações',
      icone: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.3 7.3 0 0 0-2.2-1.3L14 2h-4l-.7 2.6a7.3 7.3 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.3 7.3 0 0 0 2.2 1.3L10 22h4l.7-2.6a7.3 7.3 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.06-.42.1-.86.1-1.3Z',
    },
  ];

  ngOnInit() {
    this.carregarContagens();
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.gaveta = false;
        this.carregarContagens();
      });
  }

  cont(chave?: string): number {
    return chave ? this.contagens[chave] || 0 : 0;
  }

  carregarContagens() {
    this.api.getProjetos().subscribe((l) => (this.contagens['projetos'] = l.length));
    this.api.getOrcamentos().subscribe((l) => (this.contagens['orcamentos'] = l.length));
    this.api
      .getRecorrencias()
      .subscribe((l) => (this.contagens['recorrencias'] = l.length));
    this.api.getClientes().subscribe((l) => (this.contagens['clientes'] = l.length));
  }

  sair() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
