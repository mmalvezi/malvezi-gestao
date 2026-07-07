import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import { Dashboard, Tarefa } from '../../core/models';
import { moeda, STAGE_LABEL } from '../../core/utils';

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

  dash?: Dashboard;
  tarefas: Tarefa[] = [];
  carregando = true;
  novaTarefa = '';

  money = moeda;
  stageLabel = STAGE_LABEL;

  ngOnInit() {
    this.ui.setTitulo('Painel');
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

  maxFunil(): number {
    if (!this.dash) return 1;
    return Math.max(1, ...this.dash.funil.map((f) => f.count));
  }

  larguraFunil(count: number): string {
    return Math.round((count / this.maxFunil()) * 100) + '%';
  }

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
}
