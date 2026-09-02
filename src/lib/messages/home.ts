/**
 * The home screen (upload-screen.tsx): the upload pipeline's progress and
 * errors, batch notices, the sale/match notices, and the main-loop buttons.
 * Plurals are two keys (.one/.many) picked by a ternary in the component.
 */
export const messages = {
  "home.loading": {
    en: "Loading…",
    es: "Cargando…",
    pt: "Carregando…",
  },
  "home.errSaveFailed": {
    en: "Saved on screen but not to your account. Check your connection.",
    es: "Se guardó en pantalla pero no en tu cuenta. Revisa tu conexión.",
    pt: "Salvo na tela, mas não na sua conta. Verifique sua conexão.",
  },
  // The two writes that take their own data back OFF the screen before
  // failing — "saved on screen" would be a lie for them.
  "home.errRecurringNotSaved": {
    en: "A recurring job couldn't be saved. It will come back the next time you open the app.",
    es: "No se pudo guardar un trabajo recurrente. Volverá a aparecer la próxima vez que abras la app.",
    pt: "Um serviço recorrente não pôde ser salvo. Ele volta na próxima vez que você abrir o app.",
  },
  "home.errCashNotSaved": {
    en: "\"Got cash\" didn't save — the job is back in Owed. Try again in a moment.",
    es: "\"Recibí efectivo\" no se guardó — el trabajo volvió a Por cobrar. Intenta de nuevo en un momento.",
    pt: "\"Recebi em dinheiro\" não foi salvo — o serviço voltou para A receber. Tente de novo em instantes.",
  },
  "home.errLoadFailed": {
    en: "Couldn't load your saved payments.",
    es: "No pudimos cargar tus pagos guardados.",
    pt: "Não conseguimos carregar seus pagamentos salvos.",
  },
  "home.noticeRecurringPaused": {
    en: "A recurring sale was paused after 3 misses — check Clients.",
    es: "Una venta recurrente se pausó tras 3 faltas — revisa Clientes.",
    pt: "Uma venda recorrente foi pausada após 3 faltas — veja Clientes.",
  },
  "home.errUploadFailed": {
    en: "Something went wrong reading those. Try again.",
    es: "Algo salió mal al leerlas. Intenta de nuevo.",
    pt: "Algo deu errado na leitura. Tente de novo.",
  },
  "home.errNotImages": {
    en: "Those aren't images. Screenshots or photos of receipts only.",
    es: "Eso no son imágenes. Solo capturas o fotos de recibos.",
    pt: "Isso não são imagens. Só capturas de tela ou fotos de recibos.",
  },
  "home.progressReady": {
    en: "Getting your screenshots ready",
    es: "Preparando tus capturas",
    pt: "Preparando suas capturas",
  },
  "home.progressToShrink": {
    en: "{count} to shrink",
    es: "{count} por comprimir",
    pt: "{count} para comprimir",
  },
  "home.progressOf": {
    en: "{done} of {total}",
    es: "{done} de {total}",
    pt: "{done} de {total}",
  },
  "home.errBadFormat": {
    en: "Couldn't read that format. A screenshot works best — or set your camera to Most Compatible.",
    es: "No pudimos leer ese formato. Una captura de pantalla funciona mejor — o pon tu cámara en Más compatible.",
    pt: "Não conseguimos ler esse formato. Uma captura de tela funciona melhor — ou mude a câmera para Mais compatível.",
  },
  "home.progressReading": {
    en: "Reading your screenshots",
    es: "Leyendo tus capturas",
    pt: "Lendo suas capturas",
  },
  "home.progressBatch": {
    en: "Batch {num} of {total}",
    es: "Lote {num} de {total}",
    pt: "Lote {num} de {total}",
  },
  "home.progressSlow": {
    en: "This is the slow bit — a few seconds.",
    es: "Esta es la parte lenta — unos segundos.",
    pt: "Essa é a parte lenta — alguns segundos.",
  },
  "home.errReadGeneric": {
    en: "Something went wrong reading those.",
    es: "Algo salió mal al leerlas.",
    pt: "Algo deu errado na leitura.",
  },
  "home.errMockBlocked": {
    en: "Reading screenshots is unavailable right now. Nothing was read.",
    es: "Leer capturas no está disponible ahora. No se leyó nada.",
    pt: "A leitura de capturas está indisponível agora. Nada foi lido.",
  },
  "home.errNetwork": {
    en: "Couldn't reach the server. Check your connection and try again.",
    es: "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
    pt: "Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.",
  },
  "home.errNothingBack": {
    en: "Something went wrong reading those, and nothing came back.",
    es: "Algo salió mal al leerlas y no llegó nada.",
    pt: "Algo deu errado na leitura e nada voltou.",
  },
  "home.errNoPayments": {
    en: "We couldn't read any payments from those. Screenshot your Transactions list — a social feed hides the amounts.",
    es: "No pudimos leer ningún pago ahí. Toma captura de tu lista de Transacciones — el feed social esconde los montos.",
    pt: "Não conseguimos ler nenhum pagamento aí. Capture sua lista de Transações — o feed social esconde os valores.",
  },
  "home.ignoredFiles.one": {
    en: "Ignored {count} file we couldn't read.",
    es: "Ignoramos {count} archivo que no pudimos leer.",
    pt: "Ignoramos {count} arquivo que não conseguimos ler.",
  },
  "home.ignoredFiles.many": {
    en: "Ignored {count} files we couldn't read.",
    es: "Ignoramos {count} archivos que no pudimos leer.",
    pt: "Ignoramos {count} arquivos que não conseguimos ler.",
  },
  "home.unsent.one": {
    en: "{count} screenshot was never read — upload it again.",
    es: "{count} captura nunca se leyó — súbela de nuevo.",
    pt: "{count} captura não chegou a ser lida — envie de novo.",
  },
  "home.unsent.many": {
    en: "{count} screenshots were never read — upload them again.",
    es: "{count} capturas nunca se leyeron — súbelas de nuevo.",
    pt: "{count} capturas não chegaram a ser lidas — envie de novo.",
  },
  "home.skippedDupes.one": {
    en: "Skipped {count} payment already on your ledger.",
    es: "Omitimos {count} pago que ya estaba en tu libro.",
    pt: "Pulamos {count} pagamento que já estava no seu livro.",
  },
  "home.skippedDupes.many": {
    en: "Skipped {count} payments already on your ledger.",
    es: "Omitimos {count} pagos que ya estaban en tu libro.",
    pt: "Pulamos {count} pagamentos que já estavam no seu livro.",
  },
  "home.matched.one": {
    en: "{count} payment matched to sales you'd logged.",
    es: "{count} pago se emparejó con ventas que registraste.",
    pt: "{count} pagamento foi vinculado a vendas que você registrou.",
  },
  "home.matched.many": {
    en: "{count} payments matched to sales you'd logged.",
    es: "{count} pagos se emparejaron con ventas que registraste.",
    pt: "{count} pagamentos foram vinculados a vendas que você registrou.",
  },
  "home.alreadySettled": {
    en: "Already settled — nothing changed.",
    es: "Ya estaba resuelto — nada cambió.",
    pt: "Já estava resolvido — nada mudou.",
  },
  "home.paidDone": {
    en: "{amount} — paid, done.",
    es: "{amount} — pagado, listo.",
    pt: "{amount} — pago, pronto.",
  },
  "home.matchedTo": {
    en: "Matched to {payer} on {date}.",
    es: "Emparejado con {payer} el {date}.",
    pt: "Vinculado a {payer} em {date}.",
  },
  "home.aPayment": {
    en: "a payment",
    es: "un pago",
    pt: "um pagamento",
  },
  "home.yourLedger": {
    en: "your ledger",
    es: "tu libro",
    pt: "seu livro",
  },
  "home.markedPaid": {
    en: "Marked paid — we'll match it in your next screenshots.",
    es: "Marcado como pagado — lo emparejaremos en tus próximas capturas.",
    pt: "Marcado como pago — vamos vincular nas suas próximas capturas.",
  },
  "home.pickBelow": {
    en: "{count} payments could be this sale — pick below.",
    es: "{count} pagos podrían ser esta venta — elige abajo.",
    pt: "{count} pagamentos podem ser esta venda — escolha abaixo.",
  },
  "home.savedOwes": {
    en: "Saved — {name} owes {amount}.",
    es: "Guardado — {name} debe {amount}.",
    pt: "Salvo — {name} deve {amount}.",
  },
  "home.fallbackClient": {
    en: "client",
    es: "cliente",
    pt: "cliente",
  },
  "home.noMatchFound": {
    en: "No payment on your ledger matches that amount and window.",
    es: "Ningún pago en tu libro coincide con ese monto y esas fechas.",
    pt: "Nenhum pagamento no seu livro bate com esse valor e esse período.",
  },
  "home.matchedShort": {
    en: "Matched.",
    es: "Emparejado.",
    pt: "Vinculado.",
  },
  "home.signOut": {
    en: "Sign out",
    es: "Cerrar sesión",
    pt: "Sair",
  },
  "home.demoBanner": {
    en: "Shared test account — everyone who types the demo word sees what you save here. Try everything; don't put real numbers in.",
    es: "Cuenta de prueba compartida — todos los que escriben la palabra demo ven lo que guardas aquí. Prueba todo; no pongas números reales.",
    pt: "Conta de teste compartilhada — todo mundo que digita a palavra demo vê o que você salva aqui. Teste tudo; não coloque números reais.",
  },
  "home.snap": {
    en: "Snap a receipt, check, or statement",
    es: "Toma foto de un recibo, cheque o estado de cuenta",
    pt: "Tire foto de um recibo, cheque ou extrato",
  },
  "home.newSale": {
    en: "New sale",
    es: "Nueva venta",
    pt: "Nova venda",
  },
  "home.products": {
    en: "Products & services",
    es: "Productos y servicios",
    pt: "Produtos e serviços",
  },
  "home.clients": {
    en: "Clients",
    es: "Clientes",
    pt: "Clientes",
  },
  "home.logExpense": {
    en: "Log an expense",
    es: "Registrar un gasto",
    pt: "Registrar um gasto",
  },
  "home.owed": {
    en: "Owed",
    // Must match owed.title — the button names the tab it opens. QA caught
    // "Te deben" here vs "Por cobrar" there; the tab's name wins.
    es: "Por cobrar",
    pt: "A receber",
  },
  "home.history": {
    en: "History",
    es: "Historial",
    pt: "Histórico",
  },
  "home.dashboard": {
    en: "Dashboard",
    es: "Panel",
    pt: "Painel",
  },
  "home.sugPayment": {
    en: "A {amount} payment from {payer} could be one of these sales:",
    es: "Un pago de {amount} de {payer} podría ser una de estas ventas:",
    pt: "Um pagamento de {amount} de {payer} pode ser uma destas vendas:",
  },
  "home.someone": {
    en: "someone",
    es: "alguien",
    pt: "alguém",
  },
  "home.sugSale": {
    en: "This {amount} sale could match one of these payments:",
    es: "Esta venta de {amount} podría coincidir con uno de estos pagos:",
    pt: "Esta venda de {amount} pode combinar com um destes pagamentos:",
  },
  "home.fallbackSale": {
    en: "Sale",
    es: "Venta",
    pt: "Venda",
  },
  "home.fallbackPayment": {
    en: "Payment",
    es: "Pago",
    pt: "Pagamento",
  },
  "home.noDate": {
    en: "no date",
    es: "sin fecha",
    pt: "sem data",
  },
  "home.noneOfThese": {
    en: "None of these",
    es: "Ninguno de estos",
    pt: "Nenhum destes",
  },
  "home.looksRight": {
    en: "Looks right — start sorting",
    es: "Se ve bien — empezar a ordenar",
    pt: "Está certo — começar a separar",
  },
  "home.allSortedInOut": {
    en: "All sorted. That's your money, in and out.",
    es: "Todo ordenado. Ese es tu dinero, entradas y salidas.",
    pt: "Tudo separado. Esse é seu dinheiro, entradas e saídas.",
  },
  "home.allSortedIn": {
    en: "All sorted. That's your money in.",
    es: "Todo ordenado. Ese es el dinero que entró.",
    pt: "Tudo separado. Esse é o dinheiro que entrou.",
  },
  "home.undoLast": {
    en: "Undo last",
    es: "Deshacer lo último",
    pt: "Desfazer o último",
  },
  "home.addMore": {
    en: "Add more screenshots",
    es: "Agregar más capturas",
    pt: "Adicionar mais capturas",
  },
  "home.savedToAccount": {
    en: "Saved to your account. It'll be here next time you open this on any device.",
    es: "Guardado en tu cuenta. Estará aquí la próxima vez que abras esto en cualquier dispositivo.",
    pt: "Salvo na sua conta. Vai estar aqui na próxima vez que você abrir isto em qualquer aparelho.",
  },
  "home.saveFailedNote": {
    en: "Some of this is on screen only — a save didn't reach your account. Stay on this page and check your connection; closing the tab now would lose it.",
    es: "Parte de esto está solo en pantalla — un guardado no llegó a tu cuenta. Quédate en esta página y revisa tu conexión; si cierras la pestaña ahora, se pierde.",
    pt: "Parte disto está só na tela — um salvamento não chegou à sua conta. Fique nesta página e verifique sua conexão; se fechar a aba agora, isso se perde.",
  },
  "home.clearStartOver": {
    en: "Clear and start over",
    es: "Borrar y empezar de nuevo",
    pt: "Limpar e começar de novo",
  },
  "home.notSignedIn": {
    en: "Not signed in, so nothing is saved. Clearing loses these totals.",
    es: "No has iniciado sesión, así que nada se guarda. Si borras, pierdes estos totales.",
    pt: "Você não está conectado, então nada é salvo. Se limpar, perde estes totais.",
  },
  // Extraction warnings (lib/extract/types.ts names the codes; the words
  // live here so all three languages get them, Venmo-detection included).
  "home.warnNoAmounts": {
    en: "This looks like the Venmo social feed, which hides amounts. Screenshot your Transactions tab instead.",
    es: "Esto parece el feed social de Venmo, que oculta los montos. Mejor toma captura de tu pestaña Transactions.",
    pt: "Isto parece o feed social do Venmo, que esconde os valores. Tire um print da sua aba Transactions.",
  },
  "home.warnNotAFeed": {
    en: "We couldn't find a payment list in this image.",
    es: "No encontramos una lista de pagos en esta imagen.",
    pt: "Não encontramos uma lista de pagamentos nesta imagem.",
  },
  "home.warnUnreadable": {
    en: "This image was too blurry or too small to read. Try again, closer.",
    es: "La imagen estaba muy borrosa o muy pequeña para leerla. Intenta de nuevo, más de cerca.",
    pt: "A imagem estava borrada ou pequena demais para ler. Tente de novo, mais de perto.",
  },
  "home.recapTitle": {
    en: "Last month — {month}",
    es: "El mes pasado — {month}",
    pt: "Mês passado — {month}",
  },
  "home.recapBody": {
    en: "In {inAmount} · out {outAmount} · kept {kept}",
    es: "Entró {inAmount} · salió {outAmount} · quedó {kept}",
    pt: "Entrou {inAmount} · saiu {outAmount} · sobrou {kept}",
  },
  "home.taxSeason": {
    en: "Tax season — the CSV for your preparer and your proof of income are ready in the Dashboard.",
    es: "Temporada de impuestos — el CSV para tu preparador y tu comprobante de ingresos están listos en el Panel.",
    pt: "Época de impostos — o CSV para o seu contador e o comprovante de renda estão prontos no Painel.",
  },
  "home.finishEntryFirst": {
    en: "Finish or close what you're logging first — then search can take you there.",
    es: "Primero termina o cierra lo que estás registrando — luego la búsqueda te lleva ahí.",
    pt: "Primeiro termine ou feche o que você está registrando — depois a busca leva você até lá.",
  },
} as const;
