# Plano: Importação avançada + análise de eventos Lua + previews

Quero confirmar o plano antes de implementar porque é uma alteração grande em várias áreas.

## 1. Importação expandida no `FileUploader`

Adicionar 3 fontes de entrada (além do upload de ficheiros já existente):

- **Selecionar pasta** — input `<input type="file" webkitdirectory />` para carregar uma pasta inteira recursivamente (mantém caminhos relativos).
- **Drag & drop de pastas** — usar `DataTransferItem.webkitGetAsEntry()` para percorrer pastas arrastadas.
- **Importar repositório GitHub** — campo de URL (ex. `https://github.com/MIST145/Off-Target`). Buscar via API pública do GitHub:
  - `GET https://api.github.com/repos/{owner}/{repo}` para obter a branch default
  - `GET https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1` para listar
  - `GET https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}` para cada ficheiro de texto relevante (html/css/js/lua/json/md/fxmanifest)
  - Sem token (limite 60 req/h por IP). Mostrar aviso se atingir o limite e oferecer campo opcional de Personal Access Token guardado só em memória.

Todos os ficheiros recolhidos entram na mesma estrutura "acumulada" atual, mas agora com `path` por ficheiro (não apenas conteúdo concatenado), para preservar a estrutura do projeto.

## 2. Nova estrutura de "Projeto"

Substituir o atual `AccumulatedFiles` (arrays de strings) por:

```ts
type ProjectFile = { path: string; content: string; kind: 'html'|'css'|'js'|'lua'|'json'|'image'|'other' };
type Project = { name: string; files: ProjectFile[]; manifest?: ParsedManifest };
```

A função `onFilesUploaded` passa a receber o `Project` completo em vez de strings concatenadas. O `FiveMEditor` é adaptado para abrir o ficheiro HTML principal (definido pelo `ui_page` do `fxmanifest.lua` quando existe, ou o primeiro `index.html`).

## 3. Analisador de eventos Lua/JS (`src/lib/fivemAnalyzer.ts`)

Novo módulo que percorre os ficheiros e extrai:

- **NUI callbacks Lua**: `RegisterNUICallback('nome', ...)`
- **Mensagens enviadas para a NUI**: `SendNUIMessage({ action = 'x', ... })` / `SendNUIMessage({ type = 'x' })`
- **Eventos FiveM**: `RegisterNetEvent`, `AddEventHandler`, `TriggerEvent`, `TriggerServerEvent`
- **fetchNui / postMessage no JS**: ocorrências de `fetch(\`https://${resource}/evento\`...)` e `window.addEventListener('message', ...)` com os `action`/`type` usados
- **Comandos**: `RegisterCommand('nome', ...)`
- **fxmanifest**: `ui_page`, `files`, `client_scripts`, `shared_scripts`

Resultado: um objeto `AnalysisReport` com listas categorizadas + mapa "que evento do Lua dispara que ação da UI".

## 4. Novo separador "Analysis"

Adicionar ao `FiveMEditor` um 4º separador (`Upload | Analysis | Editor | Preview`) que mostra:

- Resumo do `fxmanifest` (resource name, ui_page, scripts)
- Árvore de ficheiros importados (com filtro por tipo)
- Tabela de eventos NUI ↔ Lua detetados, com origem (ficheiro + linha)
- Botão "Gerar exemplos de UI" → secção 5

## 5. Geração de exemplos de preview

Com base nas mensagens NUI detetadas (`action`/`type` + campos do payload inferidos), gerar uma lista de "cenários" pré-construídos. Cada cenário injeta um `postMessage` no iframe de preview para simular o jogo a enviar a mensagem. Ex.:

- `winch:show { remoteOnTruck: true, hasRamp: true }`
- `winch:setMode { mode: 'rope' }`
- `winch:flash { direction: 'up' }`

Renderizados como cartões clicáveis acima do `PreviewFrame`. O utilizador pode editar o JSON do payload antes de disparar.

## 6. Editor multi-ficheiro

Atualizar o `Editor` para listar todos os ficheiros do `Project` numa sidebar (estilo VSCode simplificado) em vez dos 4 separadores fixos HTML/CSS/JS/Lua. Linguagem do Monaco escolhida pela extensão.

## Detalhes técnicos

- Sem backend: tudo no cliente. GitHub via `fetch` direto.
- Sem dependências novas além das já existentes (Monaco, shadcn). Parser Lua é regex-based (não AST completo) — suficiente para os padrões alvo.
- Ficheiros binários (imagens) do GitHub são guardados como URLs `raw.githubusercontent.com` em vez de bytes, e usados diretamente no preview.
- Limite prático: ignorar ficheiros > 500KB e pastas `node_modules`, `.git`, `dist`, `build`.

## Fora de âmbito (perguntar antes de adicionar)

- Persistência dos projetos importados (precisaria Lovable Cloud)
- Suporte a repositórios GitHub privados
- Análise estática de Lua mais profunda (AST real)

Confirma este plano ou queres ajustar alguma parte (ex. tirar o GitHub, simplificar a análise, mudar o layout do separador Analysis)?
