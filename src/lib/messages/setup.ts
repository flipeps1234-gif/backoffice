/**
 * The welcome tour (setup-wizard.tsx) — 2026-09-10, reshaped 2026-09-11:
 * four screens shown once per account, the business profile FIRST with
 * "Not now" as the exit. Every line here describes what the app does
 * TODAY: screenshots become rows, rows get swiped, owed jobs and a tax
 * CSV. Nothing about notifications, SMS or Google — those are dark or
 * off, and a tour that promises them is a broken promise on the first
 * screen.
 */
export const messages = {
  "setup.header": {
    en: "Welcome",
    es: "Te damos la bienvenida",
    pt: "Boas-vindas",
  },
  // Review mode (Settings → "Show the welcome tour"): the account has
  // been using the app, so the header names the tour rather than
  // welcoming them again — same nouns as settings.showTour.
  "setup.headerReview": {
    en: "The welcome tour",
    es: "El recorrido de bienvenida",
    pt: "O tour de boas-vindas",
  },
  "setup.stepOf": {
    en: "Step {current} of {total}",
    es: "Paso {current} de {total}",
    pt: "Passo {current} de {total}",
  },
  // The business step's way out: no profile today, straight to the
  // books. Ends the tour like Skip does (the row is created, blank or
  // with whatever was typed), so the question is asked once, not on
  // every open; Settings has the tour again.
  "setup.notNow": {
    en: "Not now",
    es: "Ahora no",
    pt: "Agora não",
  },
  "setup.continue": {
    en: "Continue",
    es: "Continuar",
    pt: "Continuar",
  },
  "setup.back": {
    en: "Back",
    es: "Atrás",
    pt: "Voltar",
  },
  "setup.skip": {
    en: "Skip for now",
    es: "Omitir por ahora",
    pt: "Pular por enquanto",
  },
  "setup.finish": {
    en: "Go to my books",
    es: "Ir a mi libro",
    pt: "Ir para o meu livro",
  },
  "setup.saving": {
    en: "Saving…",
    es: "Guardando…",
    pt: "Salvando…",
  },
  "setup.saveFailed": {
    en: "Couldn't save to your account. Check your connection and try again.",
    es: "No se pudo guardar en tu cuenta. Revisa tu conexión e inténtalo de nuevo.",
    pt: "Não deu para salvar na sua conta. Verifique sua conexão e tente de novo.",
  },
  // Review mode (Settings → "Show the welcome tour"): the same exit
  // button, but there is no setup to skip — it just closes.
  "setup.close": {
    en: "Close",
    es: "Cerrar",
    pt: "Fechar",
  },
  // ---- 1. business (the first thing a new account sees) ----
  "setup.businessTitle": {
    en: "Set up your business",
    es: "Configura tu negocio",
    pt: "Configure seu negócio",
  },
  // This is the first sentence a new account reads (there is no welcome
  // screen before it), so it names its subject and what the two exports
  // are — nothing here may lean on a screen that no longer exists.
  "setup.businessIntro": {
    en: "Your name and state go on top of the tax-ready CSV and the proof of income you can export later — nothing else uses them. Everything here is optional; you can change it in Settings.",
    // "el estado donde trabajas", not "tu estado" (which reads as status
    // or mood before the field label is in view), and "CSV de impuestos"
    // — the name the Settings hint uses for the same file.
    es: "Tu nombre y el estado donde trabajas van al inicio del CSV de impuestos y del comprobante de ingresos que puedes exportar después — nada más los usa. Todo es opcional, y luego lo cambias en Ajustes.",
    pt: "Seu nome e seu estado vão no topo do CSV de impostos e do comprovante de renda que você pode exportar depois — nada mais usa isso. Tudo é opcional, e depois dá para mudar em Configurações.",
  },
  // ---- 2. services ----
  "setup.servicesTitle": {
    en: "What do you charge for?",
    es: "¿Qué cobras?",
    pt: "O que você cobra?",
  },
  "setup.servicesIntro": {
    en: "Add a few services with their price. Each one is saved like any product and shows up when you log a sale. You can add more later under Products & services.",
    es: "Agrega algunos servicios con su precio. Cada uno se guarda como cualquier producto y aparece cuando registras una venta. Luego puedes agregar más en Productos y servicios.",
    pt: "Adicione alguns serviços com o preço. Cada um é salvo como qualquer produto e aparece quando você registra uma venda. Depois dá para adicionar mais em Produtos e serviços.",
  },
  "setup.addService": {
    en: "Add a service",
    es: "Agregar un servicio",
    pt: "Adicionar um serviço",
  },
  "setup.noServicesYet": {
    en: "Nothing yet — that's fine, you can continue without any.",
    es: "Nada todavía — no pasa nada, puedes continuar sin ninguno.",
    pt: "Nada ainda — tudo bem, você pode continuar sem nenhum.",
  },
  // ---- 3. try ----
  "setup.tryTitle": {
    en: "Try a swipe",
    es: "Prueba deslizar",
    pt: "Experimente deslizar",
  },
  "setup.tryCaption": {
    en: "These rows are practice — nothing here is saved to your books.",
    es: "Estas filas son de práctica — nada de esto se guarda en tu libro.",
    pt: "Estas linhas são de treino — nada aqui é salvo no seu livro.",
  },
  "setup.tryReset": {
    en: "Start over",
    es: "Empezar de nuevo",
    pt: "Recomeçar",
  },
  // ---- 4. done ----
  "setup.doneTitle": {
    en: "You're set",
    es: "Todo listo",
    pt: "Tudo pronto",
  },
  "setup.doneIntro": {
    en: "Three ways to log money, all on the home screen:",
    es: "Tres formas de registrar dinero, todas en la pantalla de inicio:",
    pt: "Três formas de registrar dinheiro, todas na tela inicial:",
  },
  "setup.done1": {
    en: "Upload screenshots — tap the box at the top to pick them, then confirm each row.",
    es: "Subir capturas — toca el recuadro de arriba para elegirlas y confirma cada fila.",
    // "capturas", not "prints": this line points at the hub's own box,
    // whose label reads "Adicione capturas…" (shell.dropPrompt).
    pt: "Enviar capturas — toque no quadro de cima para escolher e confirme cada linha.",
  },
  "setup.done2": {
    en: "Log an expense — a quick numpad for cash you spent.",
    es: "Registrar un gasto — un teclado rápido para lo que gastaste.",
    pt: "Registrar um gasto — um teclado rápido para o que você gastou.",
  },
  "setup.done3": {
    en: "New sale — what you did, for whom, and whether it's paid or still owed.",
    es: "Nueva venta — qué hiciste, para quién, y si está pagado o aún te lo deben.",
    pt: "Nova venda — o que você fez, para quem, e se está pago ou ainda devem.",
  },
  "setup.doneAgain": {
    en: "You can see this tour again from Settings.",
    es: "Puedes ver este recorrido otra vez desde Ajustes.",
    pt: "Você pode ver este tour de novo em Configurações.",
  },
} as const;
