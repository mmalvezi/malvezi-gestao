# Módulo: Prospecção Ativa

> Documento de especificação para implementação do módulo de Prospecção dentro do **gestao.malvezi.com.br**.
> Sugestão de local: `docs/MODULO_PROSPECCAO.md`
> Escopo deste documento: **frontend**. Necessidades de backend estão listadas no final apenas como referência de alinhamento.

---

## 1. Objetivo

Controlar a operação de prospecção ativa (outbound) de clientes para sistemas sob medida, com meta explícita de **MRR (receita recorrente mensal)** até um prazo definido.

- Meta padrão: **R$ 10.000/mês até 31/01/2027** (configurável)
- Toda proposta contempla **mensalidade obrigatória** (suporte + manutenção). Não existe fechamento sem recorrência — o campo de mensalidade é obrigatório no status "Fechado".

---

## 2. Rotas

| Rota | Tela |
|---|---|
| `/prospeccao` | Painel (visão geral) |
| `/prospeccao/pipeline` | Pipeline de empresas |
| `/prospeccao/fechados` | Clientes fechados (recorrência) |
| `/prospeccao/modelos` | Modelos de email e roteiro de ligação |
| `/prospeccao/metas` | Configuração de metas |

Adicionar item **"Prospecção"** no menu lateral, no mesmo padrão visual dos itens existentes.

---

## 3. Modelo de dados (frontend)

### 3.1 Empresa (lead)

```ts
interface EmpresaProspeccao {
  id: string;
  nome: string;
  categoria: string;        // ex.: comércio, oficina, clínica
  contato?: string;         // nome da pessoa
  telefone?: string;
  email?: string;
  status: StatusProspeccao;
  dataPrimeiroEmail?: string;   // ISO date
  dataProposta?: string;        // ISO date
  mensalidade?: number;         // R$/mês — obrigatório quando status = 'fechado'
  notas?: string;
  criadoEm: string;
  atualizadoEm: string;
}

type StatusProspeccao =
  | 'a_abordar'
  | 'email'        // 1º email enviado
  | 'followup'
  | 'ligacao'
  | 'reuniao'
  | 'proposta'
  | 'fechado'
  | 'perdido';
```

### 3.2 Configuração de metas

```ts
interface MetasProspeccao {
  metaMrr: number;          // padrão 10000
  prazoFinal: string;       // padrão '2027-01-31'
  emailsPorSemana: number;  // padrão 15 (1ºs emails/semana)
  dataInicio: string;       // fixada no primeiro uso — base do cálculo de ritmo
}
```

---

## 4. Regras de negócio (cadência)

A cadência é **calculada, nunca digitada**. Próxima ação por status:

| Status atual | Próxima ação | Vencimento |
|---|---|---|
| `a_abordar` | Enviar 1º email | — |
| `email` | Follow-up | `dataPrimeiroEmail + 4 dias` |
| `followup` | Ligar | `dataPrimeiroEmail + 8 dias` |
| `ligacao` | Marcar reunião | — |
| `reuniao` | Enviar proposta | — |
| `proposta` | Cobrar resposta | `dataProposta + 5 dias` |
| `fechado` / `perdido` | — | — |

Regras:

1. Botão **"Avançar"** move a empresa para o próximo status da esteira.
2. Ao avançar para `email`, gravar `dataPrimeiroEmail = hoje` (se vazio).
3. Ao avançar para `proposta`, gravar `dataProposta = hoje`.
4. Ao avançar para `fechado`, exigir `mensalidade > 0` (modal/validação). **Não permitir fechar sem mensalidade.**
5. Ação com vencimento anterior a hoje = **atrasada** (destaque vermelho + aparece em "Ações de hoje").
6. Qualquer status (exceto `fechado`) pode ser marcado como `perdido`, com confirmação.

---

## 5. Telas

### 5.1 Painel (`/prospeccao`)

1. **Pista de progresso (elemento principal):** barra horizontal onde o preenchimento (gradiente da marca) representa o MRR fechado em relação à meta, e um **marcador vertical de "ritmo"** indica onde o MRR deveria estar hoje, por interpolação linear entre `dataInicio` e `prazoFinal`.
   - MRR ≥ ritmo — mensagem positiva (chip roxo claro): "No ritmo — pra hoje o esperado era R$ X"
   - MRR < ritmo — chip âmbar: "Abaixo do ritmo — R$ Y atrás"
2. **Cards de indicadores (grid 2×2 no mobile, 4 colunas no desktop):** MRR fechado · Falta (meta − MRR) · Dias restantes · Ticket médio (MRR ÷ nº de fechados). Padrão visual: número grande em extra-bold, label em caixa alta cinza (mesmo padrão de "A RECEBER" / "RECORRENTE / MÊS" do painel atual).
3. **Ações de hoje:** lista de empresas com ação vencida hoje ou atrasada, ordenada por vencimento, com botão "Feito ✓" que executa o avanço de status. Vazio: "Nada vencido hoje. Aproveita pra mandar 1ºs emails novos."
4. **Meta da semana:** barra de progresso `1ºs emails enviados na semana atual (seg–dom)` vs `emailsPorSemana`.
5. **Funil acumulado:** contadores por etapa (1º email → follow-up → ligação → reunião → proposta → fechado). Cada contador soma empresas que **chegaram ou passaram** daquela etapa (excluindo perdidos).

### 5.2 Pipeline (`/prospeccao/pipeline`)

- Busca por nome/categoria + filtro por status + botão "+ Empresa".
- Lista de cards (não tabela no mobile): nome, categoria, contato/telefone/email, mensalidade proposta, badge de status, próxima ação com data (vermelha se atrasada), botões "Avançar →", "Perdido" e "Editar".
- Ordenação padrão: vencimento da próxima ação (mais urgente primeiro).
- Formulário de empresa em modal/drawer, com **barra de ação fixa no topo** (padrão do projeto — salvar no topo, não no rodapé).

### 5.3 Fechados (`/prospeccao/fechados`)

- Lista dos clientes `fechado` com mensalidade individual e **soma total = MRR** em destaque.
- Vazio: "Nenhum cliente fechado ainda. Cada card aqui é um pedaço dos 10k."

### 5.4 Modelos (`/prospeccao/modelos`)

Três blocos com botão "Copiar" (clipboard):

1. **Email frio (base)** — assunto + corpo com placeholders `[empresa]`, `[nome do contato]`, `[categoria]`, `[dor típica]`, `[projeto 1]`, `[projeto 2]`. O corpo menciona explicitamente que todo projeto inclui **suporte e manutenção mensal**.
2. **Follow-up (D+4)** — curto, oferece ligação como alternativa.
3. **Roteiro de ligação (D+8)** — 4 passos; objetivo é marcar reunião, não vender por telefone.

### 5.5 Metas (`/prospeccao/metas`)

- Campos: meta de MRR (R$), prazo final (data), 1ºs emails por semana.
- Botão "Exportar backup (JSON)" com todos os dados do módulo.

---

## 6. Padrão visual

Seguir **`docs/PADRAO_FRONTEND.md`** e a identidade existente do painel:

- Fundo lavanda `#EEF0F7`; cards brancos **sem borda**, raio 20px, sombra suave.
- Gradiente da marca (roxo→azul, `#8B5CF6 → #3D6DF6`) apenas em: chip de MRR, aba/botão ativo, preenchimento da pista, barra da meta semanal e botões primários.
- Tipografia: títulos e números em extra-bold; labels de indicadores em caixa alta, cinza, letter-spacing leve.
- Botões primários em pílula (border-radius 999px).
- **Contexto de layout:** Painel/Pipeline/Fechados são telas de lista/dashboard — **largura total**. Formulário de empresa e tela de Metas são formulários — coluna centralizada (`max-width: 1120px; margin-inline: auto`).
- Badges de status: cinza (`a_abordar`), azul (`email`, `followup`), âmbar (`ligacao`, `reuniao`, `proposta`), roxo/positivo (`fechado`), vermelho (`perdido`).

---

## 7. Critérios de aceite

- [ ] Não é possível salvar status `fechado` sem mensalidade > 0.
- [ ] Follow-up e ligação são calculados automaticamente (D+4 e D+8 do 1º email) — nenhum campo manual de "próxima ação".
- [ ] Ação atrasada aparece em vermelho no pipeline **e** em "Ações de hoje" no painel.
- [ ] O marcador de ritmo se move com a data atual, sem interação do usuário.
- [ ] Meta semanal conta apenas empresas cujo `dataPrimeiroEmail` cai na semana corrente (segunda a domingo).
- [ ] MRR do topo = soma das mensalidades dos fechados, atualizado em tempo real ao fechar/editar.
- [ ] Telas responsivas (mobile-first — o uso principal é pelo celular).
- [ ] Checklist do `PADRAO_FRONTEND.md` cumprido antes do PR.

---

## 8. Alinhamento com backend (fora do escopo deste doc)

O módulo precisa de persistência. Itens a alinhar:

- CRUD de `EmpresaProspeccao` e `MetasProspeccao` (endpoints REST no padrão do projeto).
- Enquanto o backend não existir, o frontend pode operar com um service isolado usando `localStorage`, desde que a camada de acesso a dados fique atrás de uma interface (trocar a implementação depois sem tocar nos componentes).
