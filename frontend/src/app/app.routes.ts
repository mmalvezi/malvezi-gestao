import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'painel' },
      {
        path: 'painel',
        loadComponent: () =>
          import('./features/painel/painel').then((m) => m.Painel),
      },
      {
        path: 'projetos',
        loadComponent: () =>
          import('./features/projetos/projetos').then((m) => m.Projetos),
      },
      {
        path: 'orcamentos',
        loadComponent: () =>
          import('./features/orcamentos/orcamentos').then((m) => m.Orcamentos),
      },
      {
        path: 'mensalidades',
        loadComponent: () =>
          import('./features/recorrencia/recorrencia').then(
            (m) => m.Recorrencia,
          ),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clientes/clientes').then((m) => m.Clientes),
      },
      {
        path: 'financeiro',
        loadComponent: () =>
          import('./features/financeiro/financeiro').then((m) => m.Financeiro),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
