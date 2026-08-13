Atualize o módulo "Plano de Captação" (rota /prospeccao/plano), que já está implementado e em produção, para a versão 2 do ICP. Siga o padrão visual e as regras já existentes do módulo — não altere layout, rotas nem estrutura de componentes. Somente dados de seed e uma regra de alerta mudam.

## 1. Novo seed (v2)

Substitua o conteúdo do seed atual pelos dados abaixo.

### Categorias-alvo (substituir as 8 atuais por estas 5)

| Nome | Dor típica |
|---|---|
| Indústrias com processo produtivo próprio | PCP, rastreabilidade de lote e qualidade rodando em planilha porque o ERP de prateleira não cobre |
| Transportadoras e operadores logísticos médios | TMS genérico não cobre acerto de agregados, torre de controle própria e integração com WMS do cliente |
| Construtoras e incorporadoras regionais | Medição de obra, suprimentos e contratos num Frankenstein de planilhas |
| Distribuidoras e atacadistas grandes | Força de vendas externa, roteirização e preço por cliente rodando fora do sistema fiscal |
| Serviços industriais (manutenção, montagem, facilities) | Gestão de contratos, medição de serviço e apontamento de equipe de campo sem sistema |

### Fontes de busca (substituir as 5 atuais)

| Nome | Descrição |
|---|---|
| CIESP Jundiaí | Lista de associados = ICP pronto; participar dos eventos mensais |
| Consulta CNPJ (Casa dos Dados / CNPJ.biz) | Filtrar cidades + CNAE das categorias + porte "Demais" + capital social alto |
| LinkedIn | Empresas da região com 30+ funcionários; decisor = sócio ou gerente adm/industrial; vagas abertas = timing |
| Condomínios logísticos e distritos industriais | Levantar ocupantes dos condomínios de Cabreúva/Itupeva/Jundiaí e distritos de Jundiaí/Itu |
| Rede pessoal e indicação | Contatos próprios e da família que trabalham em ou vendem para indústrias da região |

### Checklist de partida (substituir os itens atuais por estes 6)

1. Ajustar meta semanal no sistema: 15 → 10 primeiros emails
2. Destravar propostas paradas: Hugo Rodrigues (ORC-0001) e Pavani Soluções (ORC-0002)
3. Mapear associados CIESP Jundiaí e verificar próximo evento
4. Rodar 1ª consulta CNPJ: cidades + CNAEs das categorias 1 e 2 + porte "Demais"
5. Montar lista inicial de 20 empresas do ICP com decisor nomeado
6. Enviar os 5 primeiros emails da v2

### Métricas do funil (substituir as 4 atuais por estas 5)

| Nome | Faixa saudável | Ação se abaixo |
|---|---|---|
| Taxa de resposta (1º email + follow-up) | 5–10% | Reescrever assunto e 1ª linha; checar spam |
| Resposta → reunião | 30–50% | Reunião de 15 min, online, propor 2 horários |
| Reunião → proposta | 50%+ | Qualificar porte antes — está entrando empresa fora do ICP? |
| Proposta → fechamento | 25–35% | Rever valor de entrada; nunca remover ou reduzir a mensalidade |
| Ciclo proposta → resposta | ≤ 45 dias | Follow-up de proposta em D+5 sem falha; incluir prazo de validade na proposta |

## 2. Regra de alerta

O alerta âmbar de categoria sem resposta muda de 30 para **20** emails: `emailsEnviados >= 20 && respostas === 0` → "20+ emails sem resposta — troque a dor da 1ª linha ou despriorize."

## 3. Migração (obrigatório — já existe instalação em produção)

O seed só roda no primeiro uso, então crie uma rotina de migração v1→v2 que:

- Substitua categorias, fontes, checklist e métricas pelo conteúdo v2 acima **somente se o registro ainda for idêntico ao seed v1** (não editado pelo usuário);
- Preserve qualquer item que o usuário tenha editado, além dos contadores (`empresasColetadas`, `respostas`) e estados (`feito`, `concluidoEm`) existentes;
- Rode uma única vez, controlada por flag de versão do seed (ex.: `seedVersion: 2`) persistida junto aos dados.

## 4. Critérios de aceite

- [ ] Instalação nova recebe o seed v2 direto.
- [ ] Instalação existente migra para v2 preservando edições e contadores do usuário.
- [ ] Alerta de categoria dispara com 20 emails e 0 respostas.
- [ ] Nenhuma mudança visual, de rota ou de estrutura fora do descrito.
- [ ] Checklist do docs/PADRAO_FRONTEND.md cumprido antes do PR.
