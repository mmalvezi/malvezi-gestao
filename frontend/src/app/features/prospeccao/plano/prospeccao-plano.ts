import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { UiState } from '../../../core/ui-state';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { ProspeccaoTabs } from '../prospeccao-tabs';
import { hojeIso, semanaAtualIso } from '../prospeccao.models';
import { PlanoStore } from './plano.store';
import {
  BlocoRotina,
  CategoriaAlvo,
  FonteBusca,
  ItemChecklist,
  MetricaFunil,
} from './plano.models';

interface Marcador {
  letra: string;
  dia: number;
  feito: boolean;
  hoje: boolean;
}

type StatusMetrica = 'sem' | 'abaixo' | 'dentro' | 'acima';

@Component({
  selector: 'app-prospeccao-plano',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProspeccaoTabs],
  templateUrl: './prospeccao-plano.html',
  styleUrl: './prospeccao-plano.scss',
})
export class ProspeccaoPlano implements OnInit {
  store = inject(PlanoStore);
  private ui = inject(UiState);
  private confirm = inject(ConfirmService);

  novaCidade = '';
  partidaExpandida = false;

  ngOnInit() {
    this.ui.setTitulo('Prospecção');
    this.store.carregar();
  }

  /* --- Hoje --- */

  private diaHoje(): number {
    return new Date().getDay(); // dom=0, seg=1 … sáb=6
  }

  blocoHoje(): BlocoRotina | null {
    const d = this.diaHoje();
    return this.store.plano().rotina.find((b) => b.dia === d) || null;
  }

  concluidoHoje(): boolean {
    return this.blocoHoje()?.concluidoEm === hojeIso();
  }

  concluirHoje() {
    const bloco = this.blocoHoje();
    if (!bloco || this.concluidoHoje()) return;
    this.store.atualizar((p) => ({
      ...p,
      rotina: p.rotina.map((b) =>
        b.dia === bloco.dia ? { ...b, concluidoEm: hojeIso() } : b,
      ),
    }));
  }

  /** Pra onde o bloco de hoje aponta (integração somente navegação). */
  linkDoDia(): { rota: string; rotulo: string } {
    switch (this.diaHoje()) {
      case 1:
        return { rota: '/prospeccao/pipeline', rotulo: 'Abrir pipeline' };
      case 2:
      case 3:
        return { rota: '/prospeccao/modelos', rotulo: 'Abrir modelos de email' };
      case 4:
        return { rota: '/prospeccao', rotulo: 'Ver ações de hoje' };
      default:
        return { rota: '/prospeccao', rotulo: 'Abrir painel' };
    }
  }

  marcadores(): Marcador[] {
    const [seg, dom] = semanaAtualIso();
    const letras = ['S', 'T', 'Q', 'Q', 'S'];
    const hoje = this.diaHoje();
    return this.store.plano().rotina.map((b, i) => ({
      letra: letras[i],
      dia: b.dia,
      feito: !!b.concluidoEm && b.concluidoEm >= seg && b.concluidoEm <= dom,
      hoje: b.dia === hoje,
    }));
  }

  /* --- Checklist de partida --- */

  partidaCompleta(): boolean {
    const l = this.store.plano().checklistPartida;
    return l.length > 0 && l.every((i) => i.feito);
  }

  alternarItem(item: ItemChecklist) {
    this.store.atualizar((p) => ({
      ...p,
      checklistPartida: p.checklistPartida.map((i) =>
        i.id === item.id ? { ...i, feito: !i.feito } : i,
      ),
    }));
  }

  /* --- Região (cidades) --- */

  addCidade() {
    const nome = this.novaCidade.trim();
    if (!nome) return;
    this.store.atualizar((p) =>
      p.cidades.some((c) => c.toLowerCase() === nome.toLowerCase())
        ? p
        : { ...p, cidades: [...p.cidades, nome] },
    );
    this.novaCidade = '';
  }

  removerCidade(cidade: string) {
    this.store.atualizar((p) => ({
      ...p,
      cidades: p.cidades.filter((c) => c !== cidade),
    }));
  }

  /* --- Categorias-alvo --- */

  emailsDe(c: CategoriaAlvo): number {
    return this.store.emailsDe(c);
  }

  alertaSemResposta(c: CategoriaAlvo): boolean {
    return this.emailsDe(c) >= 30 && c.respostas === 0;
  }

  private mudarCategoria(id: string, mud: Partial<CategoriaAlvo>) {
    this.store.atualizar((p) => ({
      ...p,
      categorias: p.categorias.map((c) => (c.id === id ? { ...c, ...mud } : c)),
    }));
  }

  setNomeCategoria(c: CategoriaAlvo, nome: string) {
    if (nome.trim()) this.mudarCategoria(c.id, { nome: nome.trim() });
  }

  setDor(c: CategoriaAlvo, dor: string) {
    this.mudarCategoria(c.id, { dorTipica: dor.trim() });
  }

  alternarAtiva(c: CategoriaAlvo) {
    this.mudarCategoria(c.id, { ativa: !c.ativa });
  }

  mudarRespostas(c: CategoriaAlvo, delta: number) {
    this.mudarCategoria(c.id, {
      respostas: Math.max(0, Number(c.respostas || 0) + delta),
    });
  }

  addCategoria() {
    this.store.atualizar((p) => ({
      ...p,
      categorias: [
        ...p.categorias,
        {
          id: crypto.randomUUID(),
          nome: 'Nova categoria',
          dorTipica: '',
          ativa: true,
          respostas: 0,
        },
      ],
    }));
  }

  async removerCategoria(c: CategoriaAlvo) {
    const ok = await this.confirm.ask({
      title: 'Remover categoria',
      message: `Remover "${c.nome}" do plano?`,
      confirmText: 'Remover',
      tone: 'danger',
    });
    if (!ok) return;
    this.store.atualizar((p) => ({
      ...p,
      categorias: p.categorias.filter((x) => x.id !== c.id),
    }));
  }

  /* --- Fontes de busca --- */

  totalColetadas(): number {
    return this.store
      .plano()
      .fontes.reduce((s, f) => s + Number(f.empresasColetadas || 0), 0);
  }

  mudarColetadas(f: FonteBusca, delta: number) {
    this.store.atualizar((p) => ({
      ...p,
      fontes: p.fontes.map((x) =>
        x.id === f.id
          ? {
              ...x,
              empresasColetadas: Math.max(
                0,
                Number(x.empresasColetadas || 0) + delta,
              ),
            }
          : x,
      ),
    }));
  }

  setDescricaoFonte(f: FonteBusca, descricao: string) {
    this.store.atualizar((p) => ({
      ...p,
      fontes: p.fontes.map((x) => (x.id === f.id ? { ...x, descricao } : x)),
    }));
  }

  /* --- Métricas do funil --- */

  ehCalculada(m: MetricaFunil): boolean {
    return this.store.valorCalculado(m.id) !== null;
  }

  valor(m: MetricaFunil): number | null {
    const calc = this.store.valorCalculado(m.id);
    if (calc !== null) return calc;
    return m.valorManual ?? null;
  }

  statusMetrica(m: MetricaFunil): StatusMetrica {
    const v = this.valor(m);
    if (v === null) return 'sem';
    if (v < m.faixaMin) return 'abaixo';
    if (v > m.faixaMax) return 'acima';
    return 'dentro';
  }

  setManual(m: MetricaFunil, texto: string) {
    const v = texto === '' ? undefined : Math.max(0, Number(texto));
    this.store.atualizar((p) => ({
      ...p,
      metricas: p.metricas.map((x) =>
        x.id === m.id ? { ...x, valorManual: v } : x,
      ),
    }));
  }
}
