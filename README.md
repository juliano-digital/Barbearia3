# Royal Barber House

Sistema premium de agendamento para barbearias, construído com React, TypeScript, Vite, Tailwind CSS e Supabase.

## Visão geral

- Área pública para agendamento sem cadastro
- Painel administrativo protegido por autenticação
- Gestão de serviços, barbeiros, agenda e configurações
- Persistência em localStorage como fallback para demonstração local
- Estrutura pronta para migração para Supabase real

## Requisitos

- Node.js 18+
- npm
- Conta Supabase com projeto configurado

## Instalação

1. Clone o projeto.
2. Instale as dependências:

```bash
npm install
```

3. Copie o arquivo `.env.example` para `.env` e ajuste os valores:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

## Execução local

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

## Build de produção

```bash
npm run build
```

## Deploy na Cloudflare Pages

1. Conecte o repositório ao Cloudflare Pages.
2. Use o comando de build: `npm run build`.
3. Defina o diretório de publicação como `dist`.
4. Garanta que a rota SPA esteja configurada com o arquivo `public/_redirects`.

## Progressive Web App

- O build gera o Service Worker com Workbox e publica `manifest.webmanifest` e os ícones em `dist`.
- A instalação no Android aparece quando o navegador oferece `beforeinstallprompt`. No iPhone/iPad, use o menu de compartilhamento do navegador e escolha a opção para adicionar à tela inicial.
- O Service Worker mantém o shell e os assets locais disponíveis, mas não armazena respostas do Supabase, autenticação ou dados privados. Agendamentos e outras operações continuam exigindo conexão.
- Atualizações são aplicadas somente após a ação explícita “Atualizar aplicativo”, para que o usuário possa concluir operações em andamento.
- Em produção, publique em HTTPS e mantenha o fallback de SPA do arquivo `public/_redirects`.

Para validar localmente, execute `npm run build` e `npm run preview`; no Chrome DevTools, confira **Application > Manifest** e **Service Workers**. A instalação depende dos recursos oferecidos pelo navegador e sistema operacional; teste o fluxo manual em um dispositivo real.

## Estrutura principal

- `src/pages` — páginas públicas e administrativas
- `src/lib/supabase.ts` — acesso a dados e autenticação
- `src/data/mockData.ts` — dados iniciais de demonstração
- `src/types` — tipos compartilhados
- `supabase/migrations` — estrutura do banco, serviços padrão e funções de disponibilidade; aplique as migrações em ordem no projeto Supabase

## Segurança e regras de negócio

- A autenticação administrativa usa Supabase Auth quando configurada.
- O projeto foi estruturado para atender à regra de evitar sobreposição de horários.
- Não exponha chaves de serviço no frontend.
- O arquivo SQL em `supabase/migrations/001_init.sql` define políticas e proteção básica para agendamentos.

## Observação

O projeto atual inclui fallback local em `localStorage` para permitir funcionamento sem credenciais externas e validação local no ambiente de desenvolvimento.
