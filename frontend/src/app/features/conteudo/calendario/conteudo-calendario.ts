import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UiState } from '../../../core/ui-state';
import { dataBr } from '../../../core/utils';
import { ConteudoTabs } from '../conteudo-tabs';
import { ConteudoStore } from '../conteudo.store';
import {
  PILAR_LABEL,
  Post,
  STATUS_CLASSE,
  STATUS_LABEL,
} from '../conteudo.models';

interface Dia {
  iso: string;
  numero: number;
  doMes: boolean;
  hoje: boolean;
  posts: Post[];
}

/**
 * Calendário de publicação. O plano pede 2 posts por semana produzidos em
 * lote, então o que interessa aqui é enxergar buraco de semana, não agenda
 * cheia: cada semana mostra quantos posts tem e avisa quando falta.
 */
@Component({
  selector: 'app-conteudo-calendario',
  standalone: true,
  imports: [CommonModule, ConteudoTabs],
  templateUrl: './conteudo-calendario.html',
  styleUrl: './conteudo-calendario.scss',
})
export class ConteudoCalendario implements OnInit {
  store = inject(ConteudoStore);
  private ui = inject(UiState);

  dataBr = dataBr;
  statusLabel = STATUS_LABEL;
  statusClasse = STATUS_CLASSE;
  pilarLabel = PILAR_LABEL;

  /** Primeiro dia do mês exibido. */
  mes = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  nomesDia = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

  titulo = computed(() =>
    this.mes()
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      .replace(/^./, (c) => c.toUpperCase()),
  );

  /** Semanas do mês, cada uma com seus 7 dias. */
  semanas = computed<Dia[][]>(() => {
    const base = this.mes();
    const ano = base.getFullYear();
    const m = base.getMonth();
    const hojeIso = new Date().toISOString().slice(0, 10);

    // Começa na segunda-feira da semana do dia 1
    const inicio = new Date(ano, m, 1);
    const desloca = (inicio.getDay() + 6) % 7;
    inicio.setDate(inicio.getDate() - desloca);

    const porData = new Map<string, Post[]>();
    for (const p of this.store.posts()) {
      const d = p.publicadoEm || p.dataPrevista;
      if (!d) continue;
      porData.set(d, [...(porData.get(d) || []), p]);
    }

    const semanas: Dia[][] = [];
    const cursor = new Date(inicio);
    for (let s = 0; s < 6; s++) {
      const semana: Dia[] = [];
      for (let d = 0; d < 7; d++) {
        const iso = this.iso(cursor);
        semana.push({
          iso,
          numero: cursor.getDate(),
          doMes: cursor.getMonth() === m,
          hoje: iso === hojeIso,
          posts: porData.get(iso) || [],
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      semanas.push(semana);
      // Para de desenhar quando a semana inteira já passou do mês
      if (semana.every((x) => !x.doMes) && s >= 4) {
        semanas.pop();
        break;
      }
    }
    return semanas;
  });

  /** Posts na fila que ainda não têm data: o que trava o lote da semana. */
  semData = computed(() =>
    this.store.pendentes().filter((p) => !p.dataPrevista),
  );

  ngOnInit() {
    this.ui.setTitulo('Conteúdo');
    this.store.carregar();
  }

  private iso(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${dia}`;
  }

  andar(passo: -1 | 1) {
    const b = this.mes();
    this.mes.set(new Date(b.getFullYear(), b.getMonth() + passo, 1));
  }

  hojeMes() {
    const h = new Date();
    this.mes.set(new Date(h.getFullYear(), h.getMonth(), 1));
  }

  /** Quantos posts do mês corrente naquela semana, para o aviso de meta. */
  naSemana(semana: Dia[]): number {
    return semana.reduce((s, d) => s + (d.doMes ? d.posts.length : 0), 0);
  }

  temDiaDoMes(semana: Dia[]): boolean {
    return semana.some((d) => d.doMes);
  }
}
