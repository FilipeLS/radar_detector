# Spec — App "Radares PR" (APK Android, uso pessoal)

> Cole este documento no Kiro (ou salve em `.kiro/specs/radares-pr/`). Está organizado em Requisitos → Design → Tarefas, com critérios de aceite testáveis para o Q.A.

---

## 1. Contexto e objetivo

App Android **só para uso pessoal** (instalado por APK, sem Play Store) que avisa o motorista quando está chegando perto de radares e outros pontos de fiscalização no **Paraná**, para evitar multas. O usuário está em período de permissão para dirigir (PPD) e não pode tomar multas.

O app funciona **100% offline** e **a localização nunca sai do aparelho**.

## 2. Escopo

**Dentro do escopo (fase 1)**
- Monitorar a posição por GPS, inclusive com a tela bloqueada ou o app em segundo plano.
- Alertar em duas etapas (≈1 km e ≈500 m) com aviso visual e sonoro.
- Tela principal simples com velocidade, limite e distância ao próximo ponto.
- Botão "Marcar radar aqui" para o usuário incluir/corrigir pontos.
- Configurações básicas (tipos de ponto, voz, volume).

**Fora do escopo (NÃO fazer)**
- Backend, Supabase, login, contas, analytics, anúncios, rastreamento remoto.
- Mapa interativo, rotas, navegação.
- Overlay sobre outros apps (fica para fase 2).
- Qualquer envio de dados pela rede.

## 3. Stack

- **Capacitor** + **React + TypeScript + Vite** (projeto Android gerado com `npx cap add android`).
- Plugins candidatos (verificar compatibilidade com a versão atual do Capacitor antes de instalar; justificar qualquer outro):
  - geolocalização em segundo plano com foreground service (ex.: `@capacitor-community/background-geolocation`);
  - voz em pt-BR (ex.: `@capacitor-community/text-to-speech`);
  - manter a tela ligada (ex.: `@capacitor-community/keep-awake`);
  - armazenamento local (`@capacitor/preferences` ou `@capacitor/filesystem`).
- Sem dependências de rede em runtime.

## 4. Arquivos fornecidos (NÃO reescrever a lógica)

| Arquivo | Destino sugerido | Observação |
|---|---|---|
| `radares_pr.json` | `src/data/radares_pr.json` | Base de 2.617 pontos do PR |
| `alertEngine.js` | `src/lib/alertEngine.js` | Motor de alertas já testado. Criar apenas um `.d.ts` para tipagem. **Não alterar a lógica.** |

Formato de `radares_pr.json`:
```json
{ "meta": { "versao": "...", "tipos": { "RF": "Radar fixo", "RM": "Radar móvel", "SR": "Semáforo com radar", "SC": "Semáforo com câmera", "PRv": "Polícia rodoviária", "PED": "Pedágio", "LOM": "Lombada" } },
  "pontos": [[lat, lon, "RF", 60], ...] }
```
Cada ponto é `[lat, lon, tipo, limite_kmh]` (limite `0` = não informado).

Uso do motor:
```ts
const motor = new AlertEngine(dados /*, config opcional*/);
const eventos = motor.atualizar({ lat, lon, velKmh, heading }); // chamar a cada leitura do GPS
// evento: { id, tipo, etapa(1|2), mensagem, distM, limiteKmh, acimaDoLimite, visual, som, titulo }
```
- `etapa 1` (≈1.100 m): `visual = "amarelo"`, `som = "aviso"`, mensagem "Atenção, radar próximo".
- `etapa 2` (≈550 m): `visual = "vermelho_piscando"`, `som = "alarme"`, mensagem "Devagar, radar a 500 metros".
- A localização é **aproximada de propósito**; não "corrigir" as distâncias para valores exatos.

---

## 5. Requisitos (critérios de aceite)

**R1 — Monitoramento contínuo**
- QUANDO o usuário tocar em "Iniciar", ENTÃO o app SHALL iniciar um serviço em primeiro plano com notificação persistente ("Monitorando radares") e ler o GPS ~1 vez por segundo.
- ENQUANTO monitora, o app SHALL continuar recebendo posição com a tela bloqueada ou com outro app na frente.
- QUANDO o usuário tocar em "Parar", ENTÃO o serviço SHALL encerrar e a notificação desaparecer.

**R2 — Alertas em duas etapas**
- A cada leitura do GPS, o app SHALL chamar `motor.atualizar(...)` e tratar os eventos retornados.
- Cada ponto SHALL gerar no máximo um alerta por etapa por aproximação (o motor já garante; não duplicar).

**R3 — Aviso visual**
- Etapa 1: faixa amarela no topo com o texto da mensagem, visível por ~5 s.
- Etapa 2: tela **vermelha piscando** (~2 Hz) com a mensagem em letras grandes, por ~8 s ou até passar do ponto.
- O aviso visual SHALL aparecer quando o app estiver em primeiro plano (ver limitação na seção 8).

**R4 — Aviso sonoro**
- Etapa 1: bipe curto + voz pt-BR com a mensagem.
- Etapa 2: alarme mais forte + voz pt-BR com a mensagem.
- O som SHALL tocar mesmo com a tela bloqueada e SHALL usar o canal de alarme/navegação (não o volume de mídia), pedindo audio focus e reduzindo a música enquanto toca.
- Se a voz falhar, o app SHALL tocar só o alarme (nunca ficar mudo).

**R5 — Tela principal (modo direção)**
- Mostrar em fonte grande: velocidade atual (GPS), limite do próximo ponto (se houver), distância ao próximo ponto arredondada de 50 em 50 m, status do GPS (ok/sem sinal).
- Botão grande Iniciar/Parar. Interface escura, alto contraste.
- Nenhuma ação obrigatória durante a direção.

**R6 — Configurações**
- Liga/desliga por tipo (RF, RM, SR, SC, PRv, LOM, PED). Padrão: PED desligado, os demais ligados.
- Liga/desliga voz; volume do alarme; manter tela ligada (padrão: ligado ao monitorar).
- Opção "avisar também quando eu estiver acima do limite" (usa `acimaDoLimite` do evento).
- Persistir tudo localmente.

**R7 — Marcar radar aqui**
- Botão grande na tela principal. Ao tocar, abrir seletor de tipo de 1 toque (RF/RM/SR/SC/PRv/LOM) e gravar a posição atual + limite informado (opcional).
- Pontos do usuário ficam em armazenamento local, são **mesclados** com a base ao iniciar o motor e podem ser editados/excluídos numa lista simples.
- Exportar/importar pontos do usuário e substituir a base por um novo `radares_pr.json` (importação manual por arquivo).

**R8 — Offline**
- Base embutida no APK. Nenhuma chamada de rede para localizar, alertar ou atualizar.

**R9 — Privacidade e segurança (padrão "Segurança em Primeiro Lugar")**
- A posição do usuário SHALL ser usada apenas em memória: não gravar histórico de trajetos, não enviar, não logar coordenadas.
- Permissões mínimas: localização precisa, localização em segundo plano, serviço em primeiro plano (localização), notificações. No APK final, **remover a permissão `INTERNET`** do `AndroidManifest.xml` (usar só em debug/live reload).
- Sem chaves, tokens ou segredos no código; sem analytics/telemetria.
- Validar o JSON importado (estrutura, tipos, faixas de lat/lon, tamanho máximo) antes de aceitar; rejeitar arquivo inválido sem quebrar o app.
- Não exibir stack trace ao usuário; erros viram mensagem curta.

**R10 — Segurança ao dirigir e transparência**
- Na primeira abertura, exibir aviso: "A base pode estar desatualizada ou incompleta. Respeite sempre os limites de velocidade e a sinalização."
- Pedir as permissões com explicação clara do motivo.

---

## 6. Design

**Módulos**
```
src/
  data/radares_pr.json
  lib/alertEngine.js (+ .d.ts)        // fornecido
  services/
    gps.ts            // wrapper do plugin de geolocalização (foreground service)
    alerts.ts         // recebe eventos do motor → dispara visual + som + voz
    audio.ts          // bipe/alarme/TTS, canal de alarme, audio focus
    storage.ts        // configurações e pontos do usuário (local)
    dataset.ts        // carrega base + mescla pontos do usuário + valida import
  ui/
    Home.tsx          // modo direção (R5)
    AlertOverlay.tsx  // faixa amarela / tela vermelha piscando (R3)
    Settings.tsx      // R6
    MyPoints.tsx      // R7 (lista/edição/export/import)
  App.tsx
```

**Fluxo:** GPS → `gps.ts` → `motor.atualizar` → eventos → `alerts.ts` → (`AlertOverlay` + `audio.ts`). O motor é recriado quando a base ou as configurações de tipos mudam.

**Wireframe (Home)**
```
┌────────────────────────┐
│   GPS ● ok             │
│                        │
│        87 km/h         │
│                        │
│  Próximo: Radar fixo   │
│  Limite 60 • ~1.150 m  │
│                        │
│  [  PARAR MONITORAR  ] │
│  [  MARCAR RADAR AQUI ]│
│            ⚙ Config    │
└────────────────────────┘
```

---

## 7. Cenários de teste (Q.A.)

Usar uma rota simulada (mock de GPS) a 1 amostra/s contra um radar fixo isolado. Resultados já validados no motor:

| # | Cenário | Esperado |
|---|---|---|
| T1 | Chegando de frente a 90 km/h e a 60 km/h | Etapa 1 a ~1.100 m e etapa 2 a ~550 m, uma vez cada |
| T2 | Mesmo trajeto com erro lateral de 60 m | Mesmos avisos (±50 m) |
| T3 | Já passou do radar e se afasta | Nenhum alerta |
| T4 | Velocidade < 15 km/h | Nenhum alerta |
| T5 | Sentido oposto / volta pelo mesmo radar depois de se afastar > 1,5 km | Avisa de novo (rearma) |
| T6 | GPS sem direção (`heading` nulo) | Continua avisando |
| T7 | Dois pontos próximos | Fala só o mais próximo |
| T8 | Tela bloqueada com serviço ativo | Voz/alarme tocam |
| T9 | Importar JSON inválido | Rejeita com mensagem, base antiga preservada |
| T10 | APK final | Sem permissão `INTERNET`; nenhuma chamada de rede |

Teste em campo: dirigir um trecho conhecido com radar e conferir se os dois avisos tocam em distâncias coerentes.

---

## 8. Limitações conhecidas e fase 2

- **Aviso visual com outro app na frente** (ex.: Waze/Maps): na fase 1 só o som/voz toca. Overlay sobre outros apps exige permissão de sobreposição e plugin nativo (Kotlin) → fase 2.
- **Execução em segundo plano:** confirmar no aparelho real que o JS continua rodando com o serviço em primeiro plano. Se o Android pausar o WebView em alguns aparelhos, mover o motor + som para um serviço nativo (fase 2). Orientar o usuário a desativar a otimização de bateria para o app.
- **Direção da pista:** a base não informa o sentido; o app avisa nos dois sentidos de propósito.
- **Qualidade da base:** pode haver radares faltando ou fora de lugar; o botão "Marcar radar aqui" existe para corrigir.

---

## 9. Tarefas (ordem sugerida)

1. Criar projeto Capacitor + React + TS + Vite; adicionar plataforma Android; copiar `radares_pr.json` e `alertEngine.js`; criar `.d.ts`.
2. `dataset.ts` + `storage.ts`: carregar base, validar, mesclar pontos do usuário.
3. `gps.ts` com serviço em primeiro plano e permissões; modo de simulação (mock) para testes.
4. `alerts.ts` + `audio.ts` (bipe, alarme, TTS, canal de alarme, audio focus).
5. `AlertOverlay.tsx` (faixa amarela e tela vermelha piscando).
6. `Home.tsx` (velocidade, próximo ponto, botões).
7. `Settings.tsx` e `MyPoints.tsx` (R6, R7).
8. Aviso inicial, remoção de `INTERNET` no build final, otimização de bateria.
9. Testes T1–T10; gerar APK (`assembleDebug` ou release assinado) e instalar no aparelho.

## 10. Regras para o agente (escopo cirúrgico)

- Alterar **somente** o que cada tarefa pede; não refatorar o que já funciona.
- Não modificar a lógica de `alertEngine.js` sem pedir confirmação.
- Não adicionar backend, serviços externos ou dependências sem justificar.
- Em caso de dúvida sobre plugin/API, pesquisar a documentação atual do plugin antes de implementar.
- Ao final de cada tarefa: informar o que mudou e como testar.
