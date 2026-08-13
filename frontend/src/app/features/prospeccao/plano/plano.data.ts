import { InjectionToken } from '@angular/core';

import { PlanoCaptacao } from './plano.models';

/**
 * Acesso a dados do Plano de Captação. Mesmo padrão do módulo de Prospecção:
 * localStorage por enquanto, troca-se a factory quando houver endpoint.
 */
export interface PlanoData {
  ler(): PlanoCaptacao | null;
  gravar(p: PlanoCaptacao): void;
}

const CHAVE_PLANO = 'prospeccao.plano';

class PlanoLocalStorage implements PlanoData {
  ler(): PlanoCaptacao | null {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_PLANO) || 'null');
    } catch {
      return null;
    }
  }

  gravar(p: PlanoCaptacao) {
    localStorage.setItem(CHAVE_PLANO, JSON.stringify(p));
  }
}

export const PLANO_DATA = new InjectionToken<PlanoData>('PLANO_DATA', {
  providedIn: 'root',
  factory: () => new PlanoLocalStorage(),
});
