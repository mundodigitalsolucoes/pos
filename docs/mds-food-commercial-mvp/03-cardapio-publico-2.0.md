# 3. Cardápio Público MDS Food 2.0

## Objetivo

Refazer a experiência pública do `/public-menu/:tenantId` para que ela funcione como uma vitrine e canal de venda moderno, mobile-first, rápido e preparado para delivery, retirada e pedidos na mesa.

O cardápio público deve ser tratado como produto principal do MDS Food, não como uma simples listagem de produtos.

## Referência funcional

Usar como referência de maturidade cardápios públicos de plataformas como Cardápio Web, Hey Delivery e Anota AI, especialmente:

- identidade forte do restaurante;
- navegação por categorias;
- cards comerciais de produto;
- personalizações claras;
- carrinho sempre acessível;
- checkout simples;
- foco em conversão no celular.

Não copiar layout, marca ou elementos proprietários de terceiros.

## Estrutura visual alvo

### Cabeçalho do restaurante

Exibir de forma organizada:

- imagem de capa;
- logo do restaurante;
- nome;
- status aberto/fechado;
- endereço ou localização quando configurado;
- tempo estimado quando disponível;
- informações de retirada/entrega;
- botão para informações do estabelecimento.

### Busca

Busca por:

- nome do produto;
- descrição;
- categoria;
- ingredientes quando apropriado.

### Categorias

- navegação sticky no mobile quando fizer sentido;
- Destaques;
- categorias cadastradas pelo restaurante;
- rolagem rápida até a seção;
- categoria ativa indicada visualmente.

## Cards de produto

Cada item deve poder exibir:

- imagem;
- nome;
- descrição curta;
- preço ou “a partir de”;
- preço promocional;
- badge de destaque/promoção;
- status indisponível;
- ação clara para abrir/adicionar.

O card deve funcionar bem com ou sem imagem.

## Tela/modal do produto

Ao selecionar um produto:

- foto maior;
- nome e descrição completa;
- variações/tamanhos;
- grupos de complementos;
- opções obrigatórias e opcionais;
- adicionais;
- observação do item;
- quantidade;
- cálculo de preço em tempo real;
- validação antes de adicionar ao carrinho.

## Carrinho

O carrinho deve permanecer fácil de acessar.

Requisitos:

- quantidade de itens;
- subtotal;
- edição/remover item;
- visualização das escolhas do produto;
- CTA de finalizar pedido;
- comportamento sticky ou equivalente no mobile.

## Checkout

O checkout deve ser desenhado para suportar progressivamente:

- entrega;
- retirada;
- consumo na mesa;
- dados do cliente;
- telefone;
- endereço;
- taxa de entrega;
- cupom;
- observações;
- forma de pagamento;
- agendamento futuramente;
- confirmação final.

No MVP, ativar apenas modalidades realmente suportadas no backend e configuração do tenant.

## Pós-pedido

Após finalizar:

- número/identificador do pedido;
- resumo;
- status inicial;
- link de acompanhamento quando disponível;
- instrução clara sobre pagamento e retirada/entrega.

## Mobile-first

A maior parte do uso esperado é celular.

Critérios:

- carregamento rápido;
- alvos de toque adequados;
- cards legíveis;
- navegação sem zoom horizontal;
- carrinho acessível com uma mão;
- imagens otimizadas;
- formulários amigáveis no teclado mobile.

## PWA

Preparar a arquitetura para evolução como PWA instalável por restaurante.

Objetivo futuro:

- instalação na tela inicial;
- ícone/logo do estabelecimento quando tecnicamente apropriado;
- experiência semelhante a app sem exigir publicação individual em lojas;
- cache seguro de assets públicos, sem comprometer atualização de preços/disponibilidade.

PWA não é bloqueador do primeiro MVP comercial.

## White-label do restaurante

O cardápio público deve permitir personalização controlada por tenant:

- logo;
- capa;
- nome;
- cor principal dentro de limites de contraste/acessibilidade;
- contatos;
- localização;
- textos institucionais básicos.

A infraestrutura continua MDS Food, mas a experiência do consumidor deve destacar o restaurante.

## Conversão

Depois do MVP, evoluir para:

- destaques;
- combos;
- upsell;
- “peça de novo”;
- promoções;
- cupons;
- fidelidade;
- recomendação de adicionais;
- recuperação de carrinho via CRM/WhatsApp.

## Integração com Catálogo 2.0

O Cardápio Público 2.0 não deve criar um modelo paralelo.

Ele deve consumir diretamente a estrutura publicada do **Cardápio / Catálogo 2.0**, respeitando:

- ordem;
- categoria;
- status;
- disponibilidade;
- variações;
- complementos;
- preço;
- promoções;
- canal.

## Critérios de aceite do MVP

- cabeçalho comercial do restaurante;
- categorias navegáveis;
- busca;
- cards modernos;
- produto com opções/personalizações suportadas;
- carrinho funcional;
- checkout com os modos habilitados;
- pedido chegando corretamente na operação;
- tela de confirmação;
- experiência excelente em largura de celular comum;
- sem referências visuais ao Satisfecho;
- identidade do restaurante + assinatura MDS Food discreta quando aplicável;
- build frontend verde.

## Métricas futuras

Preparar eventos para medir futuramente:

- visualização do cardápio;
- busca;
- abertura de produto;
- adicionar ao carrinho;
- início do checkout;
- pedido concluído;
- abandono.

Esses eventos poderão alimentar analytics e CRM MDS sem acoplar ferramentas externas diretamente aos componentes.

## Prompt para conversa dedicada

> Vamos trabalhar exclusivamente no **Cardápio Público MDS Food 2.0**, seguindo `docs/mds-food-commercial-mvp/03-cardapio-publico-2.0.md`. Primeiro audite `/public-menu/:tenantId`, os componentes públicos, APIs consumidas, carrinho e checkout existentes. Preserve o fluxo de pedidos que já funciona. Depois refaça a experiência em incrementos mobile-first, validando build e os fluxos reais antes de deploy.