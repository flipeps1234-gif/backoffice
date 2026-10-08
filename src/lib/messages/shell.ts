/**
 * The app shell: the screenshot drop zone and the upload progress bar.
 * Brand names (Venmo, Cash App, Zelle) stay untranslated in every language.
 */
export const messages = {
  "shell.dropReading": {
    en: "Reading them now…",
    es: "Leyéndolas ahora…",
    pt: "Lendo agora…",
  },
  "shell.dropHere": {
    en: "Drop them here",
    es: "Suéltalas aquí",
    pt: "Solte aqui",
  },
  "shell.dropPrompt": {
    en: "Add screenshots of your payments",
    es: "Agrega capturas de tus pagos",
    pt: "Adicione capturas dos seus pagamentos",
  },
  "shell.dropBusyHint": {
    en: "Hang on — this takes a few seconds.",
    es: "Espera — esto tarda unos segundos.",
    pt: "Aguarde — isso leva alguns segundos.",
  },
  "shell.dropHint": {
    // "Several", not a number: the web reads any selection, four files per
    // request (chunkForUpload), so api/extract's 20-per-request cap never
    // binds here, while the iPhone picker stops at 20. What does bound a
    // day is the fair-use limit, explained in the help center.
    en: "Venmo, Cash App, or Zelle. Pick several at once — or drag them in.",
    es: "Venmo, Cash App o Zelle. Elige varias a la vez — o arrástralas aquí.",
    pt: "Venmo, Cash App ou Zelle. Escolha várias de uma vez — ou arraste para cá.",
  },
  "shell.working": {
    en: "Working…",
    es: "Trabajando…",
    pt: "Trabalhando…",
  },
} as const;
