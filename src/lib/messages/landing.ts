/**
 * The public landing page. Same register as the app: short declarative
 * sentences, ES is LatAm tú, PT is Brazilian você. Money stays $ en-US
 * (i18n.ts). The hero and CTA lines are the owner's copy — change them
 * there first, here second.
 */
export const messages = {
  "landing.heroTitle": {
    en: "Your Venmo, Cash App, Zelle and cash — turned into real books in a few taps.",
    es: "Tu Venmo, Cash App, Zelle y efectivo — convertidos en libros de verdad en unos toques.",
    pt: "Seu Venmo, Cash App, Zelle e dinheiro — virando um livro-caixa de verdade em poucos toques.",
  },
  "landing.heroSub": {
    en: "Built for cleaners, landscapers, barbers. Free.",
    es: "Hecho para limpiadoras, jardineros, barberos. Gratis.",
    pt: "Feito para faxineiras, jardineiros, barbeiros. Grátis.",
  },
  "landing.openApp": {
    en: "Open the app",
    es: "Abrir la app",
    pt: "Abrir o app",
  },
  "landing.demoData": {
    en: "Demo data",
    es: "Datos de ejemplo",
    pt: "Dados de exemplo",
  },
  // What the home page's drop zone says when someone actually drops
  // screenshots on it: reading them is the app's job, not the demo's.
  "landing.demoDropNote": {
    en: "Screenshots are read inside the app. Open it to try with yours — it takes one email to sign in.",
    es: "Las capturas se leen dentro de la app. Ábrela para probar con las tuyas — entrar es solo tu correo.",
    pt: "Os prints são lidos dentro do app. Abra-o para testar com os seus — entrar é só o seu e-mail.",
  },
  // Screen-reader-only descriptions for the inert demos (DemoFrame): the
  // demo itself is hidden from assistive tech, so its caption says what
  // a sighted visitor sees there.
  "landing.demoDescUpload": {
    en: "A sample of the upload box, where you add Venmo, Cash App or Zelle screenshots.",
    es: "Un ejemplo del recuadro para subir capturas de Venmo, Cash App o Zelle.",
    pt: "Um exemplo da caixa onde você envia prints do Venmo, Cash App ou Zelle.",
  },
  "landing.demoDescSheet": {
    en: "A sample of the check screen: a $120.00 payment from Sarah Johnson with its amount ringed for a second look, and a $34.20 Home Depot receipt.",
    es: "Un ejemplo de la pantalla de revisión: un pago de $120.00 de Sarah Johnson con el monto marcado para revisarlo, y un recibo de Home Depot por $34.20.",
    pt: "Um exemplo da tela de conferência: um pagamento de $120.00 da Sarah Johnson com o valor marcado para conferir, e um recibo da Home Depot de $34.20.",
  },
  "landing.demoDescFound": {
    en: "A sample of “What we found”: the total read from the screenshots, their dates and the top payer.",
    es: "Un ejemplo de “Lo que encontramos”: el total leído de las capturas, sus fechas y quien más pagó.",
    pt: "Um exemplo de “O que encontramos”: o total lido dos prints, as datas e quem mais pagou.",
  },
  "landing.demoDescSort": {
    en: "A sample of sorting: “What we found”, then one payment card at a time with Personal and Business buttons.",
    es: "Un ejemplo de la clasificación: “Lo que encontramos” y luego una tarjeta de pago a la vez, con los botones Personal y Negocio.",
    pt: "Um exemplo da classificação: “O que encontramos” e depois um cartão de pagamento por vez, com os botões Pessoal e Negócio.",
  },
  "landing.demoDescBooks": {
    en: "A sample of your books: business and personal totals, then the dashboard with money in and out by month.",
    es: "Un ejemplo de tus libros: totales de negocio y personales, y luego el panel con el dinero que entra y sale por mes.",
    pt: "Um exemplo do seu livro-caixa: totais de negócio e pessoais, e depois o painel com o dinheiro que entra e sai por mês.",
  },
  "landing.demoDescOwed": {
    en: "A sample of the Owed tab: three unpaid jobs grouped by client, the oldest flagged after two weeks.",
    es: "Un ejemplo de la pestaña Por cobrar: tres trabajos sin pagar agrupados por cliente, el más antiguo marcado tras dos semanas.",
    pt: "Um exemplo da aba A receber: três trabalhos não pagos agrupados por cliente, o mais antigo marcado depois de duas semanas.",
  },
  "landing.tryIt": {
    en: "Try it — nothing is saved",
    es: "Pruébalo — no se guarda nada",
    pt: "Experimente — nada é salvo",
  },
  "landing.resetDemo": {
    en: "Reset the demo",
    es: "Reiniciar el ejemplo",
    pt: "Reiniciar o exemplo",
  },
  "landing.savingsTitle": {
    en: "What is bookkeeping costing you?",
    es: "¿Cuánto te cuesta llevar las cuentas?",
    pt: "Quanto a contabilidade está custando para você?",
  },
  "landing.savingsBody": {
    en: "Move the sliders. With contado we aim for about {minutes} minutes of bookkeeping a week — a few screenshots and a swipe.",
    es: "Mueve los controles. Con contado buscamos que las cuentas de la semana tomen unos {minutes} minutos — unas capturas y un deslizamiento.",
    pt: "Mova os controles. Com o contado, a meta é que a contabilidade da semana leve uns {minutes} minutos — alguns prints e um deslize.",
  },
  "landing.savingsRate": {
    en: "Your hourly rate",
    es: "Tu tarifa por hora",
    pt: "Seu valor por hora",
  },
  "landing.savingsRateValue": {
    en: "{rate} an hour",
    es: "{rate} la hora",
    pt: "{rate} por hora",
  },
  "landing.savingsHours": {
    en: "Hours a week on receipts and payments",
    es: "Horas a la semana en recibos y pagos",
    pt: "Horas por semana com recibos e pagamentos",
  },
  "landing.savingsHoursValue": {
    en: "{hours} h a week",
    es: "{hours} h a la semana",
    pt: "{hours} h por semana",
  },
  "landing.savingsHoursOut": {
    en: "hours back every month",
    es: "horas que recuperas cada mes",
    pt: "horas de volta todo mês",
  },
  "landing.savingsMoneyOut": {
    en: "of your time, every month",
    es: "de tu tiempo, cada mes",
    pt: "do seu tempo, todo mês",
  },
  // Shown directly under the result, at body size: the {minutes} is a
  // design target (savings.ts), never a measured average.
  "landing.savingsNote": {
    en: "An estimate, not a promise: it assumes you keep doing today's bookkeeping by hand, and would spend about {minutes} minutes a week with contado instead — our design target, not a measurement. It counts your time at your rate — it is not money contado pays you.",
    es: "Es una estimación, no una promesa: supone que hoy llevas las cuentas a mano y que con contado dedicarías unos {minutes} minutos a la semana — nuestra meta de diseño, no una medición. Cuenta tu tiempo a tu tarifa — no es dinero que contado te pague.",
    pt: "É uma estimativa, não uma promessa: supõe que hoje você faz a contabilidade à mão e que com o contado gastaria uns {minutes} minutos por semana — nossa meta de design, não uma medição. Conta o seu tempo pelo seu valor — não é dinheiro que o contado paga a você.",
  },
  "landing.law": {
    en: "Every flow is designed for ten seconds, one hand, in a driveway.",
    es: "Cada flujo está pensado para diez segundos, con una mano, en la entrada de una casa.",
    pt: "Cada fluxo foi pensado para dez segundos, com uma mão, na entrada da casa.",
  },
  "landing.howTitle": {
    en: "How it works",
    es: "Cómo funciona",
    pt: "Como funciona",
  },
  "landing.step1Title": {
    en: "Screenshot your payments",
    es: "Captura tus pagos",
    pt: "Tire print dos seus pagamentos",
  },
  "landing.step1Body": {
    en: "Venmo, Cash App, or Zelle — pick several screenshots at once.",
    es: "Venmo, Cash App o Zelle — elige varias capturas a la vez.",
    pt: "Venmo, Cash App ou Zelle — escolha vários prints de uma vez.",
  },
  "landing.step2Title": {
    en: "Confirm with a swipe",
    es: "Confirma deslizando",
    pt: "Confirme com um deslize",
  },
  "landing.step2Body": {
    en: "Right is business, left is personal. Anything we're unsure about gets flagged for a tap.",
    es: "A la derecha es negocio, a la izquierda es personal. Lo que no esté claro queda marcado para que lo toques.",
    pt: "Para a direita é negócio, para a esquerda é pessoal. O que não estiver claro fica marcado para você conferir.",
  },
  "landing.step3Title": {
    en: "Your books exist",
    es: "Tus libros existen",
    pt: "Seu livro-caixa existe",
  },
  "landing.step3Body": {
    en: "Totals, insights and history — saved to your account as you go, free.",
    es: "Totales, datos e historial — guardados en tu cuenta al momento, gratis.",
    pt: "Totais, insights e histórico — salvos na sua conta na hora, grátis.",
  },
  // Desktop-only detail lines (lg:) — the two-column pairs put two lines
  // of text against tall real-component demos; these carry the columns'
  // weight with substance, not decoration. Same laws as everything else:
  // short, declarative, real labels quoted exactly.
  "landing.heroChannels": {
    en: "Reads screenshots from the apps you already get paid on:",
    es: "Lee capturas de las apps donde ya te pagan:",
    pt: "Lê prints dos apps onde você já recebe:",
  },
  "landing.step3a": {
    en: "Business and personal — always two numbers, never blended.",
    es: "Negocio y personal — siempre dos números, nunca mezclados.",
    pt: "Negócio e pessoal — sempre dois números, nunca misturados.",
  },
  "landing.step3b": {
    en: "Revenue by service, month by month.",
    es: "Ingresos por servicio, mes a mes.",
    pt: "Receita por serviço, mês a mês.",
  },
  "landing.step3c": {
    en: "A quarterly set-aside nudge — information, never tax advice.",
    es: "Un recordatorio trimestral de apartado — información, nunca asesoría fiscal.",
    pt: "Um lembrete trimestral de reserva — informação, nunca consultoria fiscal.",
  },
  "landing.owed1": {
    en: "Every open job, grouped by client and aged.",
    es: "Cada trabajo abierto, agrupado por cliente y con su antigüedad.",
    pt: "Cada trabalho em aberto, agrupado por cliente e com a idade.",
  },
  "landing.owed2": {
    en: "“Got cash” is one tap — the money entry writes itself.",
    es: "“Recibí efectivo” es un toque — el registro se escribe solo.",
    pt: "“Recebi em dinheiro” é um toque — o registro se escreve sozinho.",
  },
  "landing.owed3": {
    en: "Two weeks unpaid gets a gentle flag — never a nag.",
    es: "Dos semanas sin pago recibe una marca sutil — nunca un regaño.",
    pt: "Duas semanas sem pagamento ganha uma marca sutil — nunca uma cobrança.",
  },
  "landing.owedTitle": {
    en: "Know who owes you",
    es: "Sabes quién te debe",
    pt: "Saiba quem te deve",
  },
  // What matching.ts does, no more: an exact amount, the client's name and
  // a date within MATCH_WINDOW_DAYS clear ONE sale; several qualifying sales
  // go to the picker. A payment that matches nothing (a tip, a late payer)
  // just waits — the owner links it with "Find the payment…".
  "landing.owedBody": {
    en: "Every unpaid job, grouped by client, aged. One tap when the cash arrives — or a screenshot of the payment clears it when the amount, name and date match one sale; if more than one could match, it asks you which.",
    es: "Cada trabajo sin pagar, agrupado por cliente, con su antigüedad. Un toque cuando llega el efectivo — o una captura del pago lo salda cuando el monto, el nombre y la fecha coinciden con una sola venta; si más de una puede coincidir, te pregunta cuál.",
    pt: "Cada trabalho não pago, agrupado por cliente, com o tempo em aberto. Um toque quando o dinheiro chega — ou um print do pagamento dá baixa quando o valor, o nome e a data batem com uma venda só; se mais de uma puder bater, ele pergunta qual.",
  },
  "landing.taxTitle": {
    en: "In January, your Schedule C numbers are ready for your preparer.",
    es: "En enero, tus números para el Schedule C están listos para tu preparador.",
    pt: "Em janeiro, seus números do Schedule C estão prontos para o seu contador.",
  },
  "landing.taxBody": {
    en: "Schedule-C categories on your expenses, a mileage estimate, an income summary from your own records, and a CSV your tax preparer opens directly.",
    es: "Categorías del Schedule C en tus gastos, un estimado de millas, un resumen de ingresos de tus propios registros y un CSV que tu preparador de impuestos abre directamente.",
    pt: "Categorias do Schedule C nas suas despesas, uma estimativa de milhas, um resumo de renda dos seus próprios registros e um CSV que o seu contador abre direto.",
  },
  "landing.trustTitle": {
    en: "Your books, your data — never sold, never used for ads.",
    es: "Tus libros, tus datos — nunca vendidos, nunca usados para anuncios.",
    pt: "Seu livro-caixa, seus dados — nunca vendidos, nunca usados para anúncios.",
  },
  "landing.trust1": {
    en: "We never sell your data. No ads.",
    es: "Nunca vendemos tus datos. Sin anuncios.",
    pt: "Nunca vendemos seus dados. Sem anúncios.",
  },
  "landing.trust2": {
    en: "No bank login — you upload your own screenshots.",
    es: "Sin acceso a tu banco — tú subes tus propias capturas.",
    pt: "Sem login de banco — você envia seus próprios prints.",
  },
  "landing.trust3": {
    en: "Export every row, anytime, free.",
    es: "Exporta cada fila, cuando quieras, gratis.",
    pt: "Exporte cada linha, quando quiser, grátis.",
  },
  "landing.trust4": {
    en: "Delete your account any time — your ledger is erased for good (a founding-list email is kept until you ask us to remove it).",
    es: "Borra tu cuenta cuando quieras — tu libro se elimina para siempre (un correo de la lista de fundadores se guarda hasta que pidas borrarlo).",
    pt: "Apague sua conta quando quiser — seu livro-caixa é apagado de vez (um e-mail da lista de fundadores fica guardado até você pedir para remover).",
  },
  "landing.trustLink": {
    en: "Read the privacy promise",
    es: "Lee la promesa de privacidad",
    pt: "Leia a promessa de privacidade",
  },
  "landing.ctaTitle": {
    en: "Join the founding hundred — $6/mo locked forever",
    es: "Únete a los cien fundadores — $6/mes fijo para siempre",
    pt: "Entre para os cem fundadores — $6/mês travado para sempre",
  },
  "landing.ctaBody": {
    en: "contado is free while we build. Leave your email and the founding price is yours when paid modules arrive.",
    es: "contado es gratis mientras lo construimos. Deja tu correo y el precio fundador es tuyo cuando lleguen los módulos de pago.",
    pt: "O contado é grátis enquanto construímos. Deixe seu e-mail e o preço de fundador é seu quando os módulos pagos chegarem.",
  },
  "landing.ctaPlaceholder": {
    en: "you@example.com",
    es: "tu@ejemplo.com",
    pt: "voce@exemplo.com",
  },
  "landing.ctaButton": {
    en: "Save my spot",
    es: "Guardar mi lugar",
    pt: "Guardar minha vaga",
  },
  // The notice under the founding email field (founding-cta.tsx), followed
  // by a "Privacy" link (landing.footerPrivacy). Purpose only — the
  // offer's own words stay in ctaTitle/ctaBody.
  "landing.ctaFinePrint": {
    en: "We'll email you when the founding price opens — nothing else. Leave any time.",
    es: "Te escribiremos cuando abra el precio fundador — nada más. Puedes salir cuando quieras.",
    pt: "Vamos te escrever quando o preço de fundador abrir — nada mais. Saia quando quiser.",
  },
  "landing.ctaDone": {
    en: "You're on the list.",
    es: "Estás en la lista.",
    pt: "Você está na lista.",
  },
  "landing.ctaInvalid": {
    en: "That doesn't look like an email.",
    es: "Eso no parece un correo.",
    pt: "Isso não parece um e-mail.",
  },
  "landing.ctaError": {
    en: "Couldn't save that — try again.",
    es: "No se pudo guardar — inténtalo de nuevo.",
    pt: "Não deu para salvar — tente de novo.",
  },
  "landing.ctaSlow": {
    en: "Too many tries — give it a minute.",
    es: "Demasiados intentos — espera un minuto.",
    pt: "Muitas tentativas — espere um minuto.",
  },
  "landing.ctaNoScript": {
    en: "This form needs JavaScript. To join without it, send us a message from the contact page.",
    es: "Este formulario necesita JavaScript. Para unirte sin él, envíanos un mensaje desde la página de contacto.",
    pt: "Este formulário precisa de JavaScript. Para entrar sem ele, mande uma mensagem pela página de contato.",
  },
  "landing.footerHelp": {
    en: "Help",
    es: "Ayuda",
    pt: "Ajuda",
  },
  "landing.footerPrivacy": {
    en: "Privacy",
    es: "Privacidad",
    pt: "Privacidade",
  },
  "landing.footerTerms": {
    en: "Terms",
    es: "Términos",
    pt: "Termos",
  },
  "landing.textUs": {
    en: "Text us",
    es: "Escríbenos",
    pt: "Fale com a gente",
  },
  "landing.textUsSoon": {
    en: "Text us — coming soon",
    es: "Escríbenos — muy pronto",
    pt: "Fale com a gente — em breve",
  },
} as const;
