import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AnexoResumo,
  Cliente,
  ClienteInput,
  Cobranca,
  ColunaTarefa,
  Dashboard,
  ParcelaInput,
  ParcelaProjeto,
  StatusCobranca,
  Documento,
  DocumentoInput,
  ModeloDocumento,
  Orcamento,
  OrcamentoInput,
  Projeto,
  ProjetoInput,
  NotaProjeto,
  Recorrencia,
  RecorrenciaInput,
  StageProjeto,
  StatusOrcamento,
  StatusRecorrencia,
  Tarefa,
  TarefaProjeto,
  TarefaProjetoInput,
  TipoDocumento,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  /* Clientes */
  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.base}/clientes`);
  }
  criarCliente(dados: ClienteInput): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.base}/clientes`, dados);
  }
  atualizarCliente(id: number, dados: ClienteInput): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.base}/clientes/${id}`, dados);
  }
  excluirCliente(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/clientes/${id}`);
  }

  /* Projetos */
  getProjetos(): Observable<Projeto[]> {
    return this.http.get<Projeto[]>(`${this.base}/projetos`);
  }
  getProjeto(id: number): Observable<Projeto> {
    return this.http.get<Projeto>(`${this.base}/projetos/${id}`);
  }
  criarProjeto(dados: ProjetoInput): Observable<Projeto> {
    return this.http.post<Projeto>(`${this.base}/projetos`, dados);
  }
  atualizarProjeto(id: number, dados: ProjetoInput): Observable<Projeto> {
    return this.http.put<Projeto>(`${this.base}/projetos/${id}`, dados);
  }
  patchStage(id: number, stage: StageProjeto): Observable<Projeto> {
    return this.http.patch<Projeto>(`${this.base}/projetos/${id}/stage`, {
      stage,
    });
  }
  excluirProjeto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/projetos/${id}`);
  }

  /* Parcelas do projeto (o recebido vem daqui) */
  getParcelas(projetoId: number): Observable<ParcelaProjeto[]> {
    return this.http.get<ParcelaProjeto[]>(
      `${this.base}/projetos/${projetoId}/parcelas`,
    );
  }
  criarParcela(
    projetoId: number,
    dados: ParcelaInput,
  ): Observable<ParcelaProjeto> {
    return this.http.post<ParcelaProjeto>(
      `${this.base}/projetos/${projetoId}/parcelas`,
      dados,
    );
  }
  atualizarParcela(id: number, dados: ParcelaInput): Observable<ParcelaProjeto> {
    return this.http.put<ParcelaProjeto>(`${this.base}/parcelas/${id}`, dados);
  }
  pagarParcela(id: number): Observable<ParcelaProjeto> {
    return this.http.patch<ParcelaProjeto>(
      `${this.base}/parcelas/${id}/pagar`,
      {},
    );
  }
  excluirParcela(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/parcelas/${id}`);
  }

  /* Orcamentos */
  getOrcamentos(): Observable<Orcamento[]> {
    return this.http.get<Orcamento[]>(`${this.base}/orcamentos`);
  }
  criarOrcamento(dados: OrcamentoInput): Observable<Orcamento> {
    return this.http.post<Orcamento>(`${this.base}/orcamentos`, dados);
  }
  atualizarOrcamento(id: number, dados: OrcamentoInput): Observable<Orcamento> {
    return this.http.put<Orcamento>(`${this.base}/orcamentos/${id}`, dados);
  }
  patchStatusOrcamento(
    id: number,
    status: StatusOrcamento,
  ): Observable<Orcamento> {
    return this.http.patch<Orcamento>(`${this.base}/orcamentos/${id}/status`, {
      status,
    });
  }
  duplicarOrcamento(id: number): Observable<Orcamento> {
    return this.http.post<Orcamento>(
      `${this.base}/orcamentos/${id}/duplicar`,
      {},
    );
  }
  excluirOrcamento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/orcamentos/${id}`);
  }

  /* Proposta em PDF anexada ao orcamento */
  enviarAnexoOrcamento(id: number, arquivo: File): Observable<AnexoResumo> {
    const dados = new FormData();
    dados.append('arquivo', arquivo, arquivo.name);
    return this.http.post<AnexoResumo>(
      `${this.base}/orcamentos/${id}/anexo`,
      dados,
    );
  }
  /** Busca o PDF como blob (passa pelo interceptor, entao vai com o token). */
  baixarAnexoOrcamento(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/orcamentos/${id}/anexo`, {
      responseType: 'blob',
    });
  }
  excluirAnexoOrcamento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/orcamentos/${id}/anexo`);
  }

  /* Recorrencias */
  getRecorrencias(): Observable<Recorrencia[]> {
    return this.http.get<Recorrencia[]>(`${this.base}/recorrencias`);
  }
  criarRecorrencia(dados: RecorrenciaInput): Observable<Recorrencia> {
    return this.http.post<Recorrencia>(`${this.base}/recorrencias`, dados);
  }
  atualizarRecorrencia(
    id: number,
    dados: RecorrenciaInput,
  ): Observable<Recorrencia> {
    return this.http.put<Recorrencia>(`${this.base}/recorrencias/${id}`, dados);
  }
  patchStatusRecorrencia(
    id: number,
    status: StatusRecorrencia,
  ): Observable<Recorrencia> {
    return this.http.patch<Recorrencia>(
      `${this.base}/recorrencias/${id}/status`,
      { status },
    );
  }
  getRecorrenciasDoProjeto(projetoId: number): Observable<Recorrencia[]> {
    return this.http.get<Recorrencia[]>(
      `${this.base}/recorrencias/projeto/${projetoId}`,
    );
  }
  excluirRecorrencia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/recorrencias/${id}`);
  }

  /* Cobrancas das mensalidades */
  getCobrancas(filtro?: {
    status?: StatusCobranca;
    ate?: string;
  }): Observable<Cobranca[]> {
    const partes: string[] = [];
    if (filtro?.status) partes.push(`status=${filtro.status}`);
    if (filtro?.ate) partes.push(`ate=${filtro.ate}`);
    const query = partes.length ? `?${partes.join('&')}` : '';
    return this.http.get<Cobranca[]>(`${this.base}/cobrancas${query}`);
  }
  gerarCobrancas(): Observable<{ criadas: number }> {
    return this.http.post<{ criadas: number }>(
      `${this.base}/cobrancas/gerar`,
      {},
    );
  }
  pagarCobranca(id: number): Observable<Cobranca> {
    return this.http.patch<Cobranca>(`${this.base}/cobrancas/${id}/pagar`, {});
  }
  cancelarCobranca(id: number): Observable<Cobranca> {
    return this.http.patch<Cobranca>(
      `${this.base}/cobrancas/${id}/cancelar`,
      {},
    );
  }
  reabrirCobranca(id: number): Observable<Cobranca> {
    return this.http.patch<Cobranca>(`${this.base}/cobrancas/${id}/reabrir`, {});
  }

  /* Tarefas */
  getTarefas(): Observable<Tarefa[]> {
    return this.http.get<Tarefa[]>(`${this.base}/tarefas`);
  }
  criarTarefa(texto: string): Observable<Tarefa> {
    return this.http.post<Tarefa>(`${this.base}/tarefas`, { texto });
  }
  toggleTarefa(id: number): Observable<Tarefa> {
    return this.http.patch<Tarefa>(`${this.base}/tarefas/${id}/toggle`, {});
  }
  excluirTarefa(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/tarefas/${id}`);
  }

  /* Tarefas do projeto (quadro kanban interno) */
  getTarefasProjeto(projetoId: number): Observable<TarefaProjeto[]> {
    return this.http.get<TarefaProjeto[]>(
      `${this.base}/projetos/${projetoId}/tarefas`,
    );
  }
  criarTarefaProjeto(
    projetoId: number,
    dados: TarefaProjetoInput,
  ): Observable<TarefaProjeto> {
    return this.http.post<TarefaProjeto>(
      `${this.base}/projetos/${projetoId}/tarefas`,
      dados,
    );
  }
  atualizarTarefaProjeto(
    id: number,
    dados: Omit<TarefaProjetoInput, 'coluna'>,
  ): Observable<TarefaProjeto> {
    return this.http.put<TarefaProjeto>(
      `${this.base}/tarefas-projeto/${id}`,
      dados,
    );
  }
  moverTarefaProjeto(
    id: number,
    coluna: ColunaTarefa,
    ordem?: number,
  ): Observable<TarefaProjeto> {
    return this.http.patch<TarefaProjeto>(
      `${this.base}/tarefas-projeto/${id}/coluna`,
      ordem == null ? { coluna } : { coluna, ordem },
    );
  }
  excluirTarefaProjeto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/tarefas-projeto/${id}`);
  }

  /* Dashboard */
  getDashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.base}/dashboard`);
  }

  /* Alertas dispensados */
  getAlertasDispensados(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/alertas/dispensados`);
  }
  dispensarAlerta(chave: string): Observable<{ chave: string }> {
    return this.http.post<{ chave: string }>(
      `${this.base}/alertas/dispensados`,
      { chave },
    );
  }
  reexibirAlerta(chave: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/alertas/dispensados?chave=${encodeURIComponent(chave)}`,
    );
  }

  /* Modelos de documento */
  getModelos(): Observable<ModeloDocumento[]> {
    return this.http.get<ModeloDocumento[]>(`${this.base}/modelos`);
  }
  getModelo(tipo: TipoDocumento): Observable<ModeloDocumento> {
    return this.http.get<ModeloDocumento>(`${this.base}/modelos/${tipo}`);
  }
  salvarModelo(
    tipo: TipoDocumento,
    dados: { titulo: string; corpo: string },
  ): Observable<ModeloDocumento> {
    return this.http.put<ModeloDocumento>(`${this.base}/modelos/${tipo}`, dados);
  }

  /* Documentos finais */
  getDocumentos(vinculo: {
    projeto_id?: number;
    orcamento_id?: number;
  }): Observable<Documento[]> {
    let params = '';
    if (vinculo.projeto_id != null) params = `?projeto_id=${vinculo.projeto_id}`;
    else if (vinculo.orcamento_id != null)
      params = `?orcamento_id=${vinculo.orcamento_id}`;
    return this.http.get<Documento[]>(`${this.base}/documentos${params}`);
  }
  getDocumento(id: number): Observable<Documento> {
    return this.http.get<Documento>(`${this.base}/documentos/${id}`);
  }
  proximoNumero(
    tipo: TipoDocumento,
    orcamento_id?: number,
  ): Observable<{ numero: string }> {
    let params = `?tipo=${tipo}`;
    if (orcamento_id != null) params += `&orcamento_id=${orcamento_id}`;
    return this.http.get<{ numero: string }>(
      `${this.base}/documentos/proximo-numero${params}`,
    );
  }
  criarDocumento(dados: DocumentoInput): Observable<Documento> {
    return this.http.post<Documento>(`${this.base}/documentos`, dados);
  }
  atualizarDocumento(
    id: number,
    dados: { titulo?: string; conteudo?: string },
  ): Observable<Documento> {
    return this.http.put<Documento>(`${this.base}/documentos/${id}`, dados);
  }
  excluirDocumento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/documentos/${id}`);
  }

  /* Notas do projeto */
  getNotas(projetoId: number): Observable<NotaProjeto[]> {
    return this.http.get<NotaProjeto[]>(
      `${this.base}/projetos/${projetoId}/notas`,
    );
  }
  criarNota(projetoId: number, texto: string): Observable<NotaProjeto> {
    return this.http.post<NotaProjeto>(
      `${this.base}/projetos/${projetoId}/notas`,
      { texto },
    );
  }
  excluirNota(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/notas/${id}`);
  }
}
