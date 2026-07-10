# Prompt mestre — Aureus Xadrez 3D

Este documento é uma peça de engenharia de prompt criada para orientar um modelo de IA a reconstruir o projeto **Aureus — Xadrez 3D** com o mesmo nível de acabamento visual, funcionalidade, arquitetura e desempenho alcançado neste repositório.

## Como usar

1. Crie ou abra uma pasta vazia para o projeto.
2. Dê ao modelo de IA permissão para ler e escrever nessa pasta e executar comandos locais.
3. Copie integralmente a seção **Início do prompt mestre** até **Fim do prompt mestre**.
4. Não resuma o prompt. Preserve os requisitos, números, nomes e critérios de aceite.
5. Se o modelo trabalhar por etapas, peça que continue até concluir implementação, testes, build e smoke test.

O prompt foi escrito para um agente de programação capaz de editar arquivos e usar terminal. Se o modelo apenas responder com código em texto, solicite que entregue cada arquivo completo mantendo a mesma estrutura indicada.

---

# Início do prompt mestre

## Papel e missão

Atue como engenheiro de software sênior, especialista em React, TypeScript, Three.js, renderização WebGL, inteligência artificial para jogos, UX e otimização de aplicações gráficas.

Crie do zero, na pasta atual, um jogo de xadrez 3D chamado **AUREUS**. O resultado deve ser totalmente jogável, visualmente sofisticado, responsivo e pronto para build de produção. Não entregue somente um plano, mockup ou protótipo: implemente todos os arquivos, instale dependências, execute testes, valide a aplicação em navegador e corrija os problemas encontrados.

Antes de editar:

- inspecione a pasta e preserve qualquer instrução local existente;
- se a pasta estiver vazia, crie toda a estrutura;
- prefira soluções locais e determinísticas;
- declare apenas suposições realmente necessárias;
- não interrompa o trabalho para pedir decisões que possam ser resolvidas com os requisitos abaixo;
- não considere um build bem-sucedido como prova de que WebGL, regras e interações funcionam.

## Resultado pretendido

Crie uma experiência de xadrez premium que una regras tradicionais e apresentação cinematográfica. O tabuleiro deve ocupar um salão 3D escuro e elegante, com materiais metálicos, reflexos controlados, iluminação quente e fria, profundidade, sombras suaves, bloom discreto e partículas ambientais.

A experiência precisa transmitir:

- nobreza e precisão;
- atmosfera moderna, escura e luxuosa;
- boa legibilidade do tabuleiro;
- peças com presença, silhuetas reconhecíveis e acabamento PBR;
- animações suaves que deem peso às jogadas;
- interface organizada, sem aparência de template genérico;
- fluidez em máquinas intermediárias sem reduzir a qualidade visual.

Toda a interface e mensagens devem estar em **português do Brasil**.

## Stack obrigatória

Use uma aplicação web client-side, sem backend, com:

- Node.js LTS;
- Vite;
- React 19;
- TypeScript estrito;
- Three.js;
- React Three Fiber;
- Drei;
- React Three Postprocessing/Postprocessing;
- `chess.js` para legalidade e regras oficiais;
- `lucide-react` para ícones;
- Vitest;
- Playwright Core para smoke test e profiler headless.

Use, de preferência, estas versões exatas para máxima reprodutibilidade:

| Pacote | Versão |
|---|---:|
| `react` / `react-dom` | `19.2.7` |
| `three` | `0.185.1` |
| `@react-three/fiber` | `9.6.1` |
| `@react-three/drei` | `10.7.7` |
| `@react-three/postprocessing` | `3.0.4` |
| `postprocessing` | `6.39.2` |
| `chess.js` | `1.4.0` |
| `lucide-react` | `1.24.0` |
| `vite` | `8.1.4` |
| `typescript` | `7.0.2` |
| `vitest` | `4.1.10` |
| `playwright-core` | `1.61.1` |

Não use servidor, banco de dados, modelos 3D baixados, texturas externas, Stockfish remoto ou serviços pagos. Construa tabuleiro, peças, cenário, efeitos e áudio de forma procedural.

## Estrutura esperada

Organize o projeto aproximadamente assim:

    index.html
    package.json
    package-lock.json
    vite.config.ts
    tsconfig.json
    tsconfig.app.json
    tsconfig.node.json
    public/
      favicon.svg
    scripts/
      smoke.mjs
      profile.mjs
    src/
      main.tsx
      App.tsx
      styles.css
      vite-env.d.ts
      components/
        ChessScene.tsx
        ui/
          StartScreen.tsx
          GameSidebar.tsx
          PromotionDialog.tsx
          GameOverDialog.tsx
          index.ts
      game/
        ai.ts
        ai.worker.ts
        difficulties.ts
        evaluation.ts
        presentation.ts
        rules.ts
        types.ts
        index.ts
        ai.test.ts
        rules.test.ts
      hooks/
        useChessAudio.ts
        useGameClock.ts
        useGameClock.test.ts

Evite abstrações genéricas sem necessidade. Separe claramente cena, interface, regras, IA, áudio e relógios.

## Identidade visual

Use a marca **AUREUS** em caixa alta e uma estética inspirada em salão real contemporâneo.

### Tipografia

- Interface: `Manrope`, pesos 400, 500, 600 e 700.
- Marca e títulos: `Playfair Display`, peso 500.
- Inclua fallbacks de sistema.
- Carregue a fonte somente uma vez; não combine `<link>` e `@import` duplicados.

### Paleta-base

- fundo principal: `#060a0a`;
- superfícies: `#0d1312` e `#131b19`;
- texto: `#f2f2ec`;
- texto secundário: `#8c9994`;
- dourado: `#d5ae70`;
- dourado claro: `#f1d49b`;
- dourado escuro: `#8e6235`;
- esmeralda: `#4ba789`;
- alerta: `#db796d`.

Use bordas translúcidas, gradientes muito sutis, glow controlado, fundos quase pretos, painéis com blur e sombras profundas. Evite neon excessivo, glassmorphism claro, cores saturadas ou bordas arredondadas exageradas.

Crie também um favicon SVG próprio com fundo verde/preto e símbolo dourado de rei ou coroa.

## Tela inicial

A tela inicial deve ocupar toda a viewport e conter:

- emblema dourado;
- eyebrow “Xadrez tridimensional”;
- título grande “AUREUS”;
- frase “Estratégia clássica. Presença extraordinária.”;
- seletor com cinco níveis de dificuldade;
- seletor de lado: Brancas, Pretas ou Aleatório;
- botão dourado “Iniciar partida”;
- rodapé com “Three.js Experience”, “Regras clássicas” e “Inteligência adaptativa”.

Use uma composição central dentro de painel escuro largo, grid atmosférico em perspectiva e glows verdes/dourados no fundo. O desktop pode distribuir dificuldade e escolha de lado em duas colunas; em telas estreitas, empilhe tudo.

## Tela da partida

No desktop, use:

- cena 3D ocupando a maior área à esquerda;
- sidebar entre 320 e 390 px à direita;
- topbar acima da cena com contexto da partida, indicador de IA local e tela cheia;
- canvas usando todo o espaço restante;
- dica inferior “Arraste para orbitar · Role para aproximar”.

A sidebar deve mostrar:

- marca AUREUS;
- dificuldade atual;
- status da posição e detalhe textual;
- cartões de brancas e pretas com jogador/máquina, cor e relógio;
- indicador visual do turno ativo;
- histórico SAN agrupado por número do lance;
- botões Nova partida, Desfazer, Virar tabuleiro, Som e Efeitos.

Inclua diálogos acessíveis para:

- promoção, oferecendo dama, torre, bispo e cavalo;
- resultado da partida, diferenciando vitória, derrota e empate.

## Cena Three.js

Implemente `ChessScene` com esta API:

    interface ChessSceneProps {
      fen: string
      selectedSquare: Square | null
      legalMoves: Square[]
      lastMove?: { from: Square; to: Square } | null
      onSquareClick: (square: Square) => void
      orientation: 'white' | 'black'
      effectsEnabled: boolean
    }

Carregue a cena com `React.lazy` e faça prefetch durante o tempo ocioso da tela inicial.

### Câmera e controles

- câmera Perspective, FOV 39, near 0.1, far 70;
- posição-base aproximada `[8.25, 8.1, 10.4]`;
- target `[0, 0.45, 0]`;
- OrbitControls sem pan;
- damping ligado;
- distância entre 8.8 e 22;
- polar entre 0.42 e 1.27;
- preserve órbita e zoom ao alternar efeitos;
- ao virar o tabuleiro, reposicione a câmera para o lado correto.

### Tabuleiro e cenário

Construa o tabuleiro proceduralmente:

- oito por oito casas;
- casas claras `#d7d1bd`;
- casas escuras `#17363c`;
- materiais físicos com metalness, roughness e clearcoat;
- moldura azul-petróleo escura com filetes dourados;
- coordenadas de arquivos e ranks douradas;
- pedestal circular escuro com anéis concêntricos;
- piso grande escuro e reflexivo;
- pilares periféricos finos quando efeitos estiverem ligados;
- fog escuro e fundo `#030b10`.

As casas precisam indicar:

- última jogada com azul/ciano translúcido;
- seleção com dourado;
- hover discreto;
- movimento legal vazio com ponto dourado;
- captura legal com anel dourado.

### Peças procedurais

Não use GLTF ou modelos externos. Modele as seis peças combinando `CylinderGeometry`, `TorusGeometry`, `SphereGeometry`, `BoxGeometry` e transformações.

Todas devem compartilhar uma fundação com base cilíndrica, anéis e filete dourado, mas possuir silhuetas próprias:

- peão: corpo cônico e cabeça esférica;
- torre: corpo vertical e ameias;
- cavalo: pescoço inclinado, cabeça, focinho, orelhas, crina e olhos;
- bispo: corpo esguio, cabeça oval e corte diagonal;
- dama: corpo alto, coroa circular com oito pontos e esfera superior;
- rei: corpo mais alto e cruz dourada.

Materiais:

- corpo branco: `#ebe3cf`, físico, claro e perolado;
- corpo preto: `#10252d`, físico, azul-petróleo metálico;
- acento branco: `#d5af58`;
- acento preto: `#bd8138`;
- use metalness, roughness, clearcoat e envMapIntensity para aparência premium.

Peças normais devem permanecer no caminho opaco. Use transparência somente durante a animação de captura.

### Iluminação e pós-processamento

Use uma iluminação de estúdio semelhante a:

- ambient light azul-clara com intensidade em torno de 0.34;
- hemisphere light com intensidade em torno de 0.62;
- spot quente principal em `[4.8, 10.5, 6.5]`, sombra suave e mapa 2048²;
- spot frio secundário em `[-6.5, 7.2, -4.5]`;
- pontos dourado e ciano nas laterais;
- Environment procedural com Lightformers, resolução 256 e `frames={1}`;
- tone mapping ACES Filmic e exposure aproximada de 1.08;
- PCF Soft Shadow Map.

Quando efeitos estiverem ligados:

- bloom com mipmap blur, intensidade aproximada 0.32 e threshold aproximado 1.05;
- vignette discreta;
- cerca de 58 sparkles dourados lentos;
- EffectComposer com MSAA 4x;
- não mantenha simultaneamente MSAA redundante no framebuffer padrão.

Quando efeitos estiverem desligados, preserve antialias nativo e a mesma legibilidade.

## Animações e interação

Implemente:

- movimento interpolado entre casa inicial e final, duração aproximada de 0.46 s;
- arco vertical durante o deslocamento;
- captura com redução de escala, rotação, queda e fade em aproximadamente 0.48 s;
- seleção com leve aumento de escala, bob vertical e rotação mínima;
- hover com escala e emissive discretos;
- roque animando rei e torre;
- promoção trocando a geometria sem teleporte visual incorreto;
- en passant removendo o peão capturado na casa correta;
- destaques e sombras sincronizados durante toda a transformação.

Não controle a posição animada com uma prop que seja sobrescrita imediatamente pelo React. Preserve a posição inicial em ref e mova o grupo imperativamente no frame loop.

Use proxies simples e invisíveis para raycasting das peças. O proxy precisa cobrir toda a silhueta, especialmente cabeça do cavalo, coroa da dama e cruz do rei. Desative raycast nos meshes decorativos.

## Regras e fluxo do jogo

Use `chess.js` como fonte de verdade. Preserve:

- movimentação legal das seis peças;
- alternância de turnos;
- xeque e xeque-mate;
- roque pequeno e grande;
- en passant;
- promoção para dama, torre, bispo ou cavalo;
- afogamento;
- repetição tripla;
- regra dos cinquenta lances;
- material insuficiente;
- impedimento de qualquer jogada que deixe o próprio rei em xeque.

O jogador deve poder escolher brancas, pretas ou lado aleatório. Se escolher pretas, a IA abre a partida. Bloqueie interação humana durante o turno da máquina.

Mantenha:

- FEN atual;
- histórico incremental de objetos `Move` e SAN;
- última jogada;
- casa selecionada e destinos legais;
- promoção pendente;
- resultado e motivo do término.

O botão Desfazer deve remover a jogada humana e a resposta da IA quando ambas já ocorreram. Cancele de verdade uma busca ativa da IA ao desfazer ou encerrar a partida. Após estouro do relógio, desabilite desfazer se não houver checkpoint temporal para restaurar.

## IA local em cinco níveis

Implemente uma IA própria no navegador usando:

- minimax;
- poda alpha-beta;
- busca iterativa;
- ordenação de jogadas;
- avaliação material e posicional;
- bônus/penalidade de xeque;
- prioridade para capturas, promoções e mates;
- limite simultâneo de profundidade, tempo e nós;
- ruído, chance de jogada aleatória e pool de candidatos nos níveis baixos.

Execute a busca em um **Web Worker persistente por partida**. Use request id e FEN para ignorar respostas obsoletas. Implemente cancelamento ao sair, desfazer ou finalizar, além de uma tentativa segura de recriação em caso de erro do Worker.

Use estes perfis:

| Nível | Nome | Profundidade | Tempo | Máx. nós | Aleatório | Candidatos | Ruído |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | Aprendiz | 1 | 40 ms | 250 | 0.72 | 6 | 180 |
| 2 | Competidor | 2 | 100 ms | 1.200 | 0.34 | 4 | 95 |
| 3 | Estrategista | 2 | 240 ms | 4.500 | 0.10 | 3 | 35 |
| 4 | Mestre | 3 | 520 ms | 16.000 | 0.02 | 2 | 10 |
| 5 | Grão-Mestre | 4 | 900 ms | 40.000 | 0 | 1 | 0 |

Descrições:

- Aprendiz: “Joga de forma descontraída e deixa oportunidades para quem está começando.”
- Competidor: “Reconhece ameaças imediatas, mas ainda assume riscos e comete imprecisões.”
- Estrategista: “Equilibra tática, desenvolvimento e segurança do rei.”
- Mestre: “Calcula combinações mais longas e raramente oferece material sem compensação.”
- Grão-Mestre: “Usa a busca mais profunda disponível e sempre escolhe a melhor linha encontrada.”

A IA deve sempre retornar uma jogada legal e retornar `null` apenas quando não houver jogadas.

## Relógios

Assuma dez minutos por lado.

Não coloque um `setInterval` frequente no componente raiz. Crie uma store monotônica baseada em `performance.now()`:

- detecção precisa do zero com timeout dedicado;
- atualização visual no máximo uma vez por segundo;
- apenas os dois cartões de relógio devem assinar a store;
- preserve frações de segundo ao pausar e retomar;
- impeça drift acumulado;
- resete corretamente em nova partida.

## Áudio

Crie sons procedurais usando Web Audio API, sem arquivos externos:

- seleção;
- movimento;
- captura;
- xeque;
- roque;
- vitória;
- derrota.

Use osciladores, envelopes de ganho e frequências diferentes. Mantenha uma única AudioContext e um callback estável. Alternar som não pode reiniciar a busca da IA.

## Performance obrigatória

Preserve a qualidade visual. Não reduza DPR, segmentos, bloom, shadow map ou luzes para atingir as metas.

Implemente desde o início:

1. Geometrias das peças pré-construídas por tipo, com transformações baked e merge em apenas dois buffers: corpo e acento.
2. Compartilhamento desses buffers entre peças iguais.
3. Dois `InstancedMesh` para as 64 casas, preservando hover/clique por `instanceId`.
4. Instancing ou consolidação para molduras, pilares, coordenadas e marcadores.
5. Shadow map com `autoUpdate=false`; marque `needsUpdate` na montagem, FEN, remoção final de captura, alteração de caster e em cada frame de transformação.
6. Early return em peças totalmente paradas.
7. Materiais opacos durante o estado normal.
8. Raycast somente em proxies e casas interativas.
9. `React.memo`, handlers estáveis e derivados memoizados.
10. Histórico incremental em vez de `history({ verbose: true })` após cada render.
11. Inicialização preguiçosa de `Chess` e FEN.
12. Worker persistente.
13. Environment calculado uma única vez.
14. Cena carregada por lazy import e prefetched em idle.

Meta em 1440×1000, DPR 1, posição inicial e efeitos ligados:

- aproximadamente 120 draw calls ou menos em repouso;
- cerca de 85 draw calls ou menos no passe principal;
- zero draws de shadow map em frames ociosos;
- shadow map completo durante movimento, seleção animada e captura;
- nenhuma atualização do componente raiz causada por ticks de relógio.

Crie `scripts/profile.mjs` com Playwright, instrumentando WebGL para informar:

- renderer;
- resolução do drawing buffer;
- FPS amostrado;
- draw calls por frame;
- triângulos por frame;
- draws agrupados por framebuffer.

O FPS de SwiftShader não representa uma GPU real; use draw calls e triângulos como métrica estrutural e compare sempre no mesmo ambiente.

## Responsividade e acessibilidade

- Desktop: cena + sidebar lateral.
- Abaixo de aproximadamente 860 px: empilhe cena e sidebar.
- Mobile: mantenha canvas com pelo menos 420–440 px de altura.
- Use `100dvh` quando apropriado.
- Diálogos devem ter `role="dialog"`, `aria-modal`, títulos e descrições associados.
- Status deve usar região `aria-live`.
- Botões devem ter rótulos acessíveis e `aria-pressed` em toggles.
- Preserve foco ao abrir/fechar diálogos.
- Respeite `prefers-reduced-motion` no CSS.
- Inclua estados `focus-visible` claros.
- Não dependa apenas de cor para comunicar turno ou resultado.

## CSS e acabamento

Crie CSS global cuidadosamente organizado com:

- variáveis da paleta;
- layout responsivo;
- classes BEM semânticas;
- transições de 160–220 ms;
- entrada suave do menu e diálogos;
- pulso de status enquanto a IA pensa;
- loading elegante enquanto o chunk 3D é carregado;
- scrollbar discreta no histórico;
- relógio com dígitos tabulares;
- estilos de urgência abaixo de trinta segundos;
- nenhuma dependência de framework CSS.

## Build e entrega

Configure scripts:

    npm run dev
    npm run test
    npm run build
    npm run preview
    npm run smoke
    npm run profile

O build deve:

- executar TypeScript estrito;
- produzir assets hashados;
- gerar sidecars `.br` e `.gz` para assets textuais acima de 1 KiB;
- manter originais intactos;
- não adicionar uma dependência apenas para compressão se um pequeno plugin Vite com `node:zlib` resolver de forma clara.

Documente que a hospedagem deve:

- servir Brotli ou gzip de acordo com `Accept-Encoding`;
- enviar `Vary: Accept-Encoding`;
- usar `Cache-Control: public, max-age=31536000, immutable` em `/assets/*`;
- manter `index.html` com `no-cache` ou `must-revalidate`.

Fixe as versões instaladas no `package.json`; não deixe `latest`.

## Testes obrigatórios

Com Vitest, cubra pelo menos:

1. posição inicial possui vinte jogadas legais;
2. roque pequeno e grande disponíveis em posição preparada;
3. en passant legal;
4. quatro opções de promoção;
5. movimento que ignora xeque é rejeitado;
6. IA retorna jogada legal nos cinco níveis;
7. nível máximo captura material valioso sem defesa;
8. IA retorna `null` em posição final;
9. relógio notifica somente na troca visual do segundo;
10. relógio dispara timeout uma única vez;
11. relógio preserva a fração ao pausar e retomar.

Crie um smoke test com Playwright que:

- inicia seu próprio servidor Vite quando necessário;
- abre Chrome/Chromium headless;
- valida a tela inicial;
- inicia uma partida;
- espera um canvas WebGL com área útil;
- verifica console e `pageerror`;
- seleciona `e2` e joga `e2–e4` por coordenadas projetadas;
- confirma o SAN `e4` no histórico;
- aguarda uma resposta da IA;
- pode gerar screenshots quando `AUREUS_SCREENSHOTS=1`;
- pode manter pós-processamento durante todo o teste com `AUREUS_SMOKE_FULL_EFFECTS=1`.

## Validação visual

Não confie apenas em TypeScript ou snapshots de DOM.

Abra a aplicação em navegador real e inspecione:

- menu em desktop e mobile;
- tabuleiro com efeitos ligados e desligados;
- todas as seis silhuetas;
- peças brancas e pretas;
- hover, seleção e movimentos legais;
- animação intermediária de movimento;
- captura e remoção completa da sombra capturada;
- roque, promoção e en passant;
- câmera virada;
- zoom e órbita preservados ao alternar efeitos;
- diálogo de resultado;
- console sem erros WebGL, NaN em geometria ou recursos não descartados.

Se fizer otimizações geométricas, compare screenshot determinístico antes/depois. Não aceite regressão perceptível de silhueta, normal, material, luz ou sombra.

## Ordem de implementação recomendada

1. Scaffold Vite/React/TypeScript e identidade visual.
2. Regras e estado com `chess.js`.
3. IA e Worker.
4. Tela inicial e sidebar.
5. Tabuleiro procedural e interação.
6. Modelagem procedural das peças.
7. Iluminação, ambiente e pós-processamento.
8. Animações e áudio.
9. Relógios e histórico.
10. Batching, instancing, shadow cache e raycast otimizado.
11. Responsividade e acessibilidade.
12. Testes, profiler, smoke test e regressão visual.
13. Build comprimido e documentação.

## Critérios de conclusão

Não declare a tarefa concluída até que:

- todas as regras estejam funcionais;
- os cinco níveis estejam selecionáveis e distintos;
- jogador possa usar brancas, pretas ou lado aleatório;
- IA responda sem bloquear a interface;
- promoção, roque e en passant funcionem visual e logicamente;
- menu, cena e sidebar sejam responsivos;
- efeitos possam ser alternados;
- câmera, som, desfazer, relógios e tela cheia funcionem;
- draw calls estejam dentro da meta estrutural;
- testes, build e smoke test passem;
- o console do navegador esteja limpo;
- README explique execução, perfil e headers de produção.

Ao terminar, apresente um resumo objetivo contendo:

- arquivos principais criados;
- funcionalidades implementadas;
- comandos de execução;
- testes realizados;
- métricas de draw calls antes/depois da otimização;
- qualquer limitação externa de hospedagem.

# Fim do prompt mestre

---

## Referência de aceite deste repositório

A implementação usada como referência para este prompt alcançou, em repouso e no mesmo renderizador de software:

- aproximadamente 1.070 → 97 draw calls por frame;
- passe principal de aproximadamente 428 → 80 draws;
- shadow pass ocioso de aproximadamente 393 → 0 draws;
- aproximadamente 435 mil → 224 mil triângulos por frame;
- 11 testes automatizados aprovados;
- smoke test completo com `e2–e4`, resposta da IA e console limpo;
- build com Brotli e gzip pré-gerados.

Esses números são referências estruturais, não promessas de FPS idêntico em todo hardware.

## Executar esta implementação

```bash
npm install
npm run dev
```

## Validar esta implementação

```bash
npm test
npm run build
npm run smoke
npm run profile
```

