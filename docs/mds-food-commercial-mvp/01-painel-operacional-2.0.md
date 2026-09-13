# 1. Painel Operacional MDS Food 2.0

## Objetivo

Transformar o painel atual em uma central operacional de restaurante com navegação previsível, aparência comercial, acesso rápido às rotinas críticas e identidade MDS Food consistente.

## Problema atual

O sistema possui muitos recursos já implementados, mas parte deles está escondida em grupos pouco intuitivos, distribuída em cards genéricos ou ainda carrega heranças visuais e conceituais do core original.

O usuário precisa encontrar as tarefas pelo modo como pensa a operação do restaurante, e não pela estrutura interna do código.

## Referência funcional

Usar como referência de maturidade plataformas como Cardápio Web, Hey Delivery e Anota AI, especialmente:

- navegação lateral persistente;
- prioridade para pedidos e cardápio;
- módulos operacionais claros;
- ações rápidas;
- status visível;
- pouca ambiguidade entre configuração, operação e análise.

Não reproduzir identidade visual de terceiros.

## Arquitetura de navegação alvo

### Itens de primeiro nível

- Início
- Pedidos
- Cardápio
- Mesas e comandas
- Cozinha / KDS
- Caixa / PDV
- Delivery
- Clientes
- Desempenho
- Histórico de pedidos
- Fidelidade
- Cupons e promoções
- Minha empresa
- Integrações
- Configurações

Nem todos precisam estar completos no primeiro incremento. Itens ainda não disponíveis devem ser omitidos ou marcados claramente como indisponíveis, nunca simular funcionalidade.

## Início / dashboard

O dashboard deve deixar de ser uma coleção genérica de atalhos e passar a responder rapidamente:

- restaurante está aberto ou fechado?
- existem pedidos novos?
- existem pedidos atrasados?
- existem mesas ocupadas?
- quais produtos estão indisponíveis?
- como abrir o cardápio online?
- como cadastrar produto?
- como iniciar um pedido manual?

### Blocos desejados

- resumo operacional do dia;
- pedidos em aberto;
- vendas do dia;
- ticket médio;
- atalhos para Cardápio Online, Novo Produto e Pedidos;
- alertas relevantes;
- status das integrações essenciais quando existirem.

## Sidebar

### Requisitos

- Logo/ícone MDS Food.
- Nome do restaurante visível.
- Sem referências comerciais a Satisfecho.
- Sem versão/hash/tenant ID na interface normal do cliente.
- Grupos coerentes e reduzidos.
- Estado ativo óbvio.
- Comportamento responsivo.
- Menu mobile utilizável.
- Permissões respeitadas por perfil.

### Desenvolvimento futuro

Informações técnicas como tenant ID, commit e versão devem migrar para uma área de diagnóstico/suporte, não ficar no cabeçalho principal.

## Papéis e permissões

A navegação deve respeitar permissões existentes e evoluir para uma matriz clara por perfil:

- Proprietário
- Administrador
- Atendimento / Garçom
- Cozinha
- Bar
- Entregador
- Suporte MDS

O usuário não deve ver atalhos para áreas que não pode usar.

## White-label

Aplicar consistentemente:

- Marca: MDS Food
- Empresa: Mundo Digital Soluções
- Off-white: `#F7F5EF`
- Azul escuro: `#2F3453`
- Azul principal: `#374B89`
- Dourado: `#D6A92F`
- Hover dourado: `#C19620`

Headline institucional:

> Soluções para seu restaurante vender mais.

## Rotas existentes a preservar

O redesenho não deve quebrar as rotas operacionais existentes. A navegação pode mudar de nome e hierarquia, mas deve reaproveitar os módulos atuais quando adequado.

Exemplos já existentes incluem dashboard, pedidos, produtos, mesas, cozinha, bar, clientes, relatórios, configurações e turnos.

## Critérios de aceite da primeira versão

- Sidebar reorganizada com nomenclatura comercial.
- Cardápio Online facilmente acessível.
- Dashboard prioriza operação, não apenas navegação.
- Nenhuma chave de tradução aparece na interface.
- Nenhuma referência visual ao Satisfecho nas telas do cliente.
- Ícones e espaçamentos coerentes.
- Desktop e mobile funcionais.
- Perfis sem permissão não recebem atalhos indevidos.
- Build frontend verde.

## Fora do escopo inicial

- Super Admin SaaS completo.
- Billing avançado.
- CRM MDS completo.
- Marketplace/Open Delivery.
- Fiscal completo.

Esses módulos devem ter pontos de entrada previstos, mas não precisam bloquear o Painel 2.0.

## Prompt para conversa dedicada

Usar como abertura de uma conversa separada:

> Vamos trabalhar exclusivamente no **Painel Operacional MDS Food 2.0**, seguindo `docs/mds-food-commercial-mvp/01-painel-operacional-2.0.md`. Primeiro audite o painel, sidebar, permissões, rotas e componentes atuais no `master`. Depois proponha a menor sequência segura de alterações e implemente diretamente, testando o build antes de orientar deploy.