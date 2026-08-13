/**
 * The insights card ("what we found"), the running-totals bar, and the
 * history list — the payoff screens after a batch is confirmed. Day labels
 * (Today/Yesterday) and the history row tags live here too.
 */
export const messages = {
  "insights.sectionLabel": {
    en: "Insights",
    es: "Hallazgos",
    pt: "Descobertas",
  },
  "insights.title": {
    en: "What we found",
    es: "Lo que encontramos",
    pt: "O que encontramos",
  },
  "insights.totalRead": {
    en: "Total read",
    es: "Total leído",
    pt: "Total lido",
  },
  "insights.busiestDay": {
    en: "Busiest day",
    es: "Día más ocupado",
    pt: "Dia mais movimentado",
  },
  "insights.bestDay": {
    en: "Best day",
    es: "Mejor día",
    pt: "Melhor dia",
  },
  "insights.topPayer": {
    en: "Top payer",
    es: "Quien más pagó",
    pt: "Quem mais pagou",
  },
  "insights.noIncome": {
    en: "No income in this batch",
    es: "Sin ingresos en este lote",
    pt: "Sem receita neste lote",
  },
  "insights.noDatesRead": {
    en: "No dates were readable in these screenshots",
    es: "No se pudieron leer fechas en estas capturas",
    pt: "Não deu para ler datas nessas capturas",
  },
  "insights.noNames": {
    en: "No names on these payments",
    es: "Sin nombres en estos pagos",
    pt: "Sem nomes nesses pagamentos",
  },
  "insights.personal": {
    en: "Personal",
    es: "Personal",
    pt: "Pessoal",
  },
  "insights.business": {
    en: "Business",
    es: "Negocio",
    pt: "Negócio",
  },
  "insights.spent": {
    en: "−{amount} spent",
    es: "−{amount} gastado",
    pt: "−{amount} gasto",
  },
  "insights.items.one": {
    en: "{n} item",
    es: "{n} movimiento",
    pt: "{n} item",
  },
  "insights.items.many": {
    en: "{n} items",
    es: "{n} movimientos",
    pt: "{n} itens",
  },
  "insights.owed": {
    en: "+ {amount} owed",
    es: "+ {amount} por cobrar",
    pt: "+ {amount} a receber",
  },
  "insights.leftToSort": {
    en: "{n} left to sort",
    es: "{n} por clasificar",
    pt: "{n} para classificar",
  },
  "insights.history": {
    en: "History",
    es: "Historial",
    pt: "Histórico",
  },
  "insights.emptyHistory": {
    en: "Nothing sorted yet. Payments land here once you've swiped them.",
    es: "Aún no hay nada clasificado. Los pagos llegan aquí cuando los deslizas.",
    pt: "Nada classificado ainda. Os pagamentos aparecem aqui depois que você desliza.",
  },
  "insights.today": {
    en: "Today",
    es: "Hoy",
    pt: "Hoje",
  },
  "insights.yesterday": {
    en: "Yesterday",
    es: "Ayer",
    pt: "Ontem",
  },
  "insights.noDate": {
    en: "No date",
    es: "Sin fecha",
    pt: "Sem data",
  },
  "insights.expense": {
    en: "expense",
    es: "gasto",
    pt: "despesa",
  },
  "insights.cash": {
    en: "Cash",
    es: "Efectivo",
    pt: "Dinheiro",
  },
  "insights.screenshot": {
    en: "Screenshot",
    es: "Captura",
    pt: "Captura",
  },
  "insights.personalTag": {
    en: "personal",
    es: "personal",
    pt: "pessoal",
  },
  "insights.noName": {
    en: "No name",
    es: "Sin nombre",
    pt: "Sem nome",
  },
  // Detail composition for the three instant insights — the lib returns
  // numbers, the component stitches these. EN concatenation is
  // byte-identical to the pre-v0.6 English sentences.
  "insights.paymentCount.one": {
    en: "{count} payment",
    es: "{count} pago",
    pt: "{count} pagamento",
  },
  "insights.paymentCount.many": {
    en: "{count} payments",
    es: "{count} pagos",
    pt: "{count} pagamentos",
  },
  "insights.expenseTail.one": {
    en: ", −{amount} in {count} expense",
    es: ", −{amount} en {count} gasto",
    pt: ", −{amount} em {count} despesa",
  },
  "insights.expenseTail.many": {
    en: ", −{amount} in {count} expenses",
    es: ", −{amount} en {count} gastos",
    pt: ", −{amount} em {count} despesas",
  },
  "insights.noDatesTail": {
    en: ", no dates read",
    es: ", sin fechas leídas",
    pt: ", sem datas lidas",
  },
  "insights.onDate": {
    en: " on {date}",
    es: " el {date}",
    pt: " em {date}",
  },
  "insights.dateRangeTail": {
    en: ", {first} – {last}",
    es: ", {first} – {last}",
    pt: ", {first} – {last}",
  },
  "insights.acrossPayments.one": {
    en: "{amount} across {count} payment",
    es: "{amount} en {count} pago",
    pt: "{amount} em {count} pagamento",
  },
  "insights.acrossPayments.many": {
    en: "{amount} across {count} payments",
    es: "{amount} en {count} pagos",
    pt: "{amount} em {count} pagamentos",
  },
} as const;
