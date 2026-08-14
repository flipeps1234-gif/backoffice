/**
 * The sale flow (new-sale.tsx): pick products → checkout → Paid? →
 * cash/digital. The Owed tab is named inside recurringNote — ES
 * "Por cobrar", PT "A receber"; keep in sync with the shell/owed
 * fragments.
 */
export const messages = {
  "sale.title": {
    en: "New sale",
    es: "Nueva venta",
    pt: "Nova venda",
  },
  "sale.checkout": {
    en: "Checkout",
    es: "Finalizar",
    pt: "Finalizar",
  },
  "sale.noClient": {
    en: "No client",
    es: "Sin cliente",
    pt: "Sem cliente",
  },
  "sale.noItems": {
    en: "no items",
    es: "sin artículos",
    pt: "sem itens",
  },
  "sale.paidQuestion": {
    en: "Paid?",
    es: "¿Pagado?",
    pt: "Foi pago?",
  },
  "sale.noOwesMe": {
    en: "No — owes me",
    es: "No — me debe",
    pt: "Não — me deve",
  },
  "sale.backToDetails": {
    en: "Back to details",
    es: "Volver a los detalles",
    pt: "Voltar aos detalhes",
  },
  "sale.cashOrDigital": {
    en: "Cash or digital?",
    es: "¿Efectivo o digital?",
    pt: "Dinheiro ou digital?",
  },
  "sale.cash": {
    en: "Cash",
    es: "Efectivo",
    pt: "Dinheiro",
  },
  "sale.digital": {
    en: "Digital",
    es: "Digital",
    pt: "Digital",
  },
  "sale.digitalNeedsClient": {
    en: "Digital matching needs a client name — go back and add one, or take it as cash.",
    es: "Vincular un pago digital necesita el nombre del cliente — vuelve y agrega uno, o regístralo como efectivo.",
    pt: "Vincular um pagamento digital exige o nome do cliente — volte e adicione um, ou registre como dinheiro.",
  },
  "sale.whoFor": {
    en: "Who's it for?",
    es: "¿Para quién es?",
    pt: "Para quem é?",
  },
  "sale.clientNamePlaceholder": {
    en: "Client name",
    es: "Nombre del cliente",
    pt: "Nome do cliente",
  },
  "sale.saveAsClient": {
    en: "Save “{name}” as a client",
    es: "Guardar “{name}” como cliente",
    pt: "Salvar “{name}” como cliente",
  },
  "sale.date": {
    en: "Date",
    es: "Fecha",
    pt: "Data",
  },
  "sale.makeRecurring": {
    en: "Make recurring",
    es: "Hacer recurrente",
    pt: "Tornar recorrente",
  },
  "sale.needsClient": {
    en: "(needs a client)",
    es: "(necesita un cliente)",
    pt: "(precisa de um cliente)",
  },
  "sale.cadenceWeekly": {
    en: "Every week",
    es: "Cada semana",
    pt: "Toda semana",
  },
  "sale.cadenceBiweekly": {
    en: "Every 2 weeks",
    es: "Cada 2 semanas",
    pt: "A cada 2 semanas",
  },
  "sale.cadenceMonthly": {
    en: "Every month",
    es: "Cada mes",
    pt: "Todo mês",
  },
  "sale.cadenceEveryN": {
    en: "Every N days",
    es: "Cada N días",
    pt: "A cada N dias",
  },
  "sale.every": {
    en: "Every",
    es: "Cada",
    pt: "A cada",
  },
  "sale.daysStarting": {
    en: "days, starting {date}",
    es: "días, a partir del {date}",
    pt: "dias, a partir de {date}",
  },
  "sale.recurringNote": {
    en: "When due, this adds an unpaid sale to Owed. No reminders, no notifications — it just expects the money.",
    es: "Cuando vence, esto agrega una venta sin pagar a Por cobrar. Sin recordatorios, sin notificaciones — solo espera el dinero.",
    pt: "Quando vence, isso adiciona uma venda não paga em A receber. Sem lembretes, sem notificações — só espera o dinheiro.",
  },
  "sale.backToProducts": {
    en: "Back to products",
    es: "Volver a los productos",
    pt: "Voltar aos produtos",
  },
  "sale.noProducts": {
    en: "No products yet — use the custom amount below, or add products from the home screen first.",
    es: "Aún no hay productos — usa el monto personalizado abajo, o primero agrega productos desde la pantalla de inicio.",
    pt: "Ainda não há produtos — use o valor personalizado abaixo, ou primeiro adicione produtos na tela inicial.",
  },
  "sale.howManySqft": {
    // The pre-i18n template pluralized "sq ft" into "sq fts" — a glitch,
    // not copy to preserve. quickadd.howManySqft already had it right.
    en: "How many sq ft?",
    es: "¿Cuántos pies cuadrados?",
    pt: "Quantos pés quadrados?",
  },
  "sale.howManyHours": {
    en: "How many hours?",
    es: "¿Cuántas horas?",
    pt: "Quantas horas?",
  },
  "sale.howManyRooms": {
    en: "How many rooms?",
    es: "¿Cuántos cuartos?",
    pt: "Quantos cômodos?",
  },
  "sale.fromOriginalSale": {
    en: "from the original sale",
    es: "de la venta original",
    pt: "da venda original",
  },
  "sale.customAmount": {
    en: "Custom amount",
    es: "Monto personalizado",
    pt: "Valor personalizado",
  },
  "sale.customAmountAria": {
    en: "Custom amount in dollars",
    es: "Monto personalizado en dólares",
    pt: "Valor personalizado em dólares",
  },
  "sale.customLabelAria": {
    en: "What was it for",
    es: "Para qué fue",
    pt: "Para que foi",
  },
  "sale.customLabelPlaceholder": {
    en: "What for? (optional)",
    es: "¿Para qué? (opcional)",
    pt: "Para quê? (opcional)",
  },
  // Proof-of-work at checkout (photo + note), v0.6.
  "sale.addProof": {
    en: "Add a note or photo (optional)",
    es: "Agregar una nota o foto (opcional)",
    pt: "Adicionar uma nota ou foto (opcional)",
  },
  "sale.noteLabel": {
    en: "Note",
    es: "Nota",
    pt: "Nota",
  },
  "sale.notePlaceholder": {
    en: "Anything worth remembering about this job…",
    es: "Algo que valga la pena recordar de este trabajo…",
    pt: "Algo que valha a pena lembrar deste trabalho…",
  },
  "sale.photoAdd": {
    en: "Add a photo",
    es: "Agregar una foto",
    pt: "Adicionar uma foto",
  },
  "sale.photoReading": {
    en: "Reading photo…",
    es: "Leyendo la foto…",
    pt: "Lendo a foto…",
  },
  "sale.photoRemove": {
    en: "Remove photo",
    es: "Quitar la foto",
    pt: "Remover a foto",
  },
  "sale.photoAlt": {
    en: "Photo attached to this sale",
    es: "Foto adjunta a esta venta",
    pt: "Foto anexada a esta venda",
  },
  "sale.photoError": {
    en: "Couldn't read that photo. The sale can still be logged without it.",
    es: "No pudimos leer esa foto. Igual puedes registrar la venta sin ella.",
    pt: "Não conseguimos ler essa foto. Você ainda pode registrar a venda sem ela.",
  },
} as const;
