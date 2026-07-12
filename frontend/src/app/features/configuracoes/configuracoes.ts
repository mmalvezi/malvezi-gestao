import { Component, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { UiState } from '../../core/ui-state';
import { ModeloDocumento, TipoDocumento } from '../../core/models';
import { dataBr } from '../../core/utils';
import { preencherCorpo, DadosDoc } from '../../core/preencher';
import { imprimirDocumento } from '../../core/imprimir';
import { EditorCorpo } from '../../shared/editor-corpo';
import { Timbre } from '../../shared/timbre';
import { ModelosTarefa } from './modelos-tarefa';
import { ChecklistVerificacao } from './checklist-verificacao';

type AbaCfg = 'contrato' | 'tarefas' | 'checklist';

const MARCADORES: Record<TipoDocumento, string[]> = {
  contrato: [
    'data', 'cliente', 'empresa', 'contato', 'numero', 'tipo', 'escopo',
    'valor', 'pagamento', 'prazo', 'entrega', 'cidade_sede', 'foro',
  ],
  orcamento: [
    'data', 'cliente', 'empresa', 'contato', 'numero', 'titulo', 'tipo',
    'itens', 'subtotal', 'desconto', 'total', 'pagamento', 'prazo',
    'validade', 'obs',
  ],
  recibo: ['data', 'cliente', 'empresa', 'contato', 'numero', 'valor', 'referente'],
};

const CAB: Record<TipoDocumento, { titulo: string; sub: string; label: string }> = {
  contrato: { titulo: 'Contrato', sub: 'Prestação de serviços', label: 'Contrato' },
  orcamento: { titulo: 'Orçamento', sub: '', label: 'Orçamento' },
  recibo: { titulo: 'Recibo', sub: 'Pagamento', label: 'Recibo' },
};

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EditorCorpo,
    Timbre,
    ModelosTarefa,
    ChecklistVerificacao,
  ],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.scss',
})
export class Configuracoes implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiState);

  @ViewChild(EditorCorpo) editor?: EditorCorpo;

  aba: AbaCfg = 'contrato';
  abas: { valor: AbaCfg; rot: string }[] = [
    { valor: 'contrato', rot: 'Modelo de contrato' },
    { valor: 'tarefas', rot: 'Modelos de tarefas' },
    { valor: 'checklist', rot: 'Checklist de verificação' },
  ];

  modelos: ModeloDocumento[] = [];
  tipoSel: TipoDocumento = 'contrato';
  titulo = '';
  corpo = '';
  carregando = true;
  salvando = false;
  salvo = false;

  // Apenas o contrato usa modelo editavel; orcamento e recibo sao automaticos.
  tipos: TipoDocumento[] = ['contrato'];
  cab = CAB;

  /* Preview */
  previewAberto = false;
  previewHtml = '';

  ngOnInit() {
    this.ui.setTitulo('Configurações');
    this.api.getModelos().subscribe({
      next: (m) => {
        this.modelos = m;
        this.carregando = false;
        this.selecionar('contrato');
      },
      error: () => (this.carregando = false),
    });
  }

  marcadores(): string[] {
    return MARCADORES[this.tipoSel];
  }

  rotuloMarc(m: string): string {
    return '{{' + m + '}}';
  }

  selecionar(tipo: TipoDocumento) {
    this.tipoSel = tipo;
    this.salvo = false;
    const m = this.modelos.find((x) => x.tipo === tipo);
    this.titulo = m?.titulo || '';
    this.corpo = m?.corpo || '';
    // Atualiza o editor (se ja montado)
    setTimeout(() => this.editor?.setHtml(this.corpo));
  }

  inserir(marcador: string) {
    this.editor?.inserir(`{{${marcador}}}`);
  }

  salvar() {
    this.salvando = true;
    this.salvo = false;
    this.api.salvarModelo(this.tipoSel, { titulo: this.titulo, corpo: this.corpo }).subscribe({
      next: (m) => {
        this.salvando = false;
        this.salvo = true;
        const i = this.modelos.findIndex((x) => x.tipo === m.tipo);
        if (i >= 0) this.modelos[i] = m;
      },
      error: () => (this.salvando = false),
    });
  }

  private dadosExemplo(): DadosDoc {
    const hoje = new Date();
    const entrega = new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());
    const numero =
      this.tipoSel === 'contrato' ? 'CT-0001' : this.tipoSel === 'recibo' ? 'RC-0001' : 'ORC-0001';
    return {
      data: hoje.toISOString(),
      cliente: 'Cliente Exemplo',
      empresa: 'Empresa Exemplo Ltda',
      contato: '(11) 90000-0000',
      numero,
      tipo: 'Site',
      escopo: 'Site institucional com catálogo',
      valor: this.tipoSel === 'recibo' ? 2500 : 5000,
      pagamento: '50% de entrada e 50% na entrega',
      prazo: '30 dias',
      entrega: entrega.toISOString(),
      cidade_sede: 'Cabreúva',
      foro: 'comarca de Jundiaí',
      titulo: 'Site institucional',
      itens: [
        { titulo: 'Layout e identidade', descricao: 'Design das páginas principais', valor: 1800 },
        { titulo: 'Desenvolvimento', descricao: 'Site responsivo', valor: 2800 },
      ],
      desconto: 200,
      validade: 15,
      obs: 'Inclui domínio no primeiro ano.',
    };
  }

  verExemplo() {
    this.previewHtml = preencherCorpo(this.corpo, this.dadosExemplo());
    this.previewAberto = true;
  }

  get previewTitulo() {
    return CAB[this.tipoSel].titulo;
  }
  get previewLinha1() {
    const c = CAB[this.tipoSel];
    return this.tipoSel === 'orcamento' ? this.dadosExemplo().numero || '' : c.sub;
  }
  get previewLinha2() {
    const d = dataBr(new Date().toISOString());
    return this.tipoSel === 'orcamento' ? 'Emitido em ' + d : d;
  }

  imprimirExemplo() {
    imprimirDocumento();
  }
}
