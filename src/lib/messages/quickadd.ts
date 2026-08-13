/**
 * Quick-add: the amount-first numpad and its save-as-service prompt.
 * Unit words ship as .one/.many pairs — the component picks with a
 * ternary. Money stays $ en-US; only the words around it change.
 */
export const messages = {
  "quickadd.titlePaid": {
    en: "Log a cash payment",
    es: "Registra un pago en efectivo",
    pt: "Registre um pagamento em dinheiro",
  },
  "quickadd.titleSpent": {
    en: "Log money you spent",
    es: "Registra dinero que gastaste",
    pt: "Registre dinheiro que você gastou",
  },
  "quickadd.directionGroup": {
    en: "Money in or out",
    es: "Dinero que entra o sale",
    pt: "Dinheiro entrando ou saindo",
  },
  "quickadd.gotPaid": {
    en: "Got paid",
    es: "Me pagaron",
    pt: "Me pagaram",
  },
  "quickadd.spent": {
    en: "Spent",
    es: "Gasté",
    pt: "Gastei",
  },
  "quickadd.servicesGroup": {
    en: "Services",
    es: "Servicios",
    pt: "Serviços",
  },
  "quickadd.moneyIn": {
    en: "Money in",
    es: "Dinero que entra",
    pt: "Dinheiro entrando",
  },
  "quickadd.moneyOut": {
    en: "Money out",
    es: "Dinero que sale",
    pt: "Dinheiro saindo",
  },
  "quickadd.howManySqft": {
    en: "How many sq ft?",
    es: "¿Cuántos pies cuadrados?",
    pt: "Quantos pés quadrados?",
  },
  "quickadd.howManyHours": {
    en: "How many hours?",
    es: "¿Cuántas horas?",
    pt: "Quantas horas?",
  },
  "quickadd.howManyRooms": {
    en: "How many rooms?",
    es: "¿Cuántos cuartos?",
    pt: "Quantos cômodos?",
  },
  "quickadd.usual": {
    en: "{name}'s usual: {amount}",
    es: "{name} suele pagar {amount}",
    pt: "{name} costuma pagar {amount}",
  },
  "quickadd.usualWithSize": {
    en: "{name}'s usual: {amount} ({qty} {unit})",
    es: "{name} suele pagar {amount} ({qty} {unit})",
    pt: "{name} costuma pagar {amount} ({qty} {unit})",
  },
  "quickadd.unitHour.one": { en: "hour", es: "hora", pt: "hora" },
  "quickadd.unitHour.many": { en: "hours", es: "horas", pt: "horas" },
  "quickadd.unitRoom.one": { en: "room", es: "cuarto", pt: "cômodo" },
  "quickadd.unitRoom.many": { en: "rooms", es: "cuartos", pt: "cômodos" },
  "quickadd.unitSqft.one": {
    en: "sq ft",
    es: "pie cuadrado",
    pt: "pé quadrado",
  },
  "quickadd.unitSqft.many": {
    en: "sq ft",
    es: "pies cuadrados",
    pt: "pés quadrados",
  },
  "quickadd.amountLogged": {
    en: "{amount} logged",
    es: "{amount} registrado",
    pt: "{amount} registrado",
  },
  "quickadd.amountLoggedOut": {
    en: "−{amount} logged",
    es: "−{amount} registrado",
    pt: "−{amount} registrado",
  },
  "quickadd.deleteKey": { en: "Delete", es: "Borrar", pt: "Apagar" },
  "quickadd.business": { en: "Business", es: "Negocio", pt: "Negócio" },
  "quickadd.personal": { en: "Personal", es: "Personal", pt: "Pessoal" },
  "quickadd.whoPaidLabel": {
    en: "Who paid (optional)",
    es: "Quién pagó (opcional)",
    pt: "Quem pagou (opcional)",
  },
  "quickadd.whereLabel": {
    en: "Where (optional)",
    es: "Dónde (opcional)",
    pt: "Onde (opcional)",
  },
  "quickadd.namePlaceholder": { en: "Name", es: "Nombre", pt: "Nome" },
  "quickadd.wherePlaceholder": {
    en: "Gas station",
    es: "Gasolinera",
    pt: "Posto de gasolina",
  },
  "quickadd.dateLabel": { en: "Date", es: "Fecha", pt: "Data" },
  "quickadd.saveAndAdd": {
    en: "Save & add another",
    es: "Guardar y agregar otro",
    pt: "Salvar e adicionar outro",
  },
  "quickadd.savePromptTitle": {
    en: "Save this as a service for one-tap logging?",
    es: "¿Guardar esto como servicio para registrarlo con un toque?",
    pt: "Salvar isto como serviço para registrar com um toque?",
  },
  "quickadd.jobNameLabel": {
    en: "What do you call this job?",
    es: "¿Cómo llamas a este trabajo?",
    pt: "Como você chama esse trabalho?",
  },
  "quickadd.jobNamePlaceholder": {
    en: "Lawn mowing",
    es: "Corte de césped",
    pt: "Corte de grama",
  },
  "quickadd.pricingLegend": {
    en: "How do you price it?",
    es: "¿Cómo lo cobras?",
    pt: "Como você cobra?",
  },
  "quickadd.pricingFlat": {
    en: "Flat {amount}",
    es: "Fijo {amount}",
    pt: "Fixo {amount}",
  },
  "quickadd.perUnit": {
    en: "per {unit}",
    es: "por {unit}",
    pt: "por {unit}",
  },
  "quickadd.ratePriceLabel": {
    en: "Price per {unit}",
    es: "Precio por {unit}",
    pt: "Preço por {unit}",
  },
  "quickadd.costLabel": {
    en: "What it costs you (optional)",
    es: "Lo que te cuesta (opcional)",
    pt: "Quanto custa para você (opcional)",
  },
  "quickadd.costLabelPer": {
    en: "What it costs you per {unit} (optional)",
    es: "Lo que te cuesta por {unit} (opcional)",
    pt: "Quanto custa para você por {unit} (opcional)",
  },
  "quickadd.costPlaceholder": {
    en: "gas, supplies…",
    es: "gasolina, materiales…",
    pt: "gasolina, materiais…",
  },
  "quickadd.saveService": {
    en: "Save service",
    es: "Guardar servicio",
    pt: "Salvar serviço",
  },
  "quickadd.noThanks": {
    en: "No thanks",
    es: "No, gracias",
    pt: "Agora não",
  },
} as const;
