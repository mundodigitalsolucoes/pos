# MDS Food — MVP Comercial

## Objetivo

Transformar o MDS Food em um produto SaaS comercial para restaurantes, pizzarias, lanchonetes, delivery e operações de food service, priorizando experiência de uso, cardápio como motor de vendas e operação diária simples.

O MVP comercial será fechado em três frentes principais de produto:

1. **Painel Operacional MDS Food 2.0**
2. **Cardápio / Catálogo 2.0**
3. **Cardápio Público 2.0**

Essas três frentes devem ser desenvolvidas em conversas e ciclos separados, mas compartilhar o mesmo modelo de dados, padrões visuais e critérios de qualidade.

## Referências de mercado

As referências funcionais são Cardápio Web, Hey Delivery e Anota AI. Elas devem servir para estudar maturidade operacional, hierarquia de informação, catálogo, conversão e omnichannel. Não copiar marca, identidade visual ou interface pixel a pixel.

A identidade comercial deve permanecer MDS Food / Mundo Digital Soluções.

## Definição de MVP comercial

Ao concluir as três frentes abaixo, o produto pode ser considerado um **MVP comercializável para clientes-piloto e primeiras contas pagantes**, desde que os gates técnicos e operacionais deste documento estejam atendidos.

### Gate A — produto

- Cadastro/login funcionais, incluindo Google quando habilitado.
- Onboarding de restaurante funcional.
- Isolamento multi-tenant validado.
- Produtos e cardápio publicáveis.
- Pedido criado pelo cliente e recebido pela operação.
- Gestão básica de pedidos funcional.
- Cardápio público responsivo e utilizável no celular.
- Configuração básica do restaurante disponível.
- White-label MDS Food consistente nas telas comerciais e operacionais.
- Fluxos críticos em PT-BR sem chaves de tradução aparentes.

### Gate B — operação

- Frontend buildando em `production-static`.
- Backend compilando e migrations revisadas.
- Build Check verde antes de deploy.
- Coolify executando o commit esperado.
- Backup de PostgreSQL definido e testável.
- Logs suficientes para diagnosticar cadastro, pedido e publicação de cardápio.
- Processo de suporte inicial definido pela Mundo Digital Soluções.

### Gate C — comercial

Para o primeiro MVP não é obrigatório ter billing 100% automatizado. É aceitável iniciar com contratação e cobrança controladas pela MDS, desde que exista controle de tenant/status e um processo comercial documentado.

Antes de escala maior, entram planos, trial, billing, limites por plano e Super Admin completo.

### Gate D — jurídico/licença

- Preservar obrigações da AGPL-3.0 do core.
- Remover referências visuais comerciais ao produto de origem sem apagar avisos/licenças obrigatórios.
- Termos e política de privacidade do MDS Food publicados e revisáveis.

## Escopo fora do fechamento inicial do MVP

Não bloquear o primeiro lançamento comercial por ausência de:

- WhatsApp/Evolution API completo.
- CRM MDS completo.
- Automações n8n avançadas.
- Open Delivery/marketplaces.
- Fiscal brasileiro completo.
- IA avançada.
- Programa de fidelidade avançado.
- Billing totalmente automatizado.

Esses itens pertencem à evolução pós-MVP, salvo quando um cliente-piloto exigir explicitamente algum deles.

## Ordem de execução

### 1. Painel Operacional MDS Food 2.0

Arquivo: `01-painel-operacional-2.0.md`

Objetivo: transformar a navegação atual em uma central operacional de restaurante com hierarquia clara e aparência de SaaS comercial.

### 2. Cardápio / Catálogo 2.0

Arquivo: `02-cardapio-catalogo-2.0.md`

Objetivo: transformar o cadastro simples de produtos em um catálogo estruturado, reutilizável e preparado para pizzarias, combos, adicionais, canais e disponibilidade.

### 3. Cardápio Público 2.0

Arquivo: `03-cardapio-publico-2.0.md`

Objetivo: transformar o `/public-menu/:tenantId` em uma experiência de compra moderna, mobile-first e orientada à conversão.

## Princípio de arquitetura

Manter separação entre:

1. Core MDS Food / POS
2. SaaS multi-tenant
3. MDS Integration Hub
4. CRM MDS
5. Automações / n8n
6. WhatsApp / Evolution API
7. Integrações externas
8. Open Delivery

O catálogo e os pedidos devem expor contratos claros para que WhatsApp, marketplaces e Open Delivery possam consumir a mesma base sem acoplar integrações externas ao core de interface.

## Regra de implementação

Cada frente deve seguir o ciclo:

1. Auditar o estado atual do código.
2. Definir diferenças entre atual e alvo.
3. Implementar em incrementos pequenos.
4. Testar/buildar.
5. Validar visualmente em homologação.
6. Só então avançar para a próxima etapa.

## Critério de saída do MVP

O MVP está pronto para comercialização inicial quando um novo restaurante consegue, sem intervenção técnica no banco:

1. Criar sua conta.
2. Configurar o estabelecimento.
3. Montar seu cardápio.
4. Publicar o cardápio online.
5. Receber um pedido real.
6. Operar esse pedido no painel.
7. Alterar disponibilidade/preço/produto sem suporte técnico.
8. Usar o sistema no desktop e no celular com uma experiência coerente de marca.

Esse é o marco de **MDS Food MVP Comercial**.