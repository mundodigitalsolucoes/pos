# 2. Cardápio / Catálogo MDS Food 2.0

## Objetivo

Transformar o cadastro atual de produtos em um catálogo comercial estruturado, reutilizável e preparado para restaurantes, pizzarias, lanchonetes, delivery e múltiplos canais de venda.

O catálogo deve ser o núcleo de produto do MDS Food.

## Problema atual

O produto já possui cadastro de itens, categorias, subcategorias, imagens, preços e uma base para personalizações. Porém a experiência ainda é centrada em “produto simples”.

Para competir comercialmente, o modelo precisa representar operações reais como pizzas por tamanho, adicionais, bordas, combos, disponibilidade por horário e reutilização de grupos de complementos.

## Estrutura funcional alvo

A área principal deve ser apresentada como **Cardápio** com abas ou seções claras:

- Produtos
- Categorias
- Complementos
- Opções
- Variações
- Combos
- Disponibilidade

## Modelo conceitual

A evolução deve caminhar de:

`Produto -> preço`

para:

`Categoria -> Produto -> Variações -> Grupos de complementos -> Opções -> Regras -> Disponibilidade -> Canal -> Promoção`

## Categorias

Requisitos:

- criar/editar/excluir;
- ordenar por drag-and-drop ou ação equivalente;
- ativar/desativar;
- imagem/ícone opcional;
- descrição opcional;
- disponibilidade por período;
- destaque;
- uso no cardápio público.

## Produtos

Requisitos mínimos:

- nome;
- descrição;
- imagem;
- categoria;
- preço base;
- preço promocional;
- status ativo/inativo;
- destaque;
- disponibilidade;
- estoque/indisponibilidade quando aplicável;
- ordenação;
- canal de venda.

## Variações

Exemplos:

- Pequena / Média / Grande
- 300 ml / 500 ml / 1 L
- Individual / Família

Cada variação pode possuir preço próprio, disponibilidade própria e regras próprias de complementos.

## Grupos de complementos

Devem ser reutilizáveis entre produtos.

Exemplos:

- Escolha a borda
- Escolha o ponto da carne
- Adicionais
- Retire ingredientes
- Escolha o molho

Regras por grupo:

- obrigatório/opcional;
- mínimo de escolhas;
- máximo de escolhas;
- seleção única/múltipla;
- quantidade por opção quando necessário;
- preço adicional por opção;
- ordem de exibição;
- possibilidade de reutilização em vários produtos.

## Opções

Cada grupo pode conter opções como:

- Catupiry + R$ 8,00
- Cheddar + R$ 7,00
- Bacon + R$ 5,00
- Sem cebola

As opções devem poder ser ativadas/desativadas sem apagar histórico.

## Combos

Objetivo comercial:

Permitir composição de ofertas como:

- 1 pizza grande + 1 refrigerante;
- hambúrguer + batata + bebida;
- escolha 2 sabores + 1 borda + 1 bebida.

O combo deve definir etapas de escolha, limites, preço final ou regra de preço e disponibilidade.

## Disponibilidade

Suportar progressivamente:

- ativo/inativo manual;
- dia da semana;
- horário;
- data inicial/final;
- estoque esgotado;
- canal de venda;
- retirada/delivery/mesa.

## Canais

O modelo deve estar preparado para que futuramente um item possa ser vendido por:

- Cardápio público MDS Food
- Mesa / QR Code
- Delivery próprio
- PDV / atendimento
- WhatsApp
- Open Delivery / marketplaces

O domínio do catálogo não deve depender de uma integração externa específica.

## Operação do catálogo

A tela comercial deve permitir:

- categorias na lateral ou navegação equivalente;
- lista/grade de produtos;
- busca rápida;
- filtro de ativos/inativos;
- edição rápida de preço/status;
- edição em massa;
- duplicação de produto;
- ordenação;
- destaque;
- indicação visual de disponibilidade.

## Pizzarias como caso crítico

O modelo deve ser validado com cenários reais de pizzaria:

- tamanhos diferentes;
- preços por tamanho;
- múltiplos sabores futuramente;
- bordas;
- adicionais;
- remoção de ingredientes;
- combos;
- disponibilidade por horário.

Se o modelo funcionar bem para pizzarias sem gambiarras, tende a atender operações mais simples com facilidade.

## Migração e compatibilidade

A evolução não deve quebrar produtos existentes.

Estratégia preferida:

- manter campos atuais enquanto novas estruturas são introduzidas;
- criar migrations progressivas;
- mapear produtos simples para a nova estrutura;
- evitar migrações destrutivas;
- manter pedidos históricos interpretáveis.

## Critérios de aceite do MVP

Para o MVP comercial, é necessário ao menos:

- categorias bem gerenciáveis;
- produtos com imagem, descrição, preço e status;
- grupos de complementos reutilizáveis;
- opções com preço adicional;
- pelo menos uma forma consistente de variação/tamanho;
- ordenação;
- disponibilidade ativa/inativa;
- publicação refletida corretamente no cardápio público;
- edição possível pelo restaurante sem suporte técnico;
- build e migrations validados.

Combos avançados, múltiplos preços por marketplace e regras complexas podem ser incrementais, desde que o modelo não bloqueie a evolução.

## Fora do escopo inicial

- sincronização completa com iFood;
- Open Delivery completo;
- precificação fiscal avançada;
- IA de recomendação;
- estoque avançado por ficha técnica.

## Prompt para conversa dedicada

> Vamos trabalhar exclusivamente no **Cardápio / Catálogo MDS Food 2.0**, seguindo `docs/mds-food-commercial-mvp/02-cardapio-catalogo-2.0.md`. Antes de alterar, audite modelos, migrations, endpoints, `products.component`, cardápio público e personalizações existentes no `master`. Preserve compatibilidade com produtos e pedidos atuais. Depois implemente em incrementos seguros, com migration e build/testes antes de deploy.