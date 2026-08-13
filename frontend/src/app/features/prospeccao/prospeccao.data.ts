import { InjectionToken } from '@angular/core';

import { EmpresaProspeccao, MetasProspeccao } from './prospeccao.models';

/**
 * Camada de acesso a dados da prospecção. Enquanto o backend não existir,
 * a implementação usa localStorage; quando os endpoints ficarem prontos,
 * basta trocar a factory do token sem tocar nos componentes.
 */
export interface ProspeccaoData {
  lerEmpresas(): EmpresaProspeccao[];
  gravarEmpresas(lista: EmpresaProspeccao[]): void;
  lerMetas(): MetasProspeccao | null;
  gravarMetas(m: MetasProspeccao): void;
}

const CHAVE_EMPRESAS = 'prospeccao.empresas';
const CHAVE_METAS = 'prospeccao.metas';

class ProspeccaoLocalStorage implements ProspeccaoData {
  lerEmpresas(): EmpresaProspeccao[] {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_EMPRESAS) || '[]');
    } catch {
      return [];
    }
  }

  gravarEmpresas(lista: EmpresaProspeccao[]) {
    localStorage.setItem(CHAVE_EMPRESAS, JSON.stringify(lista));
  }

  lerMetas(): MetasProspeccao | null {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_METAS) || 'null');
    } catch {
      return null;
    }
  }

  gravarMetas(m: MetasProspeccao) {
    localStorage.setItem(CHAVE_METAS, JSON.stringify(m));
  }
}

export const PROSPECCAO_DATA = new InjectionToken<ProspeccaoData>(
  'PROSPECCAO_DATA',
  {
    providedIn: 'root',
    factory: () => new ProspeccaoLocalStorage(),
  },
);
