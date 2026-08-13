/**
 * The dashboard: money in vs out, revenue and margin by service, and the
 * two CSV exports. Amounts stay $ en-US everywhere; only the words change.
 * CSV contents and download filenames are deliberately not translated —
 * they go to English-speaking tax preparers.
 */
export const messages = {
  "dash.title": {
    en: "Dashboard",
    es: "Panel",
    pt: "Painel",
  },
  "dash.empty": {
    en: "Nothing here yet — sort some business payments first.",
    es: "Aquí no hay nada todavía — primero ordena algunos pagos del negocio.",
    pt: "Nada aqui ainda — primeiro organize alguns pagamentos do negócio.",
  },
  "dash.noDate": {
    en: "No date",
    es: "Sin fecha",
    pt: "Sem data",
  },
  "dash.moneyInOut": {
    en: "Money in vs out",
    es: "Dinero que entra vs sale",
    pt: "Dinheiro que entra vs sai",
  },
  "dash.kept": {
    en: "kept: {amount}",
    es: "te quedó: {amount}",
    pt: "sobrou: {amount}",
  },
  "dash.revenueByService": {
    en: "Revenue by service",
    es: "Ingresos por servicio",
    pt: "Receita por serviço",
  },
  "dash.jobs.one": {
    en: "{n} job",
    es: "{n} trabajo",
    pt: "{n} trabalho",
  },
  "dash.jobs.many": {
    en: "{n} jobs",
    es: "{n} trabajos",
    pt: "{n} trabalhos",
  },
  "dash.marginByService": {
    en: "Margin by service",
    es: "Margen por servicio",
    pt: "Margem por serviço",
  },
  "dash.marginNote": {
    en: "Estimates, from the cost you set on each service — planning numbers, not tax numbers. The export below uses only what you actually logged.",
    es: "Estimaciones, según el costo que pusiste en cada servicio — números para planear, no para impuestos. La exportación de abajo usa solo lo que realmente registraste.",
    pt: "Estimativas, com base no custo que você definiu em cada serviço — números para planejar, não para impostos. A exportação abaixo usa só o que você realmente registrou.",
  },
  "dash.marginMath": {
    en: "{in} in − {cost} est. costs",
    es: "{in} que entró − {cost} en costos est.",
    pt: "{in} que entrou − {cost} em custos est.",
  },
  "dash.missingSize.one": {
    en: "{n} job missing size, left out entirely",
    es: "{n} trabajo sin tamaño, quedó fuera por completo",
    pt: "{n} trabalho sem tamanho, ficou de fora por completo",
  },
  "dash.missingSize.many": {
    en: "{n} jobs missing size, left out entirely",
    es: "{n} trabajos sin tamaño, quedaron fuera por completo",
    pt: "{n} trabalhos sem tamanho, ficaram de fora por completo",
  },
  "dash.downloadTax": {
    en: "Download CSV for your tax preparer",
    es: "Descargar CSV para tu preparador de impuestos",
    pt: "Baixar CSV para seu contador",
  },
  "dash.taxNote": {
    en: "Actual business income and expenses, oldest first. Estimates are never included.",
    es: "Ingresos y gastos reales del negocio, los más antiguos primero. Las estimaciones nunca se incluyen.",
    pt: "Receitas e despesas reais do negócio, os mais antigos primeiro. Estimativas nunca são incluídas.",
  },
  "dash.downloadAll": {
    en: "Download everything",
    es: "Descargar todo",
    pt: "Baixar tudo",
  },
  "dash.allNote": {
    en: "Every row you've logged — business, personal and not yet sorted — with a column saying which is which. Your data, whenever you want it.",
    es: "Cada fila que registraste — negocio, personal y sin ordenar — con una columna que dice cuál es cuál. Tus datos, cuando los quieras.",
    pt: "Cada linha que você registrou — negócio, pessoal e ainda sem organizar — com uma coluna dizendo qual é qual. Seus dados, quando você quiser.",
  },
} as const;
