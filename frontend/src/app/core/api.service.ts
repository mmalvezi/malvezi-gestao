import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  Cliente,
  ClienteInput,
  Dashboard,
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
  excluirRecorrencia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/recorrencias/${id}`);
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
