# Aureus — Xadrez 3D

Uma experiência de xadrez 3D em React, TypeScript e Three.js, com regras clássicas completas e uma IA local em cinco níveis.

## Executar

Requer Node.js LTS.

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite no navegador.

## Validação

```bash
npm test
npm run build
npm run profile
npm run smoke
```

O smoke test usa uma instalação local do Google Chrome por padrão. Em outro ambiente, informe `CHROME_PATH`. Para também gerar capturas no diretório temporário do sistema, defina `AUREUS_SCREENSHOTS=1`. Por padrão ele monta o caminho premium e usa o caminho direto para a interação em renderizadores de software; use `AUREUS_SMOKE_FULL_EFFECTS=1` para manter o pós-processamento durante todo o teste.

O profiler aceita `AUREUS_PROFILE_MS` para duração da amostra e `AUREUS_DPR` para o fator de pixels. Ele informa draw calls, triângulos e distribuição por framebuffer; compare sempre no mesmo navegador, resolução e equipamento.

## Arquitetura de performance

- Geometrias das peças são fundidas por tipo em corpo/acento e compartilhadas sem reduzir a tesselação.
- Casas, molduras, pilares, coordenadas e marcadores usam instancing ou buffers consolidados.
- O shadow map de 2048² é atualizado somente enquanto um caster muda.
- Peças paradas deixam o callback de animação imediatamente e usam materiais opacos.
- Relógios vivem em uma store externa: apenas os dois cartões atualizam uma vez por segundo.
- A IA mantém um Worker por partida, e a cena 3D é carregada antecipadamente durante o tempo ocioso do menu.

## Entrega em produção

`npm run build` mantém os arquivos originais em `dist/` e também gera versões Brotli (`.br`) e gzip (`.gz`) para assets de texto com pelo menos 1 KiB. O servidor ou CDN deve escolher automaticamente o formato aceito pelo navegador; os sufixos não devem aparecer nas URLs públicas.

Configure a hospedagem para:

- servir `.br` com `Content-Encoding: br` quando `Accept-Encoding` permitir Brotli;
- usar `.gz` com `Content-Encoding: gzip` como fallback e preservar o `Content-Type` do arquivo original;
- enviar `Vary: Accept-Encoding` nas respostas comprimidas;
- aplicar `Cache-Control: public, max-age=31536000, immutable` somente a `/assets/*`, cujos nomes contêm hash;
- manter `index.html` com `Cache-Control: no-cache` (ou `max-age=0, must-revalidate`) para que novas versões sejam descobertas imediatamente.

Em Nginx, os módulos `brotli_static` e `gzip_static` podem servir diretamente os arquivos pré-comprimidos. Plataformas gerenciadas podem ignorar os sidecars e realizar compressão equivalente na borda.

## Recursos

- Regras oficiais por meio do `chess.js`: roque, en passant, promoção, xeque-mate, afogamento, repetição, regra dos 50 lances e material insuficiente.
- Cinco dificuldades com busca iterativa, minimax, poda alfa-beta, avaliação posicional e perfis de erro distintos.
- IA executada em Web Worker para preservar a fluidez da interface.
- Peças e cenário totalmente procedurais em Three.js, sem modelos externos.
- Materiais PBR, sombras, reflexos, iluminação de estúdio, bloom e partículas opcionais.
- Animações de movimento, captura, seleção, roque, promoção e en passant.
- Relógios, histórico SAN, desfazer, virar tabuleiro, áudio sintetizado e tela cheia.
- Layout responsivo e respeito à preferência de movimento reduzido do sistema.

## Estrutura

- `src/components/ChessScene.tsx`: cena, tabuleiro, peças e animações 3D.
- `src/game/`: regras auxiliares, avaliação, IA, worker e testes.
- `src/components/ui/`: menu, painel de partida e diálogos.
- `src/App.tsx`: fluxo da partida e integração entre interface, regras e IA.
