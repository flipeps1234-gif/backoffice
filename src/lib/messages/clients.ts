/**
 * The clients screen: list (who owes what), detail with notes edit, sale
 * history, and the recurring-template edit/pause/resume/end controls.
 */
export const messages = {
  "clients.title": { en: "Clients", es: "Clientes", pt: "Clientes" },
  "clients.allClients": {
    en: "← All clients",
    es: "← Todos los clientes",
    pt: "← Todos os clientes",
  },
  "clients.name": { en: "Name", es: "Nombre", pt: "Nome" },
  "clients.notes": { en: "Notes", es: "Notas", pt: "Notas" },
  "clients.notesPlaceholder": {
    en: "Gate code, dog's name, prefers Tuesdays…",
    es: "Código del portón, nombre del perro, prefiere los martes…",
    pt: "Código do portão, nome do cachorro, prefere terças…",
  },
  "clients.owes": { en: "Owes", es: "Debe", pt: "Deve" },
  "clients.recurring": { en: "Recurring", es: "Recurrente", pt: "Recorrente" },
  "clients.sale": { en: "Sale", es: "Venta", pt: "Venda" },
  "clients.ended": {
    en: "ended {date}",
    es: "terminó el {date}",
    pt: "terminou em {date}",
  },
  "clients.next": {
    en: "next {date}",
    es: "próximo {date}",
    pt: "próximo {date}",
  },
  "clients.paused": { en: "paused", es: "en pausa", pt: "pausado" },
  "clients.pause": { en: "Pause", es: "Pausar", pt: "Pausar" },
  "clients.resume": { en: "Resume", es: "Reanudar", pt: "Retomar" },
  "clients.end": { en: "End", es: "Terminar", pt: "Encerrar" },
  "clients.missedNag": {
    en: "{count} missed — still active? Resume if so, or leave it paused.",
    es: "{count} sin pagar — ¿sigue activo? Reanuda si es así, o déjalo en pausa.",
    pt: "{count} sem pagamento — ainda está ativo? Se sim, retome; se não, deixe pausado.",
  },
  "clients.endConfirm": {
    en: "End for good? It stops expecting this money — no resume. Past sales stay in the history.",
    es: "¿Terminar para siempre? Deja de esperar este dinero — no se puede reanudar. Las ventas pasadas quedan en el historial.",
    pt: "Encerrar de vez? Deixa de esperar esse dinheiro — sem retomar. As vendas passadas ficam no histórico.",
  },
  "clients.endIt": { en: "End it", es: "Terminarlo", pt: "Encerrar mesmo" },
  "clients.keep": { en: "Keep", es: "Mantener", pt: "Manter" },
  "clients.custom": { en: "Custom", es: "Personalizado", pt: "Personalizado" },
  "clients.each": {
    en: "{amount} each",
    es: "{amount} cada uno",
    pt: "{amount} cada",
  },
  "clients.customLine": {
    en: "custom line",
    es: "línea personalizada",
    pt: "linha personalizada",
  },
  "clients.quantityOf": {
    en: "Quantity of {name}",
    es: "Cantidad de {name}",
    pt: "Quantidade de {name}",
  },
  "clients.removeItem": {
    en: "Remove {name}",
    es: "Quitar {name}",
    pt: "Remover {name}",
  },
  "clients.customAmountAria": {
    en: "Custom amount in dollars",
    es: "Monto personalizado en dólares",
    pt: "Valor personalizado em dólares",
  },
  "clients.whatFor": {
    en: "What for?",
    es: "¿Para qué?",
    pt: "Para quê?",
  },
  "clients.customForAria": {
    en: "What the custom amount is for",
    es: "Para qué es el monto personalizado",
    pt: "Para que é o valor personalizado",
  },
  "clients.futureOnly": {
    en: "Future instances only — past sales keep what they were charged.",
    es: "Solo aplica a las próximas — las ventas pasadas conservan lo que se cobró.",
    pt: "Só vale para as próximas — as vendas passadas mantêm o que foi cobrado.",
  },
  "clients.saveChanges": {
    en: "Save changes",
    es: "Guardar cambios",
    pt: "Salvar alterações",
  },
  "clients.history": { en: "History", es: "Historial", pt: "Histórico" },
  "clients.noSales": {
    en: "No sales yet.",
    es: "Aún no hay ventas.",
    pt: "Nenhuma venda ainda.",
  },
  "clients.owesYou": { en: "owes you", es: "te debe", pt: "deve a você" },
  "clients.paidWaiting": {
    en: "paid, waiting to match",
    es: "pagado, esperando vincular",
    pt: "pago, esperando vincular",
  },
  "clients.paidCash": {
    en: "paid cash",
    es: "pagó en efectivo",
    pt: "pagou em dinheiro",
  },
  "clients.paid": { en: "paid", es: "pagado", pt: "pago" },
  "clients.empty": {
    en: "No clients yet. They save themselves when you log sales — name a client at checkout and tap “save”.",
    es: "Aún no hay clientes. Se guardan solos cuando registras ventas — pon el nombre del cliente al cobrar y toca “guardar”.",
    pt: "Nenhum cliente ainda. Eles se salvam sozinhos quando você registra vendas — coloque o nome do cliente ao cobrar e toque em “salvar”.",
  },
  "clients.recurringPaused": {
    en: "recurring paused",
    es: "recurrente en pausa",
    pt: "recorrente pausado",
  },
  "clients.owesAmount": {
    en: "owes {amount}",
    es: "debe {amount}",
    pt: "deve {amount}",
  },
  // Numeric cadence display on template cards ("Every 9 days"). The
  // sale.cadence* keys cover the fixed cadences; this one takes the count.
  "clients.everyNDays": {
    en: "Every {days} days",
    es: "Cada {days} días",
    pt: "A cada {days} dias",
  },
  "clients.distanceLabel": {
    en: "Distance from home, round trip (miles) — optional",
    es: "Distancia desde tu casa, ida y vuelta (millas) — opcional",
    pt: "Distância da sua casa, ida e volta (milhas) — opcional",
  },
  "clients.distanceHint": {
    en: "Typed once, used to estimate mileage from your logged visits. Never GPS, never tracking.",
    es: "Se escribe una vez y sirve para estimar las millas según tus visitas registradas. Nunca GPS, nunca rastreo.",
    pt: "Digitada uma vez, usada para estimar as milhas pelas visitas registradas. Nunca GPS, nunca rastreamento.",
  },
  "clients.salePhotoAlt": {
    en: "Photo from this sale — tap to enlarge",
    es: "Foto de esta venta — toca para ampliar",
    pt: "Foto desta venda — toque para ampliar",
  },
} as const;
