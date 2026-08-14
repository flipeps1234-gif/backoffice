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
  // ---- v0.6.5 tax story ----
  "dash.setAsideTitle": {
    en: "Q{q} tax set-aside — general info",
    es: "Apartado para impuestos T{q} — información general",
    pt: "Reserva para impostos T{q} — informação geral",
  },
  "dash.setAsideBody": {
    en: "Business income this quarter: {income}. Many self-employed people set aside 20–30% for taxes — 25% of this quarter would be {amount}.",
    es: "Ingresos del negocio este trimestre: {income}. Muchas personas que trabajan por su cuenta apartan 20–30% para impuestos — el 25% de este trimestre sería {amount}.",
    pt: "Renda do negócio neste trimestre: {income}. Muitos autônomos separam 20–30% para impostos — 25% deste trimestre seria {amount}.",
  },
  "dash.setAsideNotAdvice": {
    en: "General information, not tax advice — your number depends on your situation.",
    es: "Información general, no asesoría fiscal — tu número depende de tu situación.",
    pt: "Informação geral, não consultoria fiscal — seu número depende da sua situação.",
  },
  "dash.mileageTitle": {
    en: "Mileage (estimate)",
    es: "Millas recorridas (estimado)",
    pt: "Milhas rodadas (estimativa)",
  },
  "dash.mileageSummary.one": {
    en: "{visits} visit · {miles} miles round trip in {year}",
    es: "{visits} visita · {miles} millas ida y vuelta en {year}",
    pt: "{visits} visita · {miles} milhas ida e volta em {year}",
  },
  "dash.mileageSummary.many": {
    en: "{visits} visits · {miles} miles round trip in {year}",
    es: "{visits} visitas · {miles} millas ida y vuelta en {year}",
    pt: "{visits} visitas · {miles} milhas ida e volta em {year}",
  },
  "dash.mileageNote": {
    en: "Computed from each client's round-trip distance × the sales you logged. Never GPS.",
    es: "Calculado con la distancia ida y vuelta de cada cliente × las ventas que registraste. Nunca GPS.",
    pt: "Calculado com a distância ida e volta de cada cliente × as vendas registradas. Nunca GPS.",
  },
  "dash.mileageCsv": {
    en: "Download mileage CSV",
    es: "Descargar CSV de millas",
    pt: "Baixar CSV de milhas",
  },
  "dash.proofButton": {
    en: "Proof of income — print or save as PDF",
    es: "Comprobante de ingresos — imprimir o guardar como PDF",
    pt: "Comprovante de renda — imprimir ou salvar como PDF",
  },
  "dash.proofTitle": {
    en: "Proof of income",
    es: "Comprobante de ingresos",
    pt: "Comprovante de renda",
  },
  "dash.proofGenerated": {
    en: "Generated {date}",
    es: "Generado el {date}",
    pt: "Gerado em {date}",
  },
  "dash.proofMonth": {
    en: "Month",
    es: "Mes",
    pt: "Mês",
  },
  "dash.proofIncome": {
    en: "Business income",
    es: "Ingresos del negocio",
    pt: "Renda do negócio",
  },
  "dash.proofTotal": {
    en: "Total",
    es: "Total",
    pt: "Total",
  },
  "dash.proofMileage": {
    en: "Estimated business mileage in {year}: {miles} miles (client distances × logged visits).",
    es: "Millas de negocio estimadas en {year}: {miles} millas (distancias de clientes × visitas registradas).",
    pt: "Milhas de negócio estimadas em {year}: {miles} milhas (distâncias dos clientes × visitas registradas).",
  },
  "dash.proofDisclaimer": {
    en: "Prepared from records the account owner logged in contado. Informational — not a verified or audited statement.",
    es: "Preparado con los registros que el dueño de la cuenta anotó en contado. Informativo — no es un estado verificado ni auditado.",
    pt: "Preparado com os registros que o dono da conta anotou no contado. Informativo — não é um demonstrativo verificado nem auditado.",
  },
  "dash.proofPrint": {
    en: "Print / save as PDF",
    es: "Imprimir / guardar como PDF",
    pt: "Imprimir / salvar como PDF",
  },
} as const;
