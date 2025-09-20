# Prop-Stream

![Capa da Prop-Stream](https://raw.githubusercontent.com/Prop-Stream/.github/main/profile/prop-stream-cover.png)

> Cockpit inteligente para originação, análise e gestão de investimentos imobiliários.

## Badges

[![CI](https://img.shields.io/github/actions/workflow/status/Prop-Stream/Prop-Stream/ci.yml?branch=main&label=CI)](https://github.com/Prop-Stream/Prop-Stream/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-339933?logo=node.js&logoColor=white)
[![Licença](https://img.shields.io/github/license/Prop-Stream/Prop-Stream)](https://github.com/Prop-Stream/Prop-Stream/blob/main/LICENSE)

## Visão

A Prop-Stream centraliza o ciclo de investimento imobiliário em um cockpit unificado. A plataforma conecta dados de originação, inteligência de valuation e performance operacional em fluxos de trabalho consistentes, permitindo que gestoras tomem decisões rápidas, embasadas e auditáveis.

## Funcionalidades

- **Originação de negócios** – Controle completo do funil de oportunidades, com filtros por estágio, criação rápida de prospects e atualização otimista do pipeline para a equipe comercial.
- **Análise e valuation** – Dashboards financeiros com métricas configuráveis, modelagem comparativa de ativos e avaliação de cenários e sensibilidade para sustentar decisões de investimento.
- **Gestão de portfólio** – Visão consolidada de KPIs operacionais, distribuição por ativo, projeções de fluxo de caixa e alertas de eventos críticos para cada veículo.
- **Relatórios dinâmicos** – Exportação de indicadores por domínio, distribuição regional e destaques de risco com atualizações em tempo real.
- **Experiência resiliente** – Tratamento consistente para estados de carregamento, erros e dados vazios, garantindo transparência para a equipe de gestão.

## Arquitetura

A aplicação é construída em React 18 com TypeScript e Vite, seguindo uma modularização orientada a domínios funcionais (originação, análise e gestão). O estado global é orquestrado com Redux Toolkit, enquanto React Query cuida de cache e sincronização com o backend. A camada de serviços utiliza Axios para comunicação HTTP, suporte a WebSockets para eventos em tempo real e utilitários reutilizáveis de formatação. Testes unitários e de integração são executados com Vitest e React Testing Library, e cenários end-to-end são cobertos com Cypress.

## Estrutura do Monorepo

```
Prop-Stream/
├── src/
│   ├── app/                 # App Shell e layout persistente
│   ├── domains/             # Módulos de Originação, Análise e Gestão
│   ├── services/            # Camada de comunicação com APIs e realtime
│   ├── store/               # Slices do Redux Toolkit e hooks tipados
│   └── utils/               # Funções utilitárias e formatadores
├── cypress/                 # Testes end-to-end
├── cypress.config.ts        # Configuração do Cypress
├── eslint.config.js         # Regras de lint compartilhadas
├── package.json             # Scripts e dependências
├── setupTests.ts            # Configuração de testes unitários
├── tsconfig.json            # Configuração TypeScript
└── vitest.config.ts         # Configuração Vitest
```

## Getting Started

1. **Pré-requisitos**
   - Node.js 18 ou superior
   - npm (ou pnpm/yarn, conforme padrão da equipe)
2. **Clonar o repositório**
   ```bash
   git clone https://github.com/Prop-Stream/Prop-Stream.git
   cd Prop-Stream
   ```
3. **Instalar dependências**
   ```bash
   npm install
   ```
4. **Executar o ambiente de desenvolvimento**
   ```bash
   npm run dev
   ```
5. **Executar verificações locais**
   ```bash
   npm run lint      # Análise estática
   npm run test      # Testes unitários e de integração
   npm run cypress:open # Cenários end-to-end (UI interativa)
   ```

## Contribuição

1. Faça um fork do repositório em [Prop-Stream/Prop-Stream](https://github.com/Prop-Stream/Prop-Stream).
2. Crie uma branch descritiva (`feature/nova-funcionalidade`, `fix/bug-no-pipeline`, etc.).
3. Siga os padrões de código definidos no lint e na documentação interna.
4. Abra um Pull Request descrevendo o contexto, o impacto e os testes realizados. Utilize os modelos padrão disponíveis na organização.
5. Aguarde a revisão de pelo menos uma pessoa mantenedora antes do merge em `main`.

## Licença

Este projeto é de uso interno da organização Prop-Stream. Todos os direitos reservados.
