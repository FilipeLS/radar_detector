# Radares PR 🚗📷

App Android pessoal que avisa o motorista em tempo real sobre radares, câmeras e pontos de fiscalização no **estado do Paraná**. Desenvolvido para funcionar **100% offline**, sem nenhum dado saindo do aparelho.

---

## Objetivo

Auxiliar motoristas em período de habilitação (PPD) e demais condutores a manterem-se dentro dos limites de velocidade, evitando multas e aumentando a segurança no trânsito. O app monitora continuamente a posição via GPS e emite alertas sonoros, visuais e de vibração ao se aproximar de pontos de fiscalização.

---

## Funcionalidades

### Monitoramento contínuo
- Serviço em primeiro plano (foreground service) com notificação persistente
- Leitura de GPS ~1 vez por segundo
- Funciona com tela bloqueada e app em segundo plano
- Manter tela ligada automaticamente durante o monitoramento

### Alertas em duas etapas
| Etapa | Distância | Visual | Som | Vibração |
|-------|-----------|--------|-----|----------|
| 1 | ~1.100 m | Faixa amarela no topo | Bipe curto | Pulso curto (200ms) |
| 2 | ~550 m | Tela vermelha piscando | Alarme + 3 bipes | 3 pulsos fortes |

- Contagem regressiva em segundos no overlay de alerta
- Modo noturno automático (20h–06h): tela vermelha escurecida para não ofuscar

### Interface HUD
- Velocímetro analógico estilo aviônica com ponteiro SVG
- Arco de cor dinâmica: verde → amarelo → vermelho conforme se aproxima do limite
- Fundo preto fosco, detalhes em âmbar — alto contraste para uso diário no carro
- Ícone por tipo de ponto: 📷 radar, 🚦 semáforo, 🚔 polícia, 🛣️ pedágio, 〰️ lombada
- Modo paisagem (landscape) para uso em suporte veicular

### Base de dados
- **2.617 pontos** do Paraná embutidos no APK
- Tipos suportados: Radar Fixo, Radar Móvel, Semáforo com Radar, Semáforo com Câmera, Polícia Rodoviária, Pedágio, Lombada
- Totalmente offline — nenhuma chamada de rede

### Marcar Radar Aqui
- Adicionar novos pontos com 1 toque direto da tela principal
- Selecionar tipo e limite de velocidade (opcional)
- Pontos do usuário mesclados automaticamente com a base
- Editar, excluir, exportar e importar pontos em JSON

### Configurações
- Ativar/desativar por tipo de ponto (padrão: Pedágio desligado)
- Voz em pt-BR (desligada por padrão; usa canal de alarme)
- Volume do alarme
- Manter tela ligada durante monitoramento
- Aviso extra quando acima do limite de velocidade

### Privacidade
- Posição usada **apenas em memória** — nenhum histórico de trajeto gravado
- Nenhum dado enviado para servidores
- APK de produção sem permissão `INTERNET`
- Sem analytics, telemetria ou rastreamento

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| UI | React 18 + TypeScript + Vite |
| Mobile | Capacitor 7 |
| GPS background | `@capacitor-community/background-geolocation` |
| Voz | `@capacitor-community/text-to-speech` |
| Tela ligada | `@capacitor-community/keep-awake` |
| Storage | `@capacitor/preferences` |
| Áudio | Web Audio API |
| Build Android | Gradle 9.1 + AGP 8.7 |

---

## Estrutura do projeto

```
src/
├── data/
│   └── radares_pr.json          # Base com 2.617 pontos do PR
├── lib/
│   ├── alertEngine.js           # Motor de alertas (não modificar)
│   └── alertEngine.d.ts         # Tipagem TypeScript
├── services/
│   ├── gps.ts                   # Wrapper GPS + foreground service + mock
│   ├── alerts.ts                # Dispatcher: GPS → motor → visual + áudio
│   ├── audio.ts                 # Bipe, alarme, TTS, Web Audio API
│   ├── storage.ts               # Configurações e pontos do usuário
│   └── dataset.ts               # Carrega base, mescla pontos, valida import
├── ui/
│   ├── Home.tsx                 # Tela principal — velocímetro HUD
│   ├── AlertOverlay.tsx         # Faixa amarela / tela vermelha piscando
│   ├── Settings.tsx             # Configurações
│   ├── MyPoints.tsx             # Gerenciar pontos do usuário
│   └── Disclaimer.tsx           # Aviso inicial
└── App.tsx                      # Orquestração geral
```

---

## Como buildar

### Pré-requisitos
- Node.js 18+
- Java 17+ (testado com Java 25 + Gradle 9.1)
- Android Studio ou Android SDK (API 22+)

### Instalação

```bash
npm install
```

### Desenvolvimento no browser (com GPS simulado)

```bash
VITE_MOCK_GPS=true npm run dev
```

Abre em `http://localhost:5173` com GPS mock simulando aproximação a um radar na BR-376.

### Build para Android

```bash
npm run build
npx cap sync
cd android
./gradlew assembleDebug
```

APK gerado em:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Build de produção (sem permissão INTERNET)

```bash
cd android
./gradlew assembleRelease
```

APK em:
```
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

> **Nota:** o build de release remove automaticamente a permissão `INTERNET` via `tools:node="remove"` no `AndroidManifest.xml`.

---

## Instalação no celular

O app não está na Play Store — instalação manual via APK:

1. No celular: **Configurações → Segurança → Fontes desconhecidas** (ou "Instalar apps desconhecidos")
2. Transferir o APK via WhatsApp, Telegram, cabo USB ou qualquer outro meio
3. Abrir o arquivo no celular e instalar

### Recomendado para uso contínuo
- Desativar otimização de bateria para o app: **Configurações → Bateria → Otimização → Radares PR → Não otimizar**
- Ativar "Manter tela ligada" nas configurações do app

---

## Cenários de teste

| # | Cenário | Esperado |
|---|---------|----------|
| T1 | Chegando de frente a 90 km/h | Etapa 1 a ~1.100 m, etapa 2 a ~550 m |
| T2 | Erro lateral de 60 m | Mesmos avisos (±50 m) |
| T3 | Já passou e se afasta | Nenhum alerta |
| T4 | Velocidade < 15 km/h | Nenhum alerta |
| T5 | Volta pelo mesmo radar após > 1,5 km | Avisa de novo |
| T6 | GPS sem heading | Continua avisando |
| T7 | Dois pontos próximos | Avisa só o mais próximo |
| T8 | Tela bloqueada | Vibração e alarme tocam |
| T9 | Importar JSON inválido | Rejeita, base preservada |
| T10 | APK release | Sem permissão INTERNET |

---

## Limitações conhecidas (Fase 1)

- **Overlay sobre outros apps** (ex.: Waze): na fase 1 só som e vibração funcionam com outro app na frente. Overlay requer permissão de sobreposição → fase 2.
- **Execução em segundo plano**: alguns fabricantes (Samsung, Xiaomi) podem pausar o WebView mesmo com foreground service. Desativar otimização de bateria resolve na maioria dos casos.
- **Sentido da pista**: a base não informa o sentido — o app avisa nos dois sentidos por segurança.
- **Qualidade da base**: pode haver pontos desatualizados ou faltando. Use "Marcar Radar Aqui" para corrigir.

---

## Fase 2 (planejado)

- [ ] Overlay nativo sobre outros apps (Kotlin plugin)
- [ ] Motor de alertas em serviço nativo para aparelhos que pausam o WebView
- [ ] Atualização da base por QR Code ou arquivo compartilhado
- [ ] Notificação expandida com info do radar em segundo plano
- [ ] Estatísticas de sessão (radares passados, alertas emitidos)

---

## Aviso legal

> A base de dados pode estar desatualizada ou incompleta. **Respeite sempre os limites de velocidade e a sinalização de trânsito.** Este app é uma ferramenta auxiliar — a responsabilidade pela condução segura é sempre do motorista.

---

## Licença

Uso pessoal. Não destinado à distribuição pública.
