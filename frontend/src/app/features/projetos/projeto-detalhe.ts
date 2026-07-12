import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import {
  Cliente,
  Projeto,
  ProjetoInput,
  TarefaProjeto,
} from '../../core/models';
import {
  moeda,
  progressoTarefas,
  STAGES,
  STAGE_LABEL,
  stageIndex,
  TIPOS,
  TIPO_LABEL,
  TIPO_SIGLA,
} from '../../core/utils';
import { DocumentosArea } from '../../shared/documentos/documentos-area';
import { NotasProjeto } from '../../shared/notas-projeto';
import { QuadroTarefas } from '../../shared/quadro-tarefas';
import { ConfirmService } from '../../shared/ui/confirm.service';
import { AppSelect, OpcaoSelect } from '../../shared/ui/app-select';
import { AppDatepicker } from '../../shared/ui/app-datepicker';

type Aba = 'dados' | 'tarefas' | 'notas' | 'documentos';

@Component({
  selector: 'app-projeto-detalhe',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DocumentosArea,
    NotasProjeto,
    QuadroTarefas,
    AppSelect,
    AppDatepicker,
  ],
  templateUrl: './projeto-detalhe.html',
  styleUrl: './projeto-detalhe.scss',
})
export class ProjetoDetalhe implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);
  private rota = inject(ActivatedRoute);
  private router = inject(Router);
  private confirm = inject(ConfirmService);

  projeto: Projeto | null = null;
  clientes: Cliente[] = [];
  carregando = true;
  salvando = false;

  aba: Aba = 'dados';
  abas: { valor: Aba; rot: string }[] = [
    { valor: 'dados', rot: 'Dados' },
    { valor: 'tarefas', rot: 'Tarefas' },
    { valor: 'notas', rot: 'Notas' },
    { valor: 'documentos', rot: 'Documentos' },
  ];

  stages = STAGES;
  tipos = TIPOS;
  stageLabel = STAGE_LABEL;
  tipoLabel = TIPO_LABEL;
  tipoSigla = TIPO_SIGLA;
  money = moeda;

  tiposDoc: ('contrato' | 'orcamento' | 'recibo')[] = [
    'orcamento',
    'contrato',
    'recibo',
  ];

  form: ProjetoInput = {
    cliente_id: 0,
    tipo: 'site',
    valor: 0,
    pago: 0,
    stage: 'lead',
    entrega: null,
    escopo: '',
  };

  /* Progresso das tarefas (atualizado pelo quadro sem recarregar a pagina) */
  totalTarefas = 0;
  feitasTarefas = 0;

  get id(): number {
    return Number(this.rota.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.ui.setTitulo('Projeto');
    this.api.getClientes().subscribe((c) => (this.clientes = c));
    this.api.getProjeto(this.id).subscribe({
      next: (p) => {
        this.aplicar(p);
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.router.navigate(['/projetos']);
      },
    });
  }

  private aplicar(p: Projeto) {
    this.projeto = p;
    this.totalTarefas = p.tarefas_total || 0;
    this.feitasTarefas = p.tarefas_feitas || 0;
    this.form = {
      cliente_id: p.cliente_id,
      tipo: p.tipo,
      valor: p.valor,
      pago: p.pago,
      stage: p.stage,
      entrega: p.entrega || null,
      escopo: p.escopo || '',
    };
    this.ui.setTitulo(p.cliente?.nome || 'Projeto');
  }

  clientesOpc(): OpcaoSelect[] {
    return this.clientes.map((c) => ({ valor: c.id, rot: c.nome }));
  }

  voltar() {
    this.router.navigate(['/projetos']);
  }

  /* Progresso */
  pct(): number {
    return progressoTarefas(this.feitasTarefas, this.totalTarefas);
  }

  aoMudarTarefas(tarefas: TarefaProjeto[]) {
    this.totalTarefas = tarefas.length;
    this.feitasTarefas = tarefas.filter((t) => t.coluna === 'concluido').length;
    if (this.projeto) {
      this.projeto.tarefas_total = this.totalTarefas;
      this.projeto.tarefas_feitas = this.feitasTarefas;
    }
  }

  /* Stepper de estagio (mesmo comportamento da lista) */
  stepDone(i: number): boolean {
    return this.projeto ? i <= stageIndex(this.projeto.stage) : false;
  }
  stepAtual(i: number): boolean {
    return this.projeto ? i === stageIndex(this.projeto.stage) : false;
  }

  async clicarEstagio(i: number) {
    const p = this.projeto;
    if (!p) return;
    const atualIdx = stageIndex(p.stage);
    if (i === atualIdx) return;
    const alvo = this.stages[i].valor;
    if (i < atualIdx) {
      const ok = await this.confirm.ask({
        title: 'Voltar etapa do projeto',
        message: `Voltar este projeto para "${this.stageLabel[alvo]}"?`,
        confirmText: 'Voltar etapa',
        cancelText: 'Cancelar',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.api.patchStage(p.id, alvo).subscribe((atual) => {
      p.stage = atual.stage;
      this.form.stage = atual.stage;
    });
  }

  /* Dados */
  salvar() {
    if (!this.form.cliente_id) return;
    this.salvando = true;
    const payload: ProjetoInput = {
      ...this.form,
      valor: Number(this.form.valor) || 0,
      pago: Number(this.form.pago) || 0,
      entrega: this.form.entrega || null,
    };
    this.api.atualizarProjeto(this.id, payload).subscribe({
      next: (p) => {
        this.salvando = false;
        this.aplicar(p);
      },
      error: () => (this.salvando = false),
    });
  }

  async excluir() {
    const ok = await this.confirm.ask({
      title: 'Excluir projeto',
      message: 'Excluir este projeto? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.excluirProjeto(this.id).subscribe(() => this.voltar());
  }
}
