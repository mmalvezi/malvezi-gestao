import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import { AlertasStore } from '../../core/alertas.store';
import { Dashboard, Pendencia, Tarefa } from '../../core/models';
import { dataBr, moeda, STAGE_LABEL, TIPO_LABEL } from '../../core/utils';

type Bloco = 'hoje' | 'andamento' | 'dinheiro' | 'propostas';

const CHAVE_BLOCOS = 'malvezi-painel-blocos';
const LIMITE_HOJE = 6;

/**
 * Painel em blocos, na ordem de prioridade do dia: o que fazer hoje, o
 * andamento dos projetos, o dinheiro e as propostas. Cada bloco recolhe e o
 * estado fica salvo no navegador.
 */
@Component({
  selector: 'app-painel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './painel.html',
  styleUrl: './painel.scss',
})
export class Painel implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);
  private router = inject(Router);
  alertas = inject(AlertasStore);

  dash?: Dashboard;
  tarefas: Tarefa[] = [];
  carregando = true;
  novaTarefa = '';
  mostrarDispensados = false;
  mostrarTodosHoje = false;

  /** Aberto/recolhido por bloco, lembrado no navegador. */
  blocos: Record<Bloco, boolean> = {
    hoje: true,
    andamento: true,
    dinheiro: false,
    propostas: false,
  };

  money = moeda;
  data = dataBr;
  stageLabel = STAGE_LABEL;
  tipoLabel = TIPO_LABEL;

  ngOnInit() {
    this.ui.setTitulo('Painel');
    this.alertas.carregar();
    this.restaurarBlocos();
    this.carregar();
  }

  carregar() {
    this.carregando = true;
    this.api.getDashboard().subscribe({
      next: (d) => {
        this.dash = d;
        this.carregando = false;
      },
      error: () => (this.carregando = false),
    });
    this.api.getTarefas().subscribe((t) => (this.tarefas = t));
  }

  /* ---------- Blocos recolhiveis ---------- */
  private restaurarBlocos() {
    try {
      const salvo = localStorage.getItem(CHAVE_BLOCOS);
      if (salvo) this.blocos = { ...this.blocos, ...JSON.parse(salvo) };
    } catch {
      /* localStorage indisponivel: fica o padrao */
    }
  }

  alternarBloco(b: Bloco) {
    this.blocos[b] = !this.blocos[b];
    try {
      localStorage.setItem(CHAVE_BLOCOS, JSON.stringify(this.blocos));
    } catch {
      /* sem persistencia, sem drama */
    }
  }

  /* ---------- Bloco Para hoje ---------- */
  /** Pendencias visiveis, das mais urgentes para as demais. */
  pendenciasOrdenadas(): Pendencia[] {
    if (!this.dash) return [];
    const visiveis = this.dash.pendencias.filter(
      (p) => !this.alertas.dispensado(p.chave),
    );
    return [...visiveis].sort((a, b) => this.urgencia(a) - this.urgencia(b));
  }

  /** 0 = vencido/atrasado, 1 = vencendo, 2 = resto (ordem estavel). */
  private urgencia(p: Pendencia): number {
    const motivo = p.chave.split(':')[2] || '';
    if (motivo === 'vencida' || motivo === 'atrasada') return 0;
    if (motivo === 'a_vencer' || motivo === 'proxima') return 1;
    return 2;
  }

  urgente(p: Pendencia): boolean {
    return this.urgencia(p) === 0;
  }

  lembretesAbertos(): Tarefa[] {
    return this.tarefas.filter((t) => !t.done);
  }

  totalHoje(): number {
    return this.pendenciasOrdenadas().length + this.lembretesAbertos().length;
  }

  /** Pendencias exibidas (limitadas ate o "ver todos"). */
  pendenciasExibidas(): Pendencia[] {
    const todas = this.pendenciasOrdenadas();
    return this.mostrarTodosHoje ? todas : todas.slice(0, LIMITE_HOJE);
  }

  /** Lembretes exibidos: entram no que sobrar do limite. */
  lembretesExibidos(): Tarefa[] {
    const abertos = this.lembretesAbertos();
    if (this.mostrarTodosHoje) return abertos;
    const vagas = Math.max(0, LIMITE_HOJE - this.pendenciasOrdenadas().length);
    return abertos.slice(0, vagas);
  }

  ocultosHoje(): number {
    return (
      this.totalHoje() -
      this.pendenciasExibidas().length -
      this.lembretesExibidos().length
    );
  }

  pendenciasDispensadas(): Pendencia[] {
    if (!this.dash) return [];
    return this.dash.pendencias.filter((p) => this.alertas.dispensado(p.chave));
  }

  abrirPendencia(p: Pendencia) {
    if (p.link) this.router.navigateByUrl(p.link);
  }

  /* Lembretes */
  adicionar() {
    const texto = this.novaTarefa.trim();
    if (!texto) return;
    this.api.criarTarefa(texto).subscribe((t) => {
      this.tarefas.unshift(t);
      this.novaTarefa = '';
    });
  }

  alternar(t: Tarefa) {
    this.api.toggleTarefa(t.id).subscribe((atualizada) => {
      t.done = atualizada.done;
    });
  }

  remover(t: Tarefa) {
    this.api.excluirTarefa(t.id).subscribe(() => {
      this.tarefas = this.tarefas.filter((x) => x.id !== t.id);
    });
  }

  /* ---------- Bloco Andamento ---------- */
  irFunil(stage: string) {
    this.router.navigate(['/projetos'], { queryParams: { filtro: stage } });
  }

  abrirProjeto(id: number) {
    this.router.navigate(['/projetos', id]);
  }

  /* ---------- Navegacao geral ---------- */
  ir(rota: string, params?: Record<string, string>) {
    this.router.navigate([rota], params ? { queryParams: params } : {});
  }
}
