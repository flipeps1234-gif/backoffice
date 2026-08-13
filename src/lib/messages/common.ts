/**
 * Strings shared across screens. Every fragment prefixes its keys with its
 * domain ("common.", "sale.", …) so twelve files can merge into one
 * dictionary without collisions — a harness asserts that stays true.
 *
 * Translation stance (applies to every fragment):
 * - Plain language, short sentences, same 6th-grade register as the EN.
 * - ES is neutral Latin American ("tú"); PT is Brazilian ("você").
 * - Never translated: contado, Venmo, Cash App, Zelle, CSV, Schedule C,
 *   product names the user typed. Money stays $ — the audience works in
 *   the US; the LANGUAGE changes, the currency does not.
 */
export const messages = {
  "common.close": { en: "Close", es: "Cerrar", pt: "Fechar" },
  "common.cancel": { en: "Cancel", es: "Cancelar", pt: "Cancelar" },
  "common.save": { en: "Save", es: "Guardar", pt: "Salvar" },
  "common.back": { en: "Back", es: "Atrás", pt: "Voltar" },
  "common.add": { en: "Add", es: "Agregar", pt: "Adicionar" },
  "common.edit": { en: "Edit", es: "Editar", pt: "Editar" },
  "common.total": { en: "Total", es: "Total", pt: "Total" },
  "common.logAgain": {
    en: "Log again",
    es: "Registrar otra vez",
    pt: "Registrar de novo",
  },
  "common.gotCash": {
    en: "Got cash",
    es: "Recibí efectivo",
    pt: "Recebi em dinheiro",
  },
  "common.dismiss": { en: "Dismiss", es: "Descartar", pt: "Dispensar" },
  "common.undo": { en: "Undo", es: "Deshacer", pt: "Desfazer" },
  "common.continue": { en: "Continue", es: "Continuar", pt: "Continuar" },
  "common.yes": { en: "Yes", es: "Sí", pt: "Sim" },
  "common.no": { en: "No", es: "No", pt: "Não" },
  "common.language": { en: "Language", es: "Idioma", pt: "Idioma" },
} as const;
