import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UiState } from '../../../core/ui-state';
import { ProspeccaoTabs } from '../prospeccao-tabs';

interface Modelo {
  id: string;
  titulo: string;
  descricao: string;
  texto: string;
}

const MODELOS: Modelo[] = [
  {
    id: 'email',
    titulo: 'Email frio (base)',
    descricao: 'Primeiro contato. Troque os campos entre colchetes antes de enviar.',
    texto: `Assunto: Sistema sob medida para a [empresa]

Olá, [nome do contato], tudo bem?

Trabalho com desenvolvimento de sistemas sob medida e atendo negócios de [categoria] aqui da região. Conversando com empresas como a sua, o que mais escuto é [dor típica] — geralmente resolvido com um sistema simples, feito pro seu jeito de trabalhar.

Alguns trabalhos recentes: [projeto 1] e [projeto 2].

Todo projeto já inclui suporte e manutenção mensal — você não fica na mão depois da entrega.

Topa uma conversa de 15 minutos essa semana pra eu entender como funciona aí na [empresa]? Sem compromisso.

Abraço,
[seu nome]`,
  },
  {
    id: 'followup',
    titulo: 'Follow-up (D+4)',
    descricao: '4 dias depois do 1º email, se não houve resposta.',
    texto: `Assunto: Re: Sistema sob medida para a [empresa]

Olá, [nome do contato]!

Passando pra reforçar o email que mandei essa semana. Sei que a rotina aperta — se preferir, me diz um horário e eu te ligo, em 10 minutos já dá pra ver se faz sentido pra [empresa].

Abraço,
[seu nome]`,
  },
  {
    id: 'ligacao',
    titulo: 'Roteiro de ligação (D+8)',
    descricao: 'O objetivo é marcar reunião, não vender por telefone.',
    texto: `1. Abertura (10s)
"Olá, [nome do contato]? Aqui é a [seu nome]. Te mandei dois emails sobre sistema sob medida pra [empresa] — te peguei num minuto bom?"

2. Gancho (20s)
"Atendo negócios de [categoria] e o que mais vejo é [dor típica]. Queria entender rapidinho se isso acontece aí também."

3. Escuta (2 min)
Deixar falar. Anotar a dor com as palavras do cliente — vai pro campo Notas.

4. Fechamento = reunião (30s)
"Faz sentido. Melhor eu te mostrar na prática: que dia essa semana você tem 30 minutos? Te mostro algo parecido com o que a [empresa] precisa. Toda solução já inclui suporte e manutenção mensal."`,
  },
];

@Component({
  selector: 'app-prospeccao-modelos',
  standalone: true,
  imports: [CommonModule, ProspeccaoTabs],
  templateUrl: './prospeccao-modelos.html',
  styleUrl: './prospeccao-modelos.scss',
})
export class ProspeccaoModelos implements OnInit {
  private ui = inject(UiState);

  modelos = MODELOS;
  copiado = signal<string | null>(null);

  ngOnInit() {
    this.ui.setTitulo('Prospecção');
  }

  async copiar(m: Modelo) {
    await navigator.clipboard.writeText(m.texto);
    this.copiado.set(m.id);
    setTimeout(() => {
      if (this.copiado() === m.id) this.copiado.set(null);
    }, 2000);
  }
}
