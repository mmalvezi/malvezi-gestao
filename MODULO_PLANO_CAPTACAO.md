# Módulo: Plano de Captação (tela funcional)

> Especificação de implementação para o **gestao.malvezi.com.br**.
> Transforma o playbook `docs/PLANO_CAPTACAO.md` em uma área operacional dentro do módulo de Prospecção (`docs/MODULO_PROSPECCAO.md`).
> Escopo: **frontend**. Persistência segue o mesmo padrão do módulo de Prospecção (service atrás de interface; `localStorage` até existir endpoint).

---

## 1. Objetivo

O plano de captação deixa de ser um documento e vira uma tela de execução: rotina do dia, checklists persistentes, fontes de busca com progresso e métricas do funil comparadas às faixas saudáveis. O usuário abre a tela e sabe **o que fazer hoje** e **se a operação está saudável**.

---

## 2. Rota e navegação

| Rota | Tela |
|---|---|
| `/prospeccao/plano` | Plano de Captação |

- Adicionar aba/item **"Plano"** na navegação interna do módulo de Prospecção, entre "Painel" e "Pipeline".

---

## 3. Modelo de dados

```ts
interface PlanoCaptacao {
  cidades: string[];                 // região definida pelo usuário
  categorias: CategoriaAlvo[];
  fontes: FonteBusca[];
  rotina: BlocoRotina[];             // seg–sex
  checklistPartida: ItemChecklist[];
  metricas: MetricaFunil[];
  atualizadoEm: string;
}

interface CategoriaAlvo {
  id: string;
  nome: string;                      // ex.: "Oficinas mecânicas"
  dorTipica: string;                 // vai na 1ª linha do email
  ativa: boolean;                    // despriorizada = false
  emailsEnviados: number;            // calculado do pipeline (empresas da categoria com dataPrimeiroEmail)
  respostas: number;                 // editável manualmente nesta fase
}

interface FonteBusca {
  id: string;
  nome: string;                      // "Google Maps", "ACE/CDL", "Consulta CNPJ", "Instagram/grupos", "Rede pessoal"
  descricao: string;                 // instrução curta de uso
  empresasColetadas: number;         // contador manual (+/-)
}

interface BlocoRotina {
  dia: 1|2|3|4|5;                    // seg=1 … sex=5
  titulo: string;                    // ex.: "Garimpo"
  descricao: string;                 // ex.: "Listar 25–30 empresas novas e enriquecer 15"
  concluidoEm?: string;              // ISO date do último dia em que foi marcado
}

interface ItemChecklist {
  id: string;
  texto: string;
  feito: boolean;
}

interface MetricaFunil {
  id: string;
  nome: string;                      // ex.: "Taxa de resposta"
  faixaMin: number;                  // %
  faixaMax: number;                  // %
  valorAtual?: number;               // % — calculado quando possível, senão manual
  acaoSeAbaixo: string;              // ex.: "Reescrever assunto e 1ª linha"
}
```

**Seed inicial (primeiro uso):** popular com o conteúdo do playbook —
- 8 categorias com as dores típicas da tabela do `PLANO_CAPTACAO.md`;
- 5 fontes de busca com descrição resumida;
- Rotina seg–sex (Garimpo / Emails / Emails+Follow-ups / Ligações / Revisão);
- Checklist de partida com os 5 itens do playbook;
- 4 métricas do funil com faixas: resposta 3–8%, resposta→reunião 30–50%, reunião→proposta 50%+, proposta→fechamento 25–35%.

---

## 4. Tela — seções (ordem vertical)

### 4.1 "Hoje" (topo, destaque)
- Card com o **bloco de rotina do dia da semana atual**: título, descrição e botão "Concluir bloco de hoje ✓".
- Ao concluir, grava `concluidoEm = hoje` e o card fica em estado positivo até o dia seguinte.
- Sábado/domingo: card neutro — "Sem bloco hoje. Segunda: Garimpo."
- Abaixo do card, linha de 5 marcadores (S T Q Q S) mostrando quais blocos foram concluídos **nesta semana**.

### 4.2 Checklist de partida
- Lista com checkbox persistente. Quando todos marcados, seção colapsa automaticamente com selo "Partida concluída".

### 4.3 Região e categorias-alvo
- Chips editáveis de cidades (adicionar/remover).
- Tabela/cards de categorias: nome, dor típica (editável inline), toggle ativa/despriorizada, contador de emails enviados (via pipeline) e respostas.
- **Regra visual:** categoria com `emailsEnviados >= 30` e `respostas === 0` recebe alerta âmbar: "30+ emails sem resposta — troque a dor da 1ª linha ou despriorize."

### 4.4 Fontes de busca
- Card por fonte: nome, descrição, contador `empresasColetadas` com botões +/−.
- Total geral de coletadas no cabeçalho da seção.

### 4.5 Métricas do funil
- Card por métrica: nome, faixa saudável, valor atual, e status (dentro/abaixo/acima da faixa por cor).
- Quando abaixo da faixa, exibir a `acaoSeAbaixo`.
- Métricas calculáveis pelo pipeline (ex.: proposta→fechamento = fechados ÷ propostas) devem ser calculadas; as demais aceitam entrada manual.

---

## 5. Integração com o módulo de Prospecção

- `emailsEnviados` por categoria: contar empresas do pipeline com `categoria` correspondente e `dataPrimeiroEmail` preenchida (matching por nome de categoria, case-insensitive).
- A seção "Hoje" deve linkar para a tela pertinente ao bloco (Garimpo → Pipeline; Emails → Modelos; Ligações → Painel/Ações de hoje).
- Nada nesta tela altera dados do pipeline; a integração é somente leitura + navegação.

---

## 6. Padrão visual

Seguir `docs/PADRAO_FRONTEND.md` e o padrão do módulo de Prospecção:
- Fundo `#EEF0F7`, cards brancos sem borda, raio 20px, sombra suave.
- Gradiente da marca (`#8B5CF6 → #3D6DF6`) somente no card "Hoje" (borda/acento ou botão de concluir) e em botões primários.
- Tela de lista/dashboard — **largura total** (não é formulário).
- Números em extra-bold, labels em caixa alta cinza.
- Mobile-first: seções empilhadas, chips e contadores com área de toque ≥ 44px.

---

## 7. Critérios de aceite

- [ ] Primeiro acesso popula o seed completo do playbook sem ação do usuário.
- [ ] Concluir o bloco de hoje persiste e reseta corretamente na virada do dia; marcadores da semana refletem apenas a semana corrente (seg–dom).
- [ ] Checklist de partida persiste entre sessões e colapsa quando 100% concluído.
- [ ] Alerta de categoria sem resposta dispara com 30+ emails e 0 respostas.
- [ ] Métricas calculáveis vêm do pipeline em tempo real; manuais são editáveis e persistem.
- [ ] Cidades, categorias, fontes e dores são todas editáveis — o plano é do usuário, o seed é só ponto de partida.
- [ ] Checklist do `PADRAO_FRONTEND.md` cumprido antes do PR.
