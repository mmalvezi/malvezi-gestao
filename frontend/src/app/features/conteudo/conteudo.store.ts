import { Injectable, computed, inject, signal } from '@angular/core';

import { CONTEUDO_DATA } from './conteudo.data';
import {
  PILAR_META,
  POSTS_INICIAIS,
  Pilar,
  Post,
  PostInput,
  StatusPost,
  hojeIso,
  proximoStatus,
} from './conteudo.models';

/**
 * Fonte única do módulo de conteúdo. Todas as telas leem os mesmos signals,
 * então mexer na fila atualiza calendário e equilíbrio de pilares na hora.
 */
@Injectable({ providedIn: 'root' })
export class ConteudoStore {
  private data = inject(CONTEUDO_DATA);
  private carregado = false;

  posts = signal<Post[]>([]);

  pendentes = computed(() =>
    this.posts().filter((p) => p.status !== 'publicado'),
  );
  publicados = computed(() =>
    this.posts().filter((p) => p.status === 'publicado'),
  );
  prontos = computed(() => this.posts().filter((p) => p.status === 'aprovado'));

  /** Quantos dos próximos 8 trazem convite. O plano permite no máximo 2. */
  vendemNosProximos8 = computed(
    () => this.pendentes().slice(0, 8).filter((p) => p.vende).length,
  );

  /** Contagem por pilar dentro dos próximos 8, para comparar com a meta. */
  equilibrio = computed(() => {
    const oito = this.pendentes().slice(0, 8);
    const fora: Record<string, number> = {};
    for (const p of oito) fora[p.pilar] = (fora[p.pilar] || 0) + 1;
    return (Object.keys(PILAR_META) as Pilar[]).map((pilar) => ({
      pilar,
      tem: fora[pilar] || 0,
      meta: PILAR_META[pilar],
    }));
  });

  carregar() {
    if (this.carregado) return;
    this.carregado = true;
    const salvos = this.data.lerPosts();
    if (salvos.length || this.data.jaSemeou()) {
      this.posts.set(salvos);
      return;
    }
    this.semear();
  }

  /** Primeira abertura: entra o plano dos 8, na ordem de publicação. */
  private semear() {
    const agora = new Date().toISOString();
    const lista: Post[] = POSTS_INICIAIS.map((base) => ({
      ...base,
      id: crypto.randomUUID(),
      status: 'ideia' as StatusPost,
      observacoes: '',
      criadoEm: agora,
      atualizadoEm: agora,
    }));
    this.data.marcarSemeado();
    this.persistir(lista);
  }

  private persistir(lista: Post[]) {
    this.posts.set(lista);
    this.data.gravarPosts(lista);
  }

  salvar(input: PostInput, id?: string): Post {
    const agora = new Date().toISOString();
    const lista = [...this.posts()];
    const i = id ? lista.findIndex((p) => p.id === id) : -1;
    if (i >= 0) {
      lista[i] = { ...lista[i], ...input, atualizadoEm: agora };
      this.persistir(lista);
      return lista[i];
    }
    const novo: Post = {
      ...input,
      id: crypto.randomUUID(),
      status: 'ideia',
      criadoEm: agora,
      atualizadoEm: agora,
    };
    this.persistir([...lista, novo]);
    return novo;
  }

  avancar(id: string): boolean {
    const lista = [...this.posts()];
    const i = lista.findIndex((p) => p.id === id);
    if (i < 0) return false;
    const prox = proximoStatus(lista[i].status);
    if (!prox) return false;
    lista[i] = {
      ...lista[i],
      status: prox,
      atualizadoEm: new Date().toISOString(),
      publicadoEm: prox === 'publicado' ? hojeIso() : lista[i].publicadoEm,
    };
    this.persistir(lista);
    return true;
  }

  voltar(id: string): boolean {
    const lista = [...this.posts()];
    const i = lista.findIndex((p) => p.id === id);
    if (i < 0) return false;
    const ordem: StatusPost[] = ['ideia', 'texto', 'arte', 'aprovado', 'publicado'];
    const atual = ordem.indexOf(lista[i].status);
    if (atual <= 0) return false;
    lista[i] = {
      ...lista[i],
      status: ordem[atual - 1],
      publicadoEm: undefined,
      atualizadoEm: new Date().toISOString(),
    };
    this.persistir(lista);
    return true;
  }

  /** Reordena a fila: a ordem da lista é a ordem de publicação. */
  mover(id: string, direcao: -1 | 1) {
    const lista = [...this.posts()];
    const i = lista.findIndex((p) => p.id === id);
    const j = i + direcao;
    if (i < 0 || j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    this.persistir(lista);
  }

  excluir(id: string) {
    this.persistir(this.posts().filter((p) => p.id !== id));
  }

  backupJson(): string {
    return JSON.stringify(
      { exportadoEm: new Date().toISOString(), posts: this.posts() },
      null,
      2,
    );
  }
}
