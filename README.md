# Issue Queue Prioritizer

> Projeto desenvolvido durante a pós-graduação em **Engenharia de Software com IA Aplicada**, no módulo de Fundamentos de IA e LLMs — com o professor **Erick Wendel**.

A proposta do módulo era replicar um sistema de recomendação com banco vetorial, simulação de produção e rede neural treinada com TensorFlow.js. Decidi aplicar o conceito diretamente no meu dia a dia como desenvolvedor: **priorizar automaticamente a fila de cards do issue tracker com base no meu próprio histórico de resolução.**

---

## Como funciona

O sistema conecta na API do issue tracker, coleta os cards que já resolvi e quanto tempo cada um levou. Com esses dados, passa por três fases:

### Fase 1 — Embeddings (representação semântica)

O título e a descrição de cada card são concatenados e transformados num vetor de **512 números** pelo **Universal Sentence Encoder (USE)**. Cards semanticamente parecidos ficam próximos no espaço vetorial, o que permite que a rede neural generalize por significado — não por palavras-chave.

```text
"Fix login bug on mobile" → [0.12, -0.45, 0.03, ... 512 valores]
```

Esses vetores são armazenados no **ChromaDB** para reutilização — se o mesmo card aparecer novamente, o embedding não é recalculado.

### Fase 2 — Treinamento da rede neural

Com os embeddings dos cards já resolvidos, treina uma rede neural de regressão em um **Worker Thread** dedicado (não bloqueia o servidor durante o treino):

- **Entrada (X):** vetor de 512 dimensões do embedding do card
- **Saída (y):** `hoursToResolve` normalizado entre 0 e 1

A arquitetura se adapta ao volume de dados — veja a seção [Rede neural](#arquitetura) para detalhes.

O modelo aprende a associar "esse tipo de texto" com "esse número de horas", com base no histórico de quem treinou. Os pesos são persistidos em `data/model/model.json` junto com o min/max das horas para desnormalização.

> Cards sem worklog registrado recebem automaticamente o mínimo de **40 minutos** (`hoursToResolve`) para não serem descartados do treinamento.

### Fase 3 — Predição e priorização

Para cada card **em aberto**, o sistema:

1. Gera o embedding do texto
2. Consulta os 100 cards mais similares no ChromaDB (busca vetorial)
3. Passa o embedding pelo modelo treinado → desnormaliza para horas reais
4. Ordena todos os cards do menor para o maior tempo estimado
5. Marca quais cabem no dia (`fitsToday`) com base nas horas disponíveis informadas

```text
Issue Tracker API → embeddings (USE) → ChromaDB
                                  ↓
              card em aberto → predict (TF.js) → tempo estimado → fila priorizada
```

---

## Stack

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4-FF6F00?logo=tensorflow&logoColor=white&style=flat-square)
![ChromaDB](https://img.shields.io/badge/ChromaDB-3-orange?style=flat-square)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white&style=flat-square)

| Camada | Tecnologia |
| ------ | ---------- |
| Frontend | React 19 + TypeScript + Tailwind CSS |
| Backend | Express 5 + Node.js |
| ML | TensorFlow.js + Universal Sentence Encoder |
| Banco vetorial | ChromaDB (Docker) |
| Embeddings | `@tensorflow-models/universal-sentence-encoder` (512 dims) |

---

## Arquitetura

```text
Browser (React + TypeScript)
  ↓ SSE: /sync-cards  SSE: /train  POST: /recommend
Express (server/)
  ├── routes/sync-cards  →  Worker Thread (syncWorker)
  │     └── TrackerService  →  Jira API (batch 10, worklog por card)
  ├── routes/train       →  Worker Thread (trainWorker)
  │     ├── EmbeddingService  →  Universal Sentence Encoder
  │     └── ChromaService     →  ChromaDB (upsert + query)
  ├── routes/recommend   →  ModelCache (TF.js model em memória)
  └── config/constants   →  MIN_HOURS, MODEL_PATH, AI_START_DATE...
ChromaDB (Docker, porta 8000)
```

**Rede neural** — regressão para prever horas de resolução.

A arquitetura se adapta ao tamanho do dataset de treinamento:

| Cards | Arquitetura | Regularização |
| ----- | ----------- | ------------- |
| < 300 | Dense(512→64, relu) → Dense(64→32, relu) → Dense(1) | — |
| 300–1000 | Dense(512→128, relu) → Dropout(0.2) → Dense(128→64, relu) → Dense(1) | Dropout 20% |
| > 1000 | Dense(512→256, relu) → Dropout(0.2) → Dense(256→128, relu) → Dense(128→64, relu) → Dense(1) | Dropout 20% |

**Por que essas escolhas?**

- **`inputShape: [512]`** — fixo, é o tamanho do vetor gerado pelo USE. Não há escolha aqui.
- **Units por camada** — cada camada reduz pela metade para forçar representações progressivamente mais comprimidas. Para datasets pequenos (~200 cards), redes grandes overfittam facilmente, por isso começa menor.
- **Dropout** — ativado a partir de 300 cards. Desativa 20% dos neurônios aleatoriamente a cada batch durante o treino, impedindo que a rede memorize exemplos específicos. Funciona como regularização sem aumentar o dataset.
- **`meanSquaredError`** — padrão para regressão contínua. Penaliza erros grandes mais que pequenos (eleva ao quadrado), o que é desejável: estimar 10h quando são 2h deve ser penalizado mais que estimar 2.5h.
- **Adam (lr=0.001)** — otimizador adaptativo padrão; converge bem sem ajuste fino de hiperparâmetros.

```text
Optimizer: Adam (lr=0.001) | Loss: MSE | Epochs: 100 | Batch: 32
```

O treinamento acontece em um **Worker Thread** dedicado (não bloqueia o event loop do servidor) via SSE com progresso em tempo real no frontend. O modelo é persistido em `data/model/model.json` e carregado em memória no primeiro `/recommend`.

---

## Rodando o projeto

### Pré-requisitos

- Node.js 20+
- Docker

### Instalação

```bash
# 1. Suba o ChromaDB
docker run -p 8000:8000 chromadb/chroma --name meu_chroma

# 2. Clone e instale
git clone <url>
cd workload-predictor
npm install

# 3. Configure o ambiente
cp .env.example .env
# Edite o .env com suas credenciais do issue tracker
```

### Modo demonstração (sem issue tracker)

Para rodar sem precisar de credenciais do issue tracker, use os dados de exemplo incluídos no repositório:

```bash
# No .env, defina:
DEMO_MODE=true
VITE_DEMO_MODE=true
```

```bash
npm run dev
```

Acesse `http://localhost:3000`, clique em **Treinar modelo** e depois em **Priorizar fila**.

### Modo produção (com issue tracker real)

```bash
# No .env, configure:
TRACKER_EMAIL=seu@email.com
TRACKER_API_TOKEN=seu_token
TRACKER_BASE_URL=https://sua-empresa.atlassian.net
TRACKER_ACCOUNT_ID=seu_account_id
TRACKER_PROJECT_KEY=PROJ
DEMO_MODE=false
VITE_DEMO_MODE=false
```

```bash
npm run dev
```

No app: **Sincronizar dados do tracker** → **Treinar modelo** → **Priorizar fila**.

---

## Fluxo de dados detalhado

### O que são embeddings

Embedding é a transformação de texto em um vetor de números que representa o **significado semântico** da frase — não as palavras literais. Textos com sentido parecido ficam próximos no espaço vetorial mesmo usando vocabulários diferentes:

```text
"corrigir bug no login"    → [0.12, -0.45, 0.87, ..., 0.33]  ← próximos
"erro na tela de acesso"   → [0.11, -0.43, 0.85, ..., 0.31]  ←

"implementar nova feature" → [0.91,  0.22, -0.10, ..., 0.67]  ← distante
```

Isso permite que a rede neural generalize por significado: se ela aprendeu que "bug no login" leva ~2h, vai estimar de forma parecida para "erro na autenticação" — sem nunca ter visto esse texto antes.

### Separação entre Sincronizar e Treinar

O app separa intencionalmente o ciclo em duas etapas independentes:

**1. Sincronizar dados do tracker** (`/sync-cards`)

- Roda em **Worker Thread** dedicado — o servidor continua respondendo durante a sincronização
- Busca no Jira todos os cards resolvidos com worklog registrado, em batches de 10
- Cards sem worklog recebem o mínimo de **40 minutos** como valor padrão
- Salva localmente em `data/tracker-cards.json`
- Não toca no ChromaDB nem no modelo

**2. Treinar modelo** (`/train`)

- Roda em **Worker Thread** dedicado — não bloqueia o event loop com operações TensorFlow.js
- Lê o `tracker-cards.json` salvo
- Verifica no ChromaDB quais cards **já têm embedding** → reutiliza (cache)
- Gera embeddings (USE) **só para os cards novos** → salva no ChromaDB
- Remove outliers acima do percentil 95 para evitar distorção no range de normalização
- Retreina a rede neural do zero com **todos os cards** (embeddings cacheados + novos)
- Persiste o modelo em `data/model/model.json`

```text
Sincronizar (Worker Thread)
  →  tracker-cards.json  (ChromaDB intocado)
                ↓
Treinar (Worker Thread)
  →  ChromaDB (upsert, nunca apaga)
  →  rede neural retreinada com todos os cards
```

### Por que retreinar do zero toda vez?

O modelo de regressão precisa ver **todos** os dados históricos para calibrar bem os pesos. Treinar só com dados novos (fine-tuning incremental) causaria esquecimento catastrófico — o modelo perderia o padrão aprendido com os cards antigos. Com 100 épocas o treino completo leva poucos segundos no Worker Thread, sem impacto para outros usuários.

### ChromaDB como cache de embeddings

Gerar um embedding passa o texto pelo USE (Universal Sentence Encoder), que é pesado computacionalmente. Como o texto de um card resolvido não muda, o embedding é calculado uma vez e armazenado no ChromaDB. Na próxima vez que Treinar for acionado, `getExistingEmbeddings` recupera os vetores já calculados e só processa os cards novos.

### Ajuste por penalidade de comentários

Além da predição do modelo, o tempo estimado recebe um ajuste:

```text
estimatedHours = max(0.5h, rawHours × accelerationFactor + commentPenalty)
commentPenalty = comentários × 0.25h
```

Cards com muitos comentários tendem a ser mais complexos ou ter mais bloqueios — cada comentário adiciona 15 minutos à estimativa. O `accelerationFactor` reduz o tempo estimado proporcionalmente ao nível de aceleração por IA configurado (0–80%).

---

## O que aprendi

- Como embeddings de texto capturam semântica e permitem busca por similaridade real (não só palavras-chave)
- Como o ChromaDB armazena e consulta vetores de alta dimensão de forma eficiente
- Como treinar e serializar uma rede neural no servidor com TensorFlow.js e reutilizar os pesos em inferência
- Como SSE (Server-Sent Events) entrega progresso em tempo real sem WebSocket — e por que `setImmediate` é necessário para garantir o flush entre batches
- A diferença prática entre busca vetorial (ChromaDB) e predição de regressão (TF.js) — e como combiná-las
- Por que operações CPU-bound com TensorFlow.js bloqueiam o event loop do Node.js e como Worker Threads resolvem isso para múltiplos usuários simultâneos
- Como escalar a arquitetura de uma rede neural com base no volume de dados disponível, adicionando capacidade e regularização (Dropout) progressivamente

---

## Referências

- Pós graduação: Engenharia de Software com IA Aplicada — [UNIPDS](https://unipds.com.br/gads_pos_ia/)
- Professor: [Erick Wendel](https://github.com/ErickWendel)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [ChromaDB](https://docs.trychroma.com)
- [Universal Sentence Encoder](https://tfhub.dev/google/universal-sentence-encoder/4)
