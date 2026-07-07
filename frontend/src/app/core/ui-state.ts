import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiState {
  /* Titulo da area mostrado na barra de topo */
  titulo = signal('Painel');
  /* Texto de busca global (usado por Projetos, Orcamentos e Clientes) */
  busca = signal('');

  setTitulo(t: string) {
    this.titulo.set(t);
  }
}
