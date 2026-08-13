/**
 * The confirmation sheet and the swipe deck — the "check every row, then
 * swipe" half of the core loop. Plurals are .one/.many pairs; the
 * component picks with a ternary.
 */
export const messages = {
  "sheet.found": {
    en: "{list} found",
    es: "Encontramos {list}",
    pt: "Encontramos {list}",
  },
  "sheet.paymentCount.one": {
    en: "1 payment",
    es: "1 pago",
    pt: "1 pagamento",
  },
  "sheet.paymentCount.many": {
    en: "{count} payments",
    es: "{count} pagos",
    pt: "{count} pagamentos",
  },
  "sheet.expenseCount.one": {
    en: "1 expense",
    es: "1 gasto",
    pt: "1 despesa",
  },
  "sheet.expenseCount.many": {
    en: "{count} expenses",
    es: "{count} gastos",
    pt: "{count} despesas",
  },
  "sheet.needsLook.one": {
    en: "1 row needs a quick look",
    es: "1 fila necesita un vistazo rápido",
    pt: "1 linha precisa de uma olhada rápida",
  },
  "sheet.needsLook.many": {
    en: "{count} rows need a quick look",
    es: "{count} filas necesitan un vistazo rápido",
    pt: "{count} linhas precisam de uma olhada rápida",
  },
  "sheet.needsLookTail": {
    en: "— the highlighted fields are the ones we weren't sure about.",
    es: "— los campos resaltados son los que nos generaron duda.",
    pt: "— os campos destacados são os que geraram dúvida.",
  },
  "sheet.moneyOut": {
    en: "money out",
    es: "dinero que sale",
    pt: "dinheiro que sai",
  },
  "sheet.moneyIn": {
    en: "money in",
    es: "dinero que entra",
    pt: "dinheiro que entra",
  },
  "sheet.tapToFlip": {
    en: "· tap to flip",
    es: "· toca para cambiar",
    pt: "· toque para trocar",
  },
  "sheet.paidTo": { en: "Paid to", es: "Pagado a", pt: "Pago para" },
  "sheet.whoPaid": { en: "Who paid", es: "Quién pagó", pt: "Quem pagou" },
  "sheet.namePlaceholder": { en: "Name", es: "Nombre", pt: "Nome" },
  "sheet.amount": { en: "Amount", es: "Monto", pt: "Valor" },
  "sheet.date": { en: "Date", es: "Fecha", pt: "Data" },
  "sheet.note": { en: "Note", es: "Nota", pt: "Nota" },
  "sheet.optionalPlaceholder": {
    en: "optional",
    es: "opcional",
    pt: "opcional",
  },
  "sheet.cardAria": {
    en: "{payer}, {amount}. Right arrow for business, left arrow for personal.",
    es: "{payer}, {amount}. Flecha derecha para negocio, flecha izquierda para personal.",
    pt: "{payer}, {amount}. Seta direita para negócio, seta esquerda para pessoal.",
  },
  "sheet.cardAriaOut": {
    en: "Expense, money out: {payer}, {amount}. Right arrow for business, left arrow for personal.",
    es: "Gasto, dinero que sale: {payer}, {amount}. Flecha derecha para negocio, flecha izquierda para personal.",
    pt: "Despesa, dinheiro que sai: {payer}, {amount}. Seta direita para negócio, seta esquerda para pessoal.",
  },
  "sheet.unknownPayer": { en: "Unknown", es: "Desconocido", pt: "Desconhecido" },
  "sheet.noDate": { en: "no date", es: "sin fecha", pt: "sem data" },
  "sheet.business": { en: "Business", es: "Negocio", pt: "Negócio" },
  "sheet.personal": { en: "Personal", es: "Personal", pt: "Pessoal" },
  "sheet.undoLast": {
    en: "Undo last",
    es: "Deshacer último",
    pt: "Desfazer último",
  },
} as const;
