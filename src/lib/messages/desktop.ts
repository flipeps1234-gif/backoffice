/**
 * The desktop app (/app on a wide screen; /demooo at any width): the black sidebar and
 * the analytics home. Every other screen inside it is the app's own and
 * keeps its own keys. Words reuse the app's vocabulary on purpose — "Por
 * cobrar"/"A receber" for Owed, "capturas" for screenshots, "te quedó"/
 * "sobrou" for kept — so the two layouts never name one thing two ways.
 */
export const messages = {
  "desktop.nav.label": {
    en: "Main",
    es: "Principal",
    pt: "Principal",
  },
  "desktop.nav.dashboard": {
    en: "Dashboard",
    es: "Panel",
    pt: "Painel",
  },
  "desktop.nav.logSale": {
    en: "Log sale",
    es: "Registrar venta",
    pt: "Registrar venda",
  },
  "desktop.nav.logExpense": {
    en: "Log expense",
    es: "Registrar gasto",
    pt: "Registrar gasto",
  },
  "desktop.nav.owed": {
    en: "Owed",
    es: "Por cobrar",
    pt: "A receber",
  },
  "desktop.nav.clients": {
    en: "Clients",
    es: "Clientes",
    pt: "Clientes",
  },
  "desktop.nav.products": {
    en: "Products and services",
    es: "Productos y servicios",
    pt: "Produtos e serviços",
  },
  "desktop.nav.history": {
    en: "History",
    es: "Historial",
    pt: "Histórico",
  },
  "desktop.nav.upload": {
    en: "Upload screenshots",
    es: "Subir capturas",
    pt: "Enviar capturas",
  },
  "desktop.nav.toCheck.one": {
    en: "{count} to check",
    es: "{count} por revisar",
    pt: "{count} para conferir",
  },
  "desktop.nav.toCheck.many": {
    en: "{count} to check",
    es: "{count} por revisar",
    pt: "{count} para conferir",
  },
  "desktop.nav.owedDot": {
    en: "Someone owes you money",
    es: "Alguien te debe dinero",
    pt: "Alguém deve dinheiro a você",
  },
  "desktop.keptSoFar": {
    en: "Kept so far in {year}",
    es: "Lo que te quedó en {year}",
    pt: "O que sobrou em {year}",
  },
  "desktop.keptIn": {
    en: "Kept in {year}",
    es: "Te quedó en {year}",
    pt: "Sobrou em {year}",
  },
  "desktop.amountIn": {
    en: "{amount} in",
    es: "{amount} entró",
    pt: "{amount} entrou",
  },
  "desktop.amountOut": {
    en: "{amount} out",
    es: "{amount} salió",
    pt: "{amount} saiu",
  },
  "desktop.amountOwed": {
    en: "{amount} still owed",
    es: "{amount} por cobrar",
    pt: "{amount} a receber",
  },
  "desktop.amountExpected": {
    en: "{amount} paid, waiting to match",
    es: "{amount} pagado, esperando coincidir",
    pt: "{amount} pago, aguardando conferir",
  },
  "desktop.revenueYear": {
    en: "Revenue by service, {year}",
    es: "Ingresos por servicio, {year}",
    pt: "Receita por serviço, {year}",
  },
  "desktop.emptyPending": {
    en: "Sort the payments waiting to be checked and they show up here.",
    es: "Clasifica los pagos que esperan revisión y aparecen aquí.",
    pt: "Classifique os pagamentos que esperam conferência e eles aparecem aqui.",
  },
  "desktop.noProducts": {
    en: "No products yet — use the custom amount below, or add them under Products and services first.",
    es: "Aún no hay productos — usa el monto personalizado abajo, o primero agrégalos en Productos y servicios.",
    pt: "Ainda não há produtos — use o valor personalizado abaixo, ou primeiro adicione em Produtos e serviços.",
  },
  "desktop.backupIssue": {
    // No pointer to the red banner: this line follows the STICKY
    // save-failed flag, and the banner (transient) may already be gone.
    en: "Something didn't save to your account — check your connection.",
    es: "Algo no se guardó en tu cuenta — revisa tu conexión.",
    pt: "Algo não foi salvo na sua conta — verifique sua conexão.",
  },
  "desktop.doneIntro": {
    en: "Three ways to log money, all in the menu:",
    es: "Tres formas de registrar dinero, todas en el menú:",
    pt: "Três formas de registrar dinheiro, todas no menu:",
  },
  "desktop.done1": {
    en: "Upload screenshots — pick or drop them in, then confirm each row.",
    es: "Subir capturas — elígelas o arrástralas, y confirma cada fila.",
    pt: "Enviar capturas — escolha ou arraste, e confirme cada linha.",
  },
  "desktop.done2": {
    en: "Log expense — a quick numpad for cash you spent.",
    es: "Registrar gasto — un teclado rápido para lo que gastaste.",
    pt: "Registrar gasto — um teclado rápido para o que você gastou.",
  },
  "desktop.done3": {
    en: "Log sale — what you did, for whom, and whether it's paid or still owed.",
    es: "Registrar venta — qué hiciste, para quién, y si está pagado o aún te lo deben.",
    pt: "Registrar venda — o que você fez, para quem, e se está pago ou ainda devem.",
  },
  "desktop.loadWaiting": {
    en: "Your totals show here once your saved payments load. Reload the page to try again.",
    es: "Tus totales aparecen aquí cuando carguen tus pagos guardados. Recarga la página para intentarlo de nuevo.",
    pt: "Seus totais aparecem aqui quando seus pagamentos salvos carregarem. Recarregue a página para tentar de novo.",
  },
  "desktop.emptyExpected": {
    en: "Sales paid by app show up here once their payment is matched — upload the screenshot of it.",
    es: "Las ventas pagadas por app aparecen aquí cuando su pago coincide — sube la captura del pago.",
    pt: "As vendas pagas por app aparecem aqui quando o pagamento é conferido — envie a captura dele.",
  },
  "desktop.emptyOwed": {
    en: "Sales show up here once they’re paid. What’s owed is in Owed.",
    es: "Las ventas aparecen aquí cuando se pagan. Lo que te deben está en Por cobrar.",
    pt: "As vendas aparecem aqui quando são pagas. O que devem a você está em A receber.",
  },
  "desktop.chart.point": {
    en: "{month}: {amount} {series}",
    es: "{month}: {amount} {series}",
    pt: "{month}: {amount} {series}",
  },
  "desktop.saleOpen": {
    en: "You already have a sale open — finish or close it first.",
    es: "Ya tienes una venta abierta — termínala o ciérrala primero.",
    pt: "Você já tem uma venda aberta — termine ou feche primeiro.",
  },
  "desktop.expenseOpen": {
    en: "You already have an expense open — finish or close it first.",
    es: "Ya tienes un gasto abierto — termínalo o ciérralo primero.",
    pt: "Você já tem um gasto aberto — termine ou feche primeiro.",
  },
  "desktop.chartShows": {
    en: "Chart shows",
    es: "El gráfico muestra",
    pt: "O gráfico mostra",
  },
  "desktop.year": {
    en: "Year",
    es: "Año",
    pt: "Ano",
  },
  "desktop.series.kept": {
    en: "Kept",
    es: "Te quedó",
    pt: "Sobrou",
  },
  "desktop.series.in": {
    en: "In",
    es: "Entró",
    pt: "Entrou",
  },
  "desktop.series.out": {
    en: "Out",
    es: "Salió",
    pt: "Saiu",
  },
  "desktop.chart.kept": {
    en: "Kept, month by month",
    es: "Lo que te quedó, mes a mes",
    pt: "O que sobrou, mês a mês",
  },
  "desktop.chart.in": {
    en: "Money in, month by month",
    es: "Dinero que entró, mes a mes",
    pt: "Dinheiro que entrou, mês a mês",
  },
  "desktop.chart.out": {
    en: "Money out, month by month",
    es: "Dinero que salió, mes a mes",
    pt: "Dinheiro que saiu, mês a mês",
  },
  "desktop.chart.hint": {
    en: "Point at a month · {amount} total",
    es: "Señala un mes · {amount} en total",
    pt: "Aponte para um mês · {amount} no total",
  },

  "desktop.chart.soFar": {
    en: "{month} so far",
    es: "{month} hasta hoy",
    pt: "{month} até hoje",
  },
  "desktop.chart.split": {
    en: "{inAmount} in · {outAmount} out",
    es: "{inAmount} entró · {outAmount} salió",
    pt: "{inAmount} entrou · {outAmount} saiu",
  },
  "desktop.chart.aria": {
    en: "{title}, {year}. {month}: {amount}.",
    es: "{title}, {year}. {month}: {amount}.",
    pt: "{title}, {year}. {month}: {amount}.",
  },
  "desktop.empty": {
    en: "No business money in or out in {year} yet. Upload screenshots, log a cash sale or an expense, and this fills in.",
    es: "Todavía no hay dinero del negocio que entró o salió en {year}. Sube capturas, registra una venta en efectivo o un gasto, y esto se llena.",
    pt: "Ainda não há dinheiro do negócio que entrou ou saiu em {year}. Envie capturas, registre uma venda em dinheiro ou um gasto, e isto se preenche.",
  },
  "desktop.serviceDetail": {
    en: "{name} · {jobs} · avg {amount}",
    es: "{name} · {jobs} · prom. {amount}",
    pt: "{name} · {jobs} · média {amount}",
  },
  "desktop.noService": {
    en: "No service",
    es: "Sin servicio",
    pt: "Sem serviço",
  },
  "desktop.reports": {
    en: "Reports and exports",
    es: "Reportes y exportaciones",
    pt: "Relatórios e exportações",
  },
  "desktop.toCheckBanner.one": {
    en: "{count} payment from your screenshots is waiting to be checked.",
    es: "{count} pago de tus capturas está esperando revisión.",
    pt: "{count} pagamento das suas capturas está esperando conferência.",
  },
  "desktop.toCheckBanner.many": {
    en: "{count} payments from your screenshots are waiting to be checked.",
    es: "{count} pagos de tus capturas están esperando revisión.",
    pt: "{count} pagamentos das suas capturas estão esperando conferência.",
  },
  "desktop.checkNow": {
    en: "Check them",
    es: "Revisarlos",
    pt: "Conferir",
  },
  "desktop.uploadTitle": {
    en: "Upload screenshots",
    es: "Subir capturas",
    pt: "Enviar capturas",
  },
  "desktop.uploadSub": {
    en: "Venmo, Cash App or Zelle activity, or a receipt. We read every payment, you check them, then sort each one.",
    es: "Actividad de Venmo, Cash App o Zelle, o un recibo. Leemos cada pago, tú los revisas y luego clasificas cada uno.",
    pt: "Atividade do Venmo, Cash App ou Zelle, ou um recibo. Lemos cada pagamento, você confere e depois classifica cada um.",
  },
  "desktop.saleSub": {
    en: "A job you did, whether they’ve paid yet or not.",
    es: "Un trabajo que hiciste, ya te hayan pagado o no.",
    pt: "Um trabalho que você fez, tenham pago ou não.",
  },
  "desktop.startSale": {
    en: "Start a new sale",
    es: "Empezar una venta nueva",
    pt: "Começar uma venda nova",
  },
  "desktop.expenseSub": {
    en: "Money you spent on the business — or on yourself, kept apart.",
    es: "Dinero que gastaste en el negocio — o en ti, por separado.",
    pt: "Dinheiro que você gastou no negócio — ou com você, separado.",
  },
  "desktop.startExpense": {
    en: "Log an expense",
    es: "Registrar un gasto",
    pt: "Registrar um gasto",
  },
  "desktop.historySub": {
    en: "Every payment in and out, newest first.",
    es: "Cada pago que entra y sale, lo más reciente primero.",
    pt: "Cada pagamento que entra e sai, do mais recente ao mais antigo.",
  },
  "desktop.search": {
    en: "Search",
    es: "Buscar",
    pt: "Buscar",
  },
  "desktop.signedInAs": {
    en: "Signed in as {email}",
    es: "Sesión iniciada como {email}",
    pt: "Conectado como {email}",
  },
  "desktop.notSignedIn": {
    en: "Not signed in — nothing here is saved.",
    es: "Sin sesión — nada de esto se guarda.",
    pt: "Sem login — nada aqui fica salvo.",
  },
} as const;
