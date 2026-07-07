import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import { Cliente, ClienteInput } from '../../core/models';
import { moeda } from '../../core/utils';
import { Dialog } from '../../shared/dialog';

interface LinhaCliente {
  cliente: Cliente;
  projetos: number;
  gerado: number;
  porMes: number;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog],
  templateUrl: './clientes.html',
  styles: [
    `
      .cli {
        cursor: pointer;
        transition: transform 0.08s ease, box-shadow 0.15s ease;
      }
      .cli:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
      }
      .mini-kpis {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        padding-top: 14px;
        border-top: 1px solid var(--borda);
      }
      .min0 {
        min-width: 0;
      }
      .trunc {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
})
export class Clientes implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);
  private router = inject(Router);

  linhas: LinhaCliente[] = [];
  carregando = true;
  money = moeda;

  editorAberto = false;
  editId: number | null = null;
  form: ClienteInput = { nome: '', empresa: '', contato: '' };
  salvando = false;

  ngOnInit() {
    this.ui.setTitulo('Clientes');
    this.carregar();
  }

  carregar() {
    this.carregando = true;
    forkJoin({
      clientes: this.api.getClientes(),
      projetos: this.api.getProjetos(),
      recorrencias: this.api.getRecorrencias(),
    }).subscribe({
      next: ({ clientes, projetos, recorrencias }) => {
        this.linhas = clientes.map((c) => {
          const ps = projetos.filter((p) => p.cliente_id === c.id);
          const rs = recorrencias.filter(
            (r) => r.cliente_id === c.id && r.status === 'ativo',
          );
          return {
            cliente: c,
            projetos: ps.length,
            gerado: ps.reduce((s, p) => s + Number(p.valor || 0), 0),
            porMes: rs.reduce((s, r) => s + Number(r.valor || 0), 0),
          };
        });
        this.carregando = false;
      },
      error: () => (this.carregando = false),
    });
  }

  filtradas(): LinhaCliente[] {
    const busca = this.ui.busca().toLowerCase().trim();
    if (!busca) return this.linhas;
    return this.linhas.filter(
      (l) =>
        l.cliente.nome.toLowerCase().includes(busca) ||
        (l.cliente.empresa || '').toLowerCase().includes(busca),
    );
  }

  verProjetos(l: LinhaCliente) {
    this.ui.busca.set(l.cliente.nome);
    this.router.navigate(['/projetos']);
  }

  abrirNovo() {
    this.editId = null;
    this.form = { nome: '', empresa: '', contato: '' };
    this.editorAberto = true;
  }

  abrirEditar(l: LinhaCliente, ev: Event) {
    ev.stopPropagation();
    this.editId = l.cliente.id;
    this.form = {
      nome: l.cliente.nome,
      empresa: l.cliente.empresa || '',
      contato: l.cliente.contato || '',
    };
    this.editorAberto = true;
  }

  fecharEditor() {
    this.editorAberto = false;
  }

  salvar() {
    if (!this.form.nome.trim()) return;
    this.salvando = true;
    const req = this.editId
      ? this.api.atualizarCliente(this.editId, this.form)
      : this.api.criarCliente(this.form);
    req.subscribe({
      next: () => {
        this.salvando = false;
        this.editorAberto = false;
        this.carregar();
      },
      error: () => (this.salvando = false),
    });
  }

  excluir() {
    if (!this.editId) return;
    if (!confirm('Excluir este cliente? Projetos e mensalidades ligados tambem saem.'))
      return;
    this.api.excluirCliente(this.editId).subscribe(() => {
      this.editorAberto = false;
      this.carregar();
    });
  }
}
