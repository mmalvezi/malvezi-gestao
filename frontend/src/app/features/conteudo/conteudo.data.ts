import { InjectionToken } from '@angular/core';

import { Post } from './conteudo.models';

/**
 * Camada de acesso a dados do conteúdo. Mesmo desenho da prospecção: enquanto
 * o backend não existir, a implementação usa localStorage; quando os endpoints
 * ficarem prontos, basta trocar a factory do token sem tocar nos componentes.
 */
export interface ConteudoData {
  lerPosts(): Post[];
  gravarPosts(lista: Post[]): void;
  jaSemeou(): boolean;
  marcarSemeado(): void;
}

const CHAVE_POSTS = 'conteudo.posts';
const CHAVE_SEED = 'conteudo.semeado';

class ConteudoLocalStorage implements ConteudoData {
  lerPosts(): Post[] {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_POSTS) || '[]');
    } catch {
      return [];
    }
  }

  gravarPosts(lista: Post[]) {
    localStorage.setItem(CHAVE_POSTS, JSON.stringify(lista));
  }

  /**
   * A semeadura roda uma vez só. Sem esta marca, quem apagasse todos os posts
   * de propósito veria os oito voltarem no próximo carregamento.
   */
  jaSemeou(): boolean {
    return localStorage.getItem(CHAVE_SEED) === '1';
  }

  marcarSemeado() {
    localStorage.setItem(CHAVE_SEED, '1');
  }
}

export const CONTEUDO_DATA = new InjectionToken<ConteudoData>('CONTEUDO_DATA', {
  providedIn: 'root',
  factory: () => new ConteudoLocalStorage(),
});
