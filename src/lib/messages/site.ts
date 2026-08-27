/**
 * The company website beyond the landing page: navigation, footer and
 * the pages under it (how it works, pricing, trade pages, about,
 * contact, FAQ). Same register as the app — short declarative
 * sentences, ES is LatAm tú, PT is Brazilian você — and the same rule
 * for money: $ en-US, never localized (i18n.ts).
 *
 * SEO copy lives here too, so what a crawler reads in the English
 * prerender and what a Spanish-speaking owner reads after hydration
 * say the same thing.
 */
export const messages = {
  // ---- navigation + footer ----
  "site.navHow": { en: "How it works", es: "Cómo funciona", pt: "Como funciona" },
  "site.navPricing": { en: "Pricing", es: "Precios", pt: "Preços" },
  "site.navHelp": { en: "Help", es: "Ayuda", pt: "Ajuda" },
  "site.navAbout": { en: "About", es: "Acerca de", pt: "Sobre" },
  "site.navContact": { en: "Contact", es: "Contacto", pt: "Contato" },
  "site.navFaq": { en: "FAQ", es: "Preguntas frecuentes", pt: "Perguntas frequentes" },
  "site.forCleaners": { en: "For cleaners", es: "Para limpiadoras", pt: "Para faxineiras" },
  "site.forLandscapers": { en: "For landscapers", es: "Para jardineros", pt: "Para jardineiros" },
  "site.forBarbers": { en: "For barbers", es: "Para barberos", pt: "Para barbeiros" },
  "site.footerProduct": { en: "Product", es: "Producto", pt: "Produto" },
  "site.footerCompany": { en: "Company", es: "Empresa", pt: "Empresa" },
  "site.footerLegal": { en: "Legal", es: "Legal", pt: "Jurídico" },
  "site.emailUs": { en: "Email us", es: "Escríbenos un correo", pt: "Mande um e-mail" },
  "site.copyright": { en: "© {year} contado", es: "© {year} contado", pt: "© {year} contado" },
  "site.siteNav": { en: "Site", es: "Sitio", pt: "Site" },
  "site.commonQuestions": { en: "Common questions", es: "Preguntas comunes", pt: "Perguntas comuns" },

  // ---- shared: what contado is not ----
  "site.whatNot": { en: "What contado is not", es: "Lo que contado no es", pt: "O que o contado não é" },
  "site.not1": {
    en: "Not an invoicing app — it tracks who owes you and clears it when the payment shows up.",
    es: "No es una app de facturas — registra quién te debe y lo marca pagado cuando aparece el pago.",
    pt: "Não é um app de faturas — ele registra quem te deve e dá baixa quando o pagamento aparece.",
  },
  "site.not2": {
    en: "Not a bank connection — you upload your own screenshots, and screenshots will always be the default. There is no bank login in contado today.",
    es: "No se conecta a tu banco — tú subes tus propias capturas, y las capturas siempre serán lo principal. Hoy no hay acceso bancario en contado.",
    pt: "Não se conecta ao seu banco — você envia suas próprias capturas, e as capturas sempre serão o padrão. Hoje não existe login bancário no contado.",
  },
  "site.not3": {
    en: "Not a tax filer — it gets you ready: categories, mileage, proof of income, a CSV your preparer opens.",
    es: "No presenta tus impuestos — te deja listo: categorías, millaje, comprobante de ingresos y un CSV que tu contador abre.",
    pt: "Não declara seus impostos — ele te deixa pronto: categorias, quilometragem, comprovante de renda e um CSV que seu contador abre.",
  },
  "site.not4": {
    en: "Not a scheduler, not ads, not selling your data.",
    es: "No es una agenda, no tiene anuncios, no vende tus datos.",
    pt: "Não é agenda, não tem anúncios, não vende seus dados.",
  },

  // ---- how it works ----
  "site.howTitle": { en: "How contado works", es: "Cómo funciona contado", pt: "Como o contado funciona" },
  "site.howIntro": {
    en: "Four screens, no setup. You screenshot, you confirm, you swipe — and your books exist.",
    es: "Cuatro pantallas, sin configurar nada. Tomas capturas, confirmas, deslizas — y tus libros existen.",
    pt: "Quatro telas, sem configuração. Você tira print, confirma, desliza — e seu livro-caixa existe.",
  },
  "site.how1Detail": {
    en: "Open Venmo, Cash App or Zelle, screenshot the Transactions list — not the social feed, which hides amounts — and add as many as you like. They're sent to an AI service to be read, then discarded — never stored.",
    es: "Abre Venmo, Cash App o Zelle, toma captura de la lista de Transacciones — no del feed social, que oculta los montos — y agrega todas las que quieras. Se envían a un servicio de IA para leerlas y luego se descartan — nunca se guardan.",
    pt: "Abra o Venmo, Cash App ou Zelle, tire print da lista de Transações — não do feed social, que esconde os valores — e adicione quantas quiser. Elas são enviadas a um serviço de IA para leitura e depois descartadas — nunca ficam guardadas.",
  },
  "site.how2Title": { en: "Check every row", es: "Revisa cada fila", pt: "Confira cada linha" },
  "site.how2Detail": {
    en: "Every payment comes back as a row: who, how much, when. Anything we weren't sure about is ringed in amber — tap it to fix. Nothing lands in your books until you've looked at it.",
    es: "Cada pago vuelve como una fila: quién, cuánto, cuándo. Lo que no pudimos leer bien queda marcado en ámbar — tócalo para corregir. Nada entra en tus libros hasta que lo revisaste.",
    pt: "Cada pagamento volta como uma linha: quem, quanto, quando. O que não conseguimos ler bem fica marcado em âmbar — toque para corrigir. Nada entra no seu livro-caixa antes de você conferir.",
  },
  "site.how3Title": { en: "Sort with a swipe", es: "Ordena deslizando", pt: "Separe com um deslize" },
  "site.how3Detail": {
    en: "One card at a time. Right is business, left is personal. Personal rows stay out of your books and out of your taxes.",
    es: "Una tarjeta a la vez. Derecha es negocio, izquierda es personal. Lo personal queda fuera de tus libros y de tus impuestos.",
    pt: "Um cartão por vez. Direita é negócio, esquerda é pessoal. O pessoal fica fora do seu livro-caixa e dos seus impostos.",
  },
  "site.how4Detail": {
    en: "Money in, money out, what you kept — by month, by service. Every log is saved to your account the moment you make it, on any device you sign into.",
    es: "Dinero que entra, dinero que sale, lo que te quedó — por mes, por servicio. Cada registro se guarda en tu cuenta al instante, en cualquier dispositivo donde entres.",
    pt: "Dinheiro que entra, que sai, o que sobrou — por mês, por serviço. Cada registro é salvo na sua conta na hora, em qualquer aparelho em que você entrar.",
  },
  "site.how5Detail": {
    en: "Log a job before the money arrives and it waits in Owed, grouped by client, aged. Tap once when the cash comes — or a payment in your next screenshots clears it on its own.",
    es: "Registra un trabajo antes de que llegue el dinero y queda en la pestaña Por cobrar, por cliente, con los días. Un toque cuando llega el efectivo — o un pago en tus próximas capturas lo cierra solo.",
    pt: "Registre um serviço antes de o dinheiro chegar e ele espera na aba A receber, por cliente, com os dias. Um toque quando o dinheiro chega — ou um pagamento nos próximos prints dá baixa sozinho.",
  },

  // ---- pricing ----
  "site.pricingTitle": { en: "Free while we build.", es: "Gratis mientras lo construimos.", pt: "Grátis enquanto construímos." },
  "site.pricingIntro": {
    en: "contado is free today, with no limits and nothing gated. When paid modules arrive, the core stays free forever — and the founding hundred lock in one price for all of it.",
    es: "contado es gratis hoy, sin límites y sin nada bloqueado. Cuando lleguen los módulos de pago, lo esencial seguirá siendo gratis para siempre — y los cien fundadores aseguran un solo precio por todo.",
    pt: "O contado é grátis hoje, sem limites e sem nada bloqueado. Quando os módulos pagos chegarem, o essencial continua grátis para sempre — e os cem fundadores garantem um preço único por tudo.",
  },
  "site.freeForever": { en: "Free forever", es: "Gratis para siempre", pt: "Grátis para sempre" },
  "site.free1": {
    en: "Screenshots in, books out — the whole core loop.",
    es: "Capturas que entran, libros que salen — todo el ciclo central.",
    pt: "Prints entrando, livro-caixa saindo — todo o ciclo central.",
  },
  "site.free2": {
    en: "Sales, clients and the Owed tab, with one-tap matching.",
    es: "Ventas, clientes y la pestaña Por cobrar, con emparejado de un toque.",
    pt: "Vendas, clientes e a aba A receber, com conciliação de um toque.",
  },
  "site.free3": {
    en: "Your whole history, at any age. Never metered, never gated.",
    es: "Todo tu historial, sin importar la antigüedad. Nunca medido, nunca bloqueado.",
    pt: "Todo o seu histórico, de qualquer data. Nunca limitado, nunca bloqueado.",
  },
  "site.free4": {
    en: "Export everything, any time. Your data is yours.",
    es: "Exporta todo, cuando quieras. Tus datos son tuyos.",
    pt: "Exporte tudo, quando quiser. Seus dados são seus.",
  },
  "site.free5": {
    en: "English, Spanish and Portuguese. We never charge for language.",
    es: "Inglés, español y portugués. Nunca cobramos por el idioma.",
    pt: "Inglês, espanhol e português. Nunca cobramos pelo idioma.",
  },
  "site.laterTitle": { en: "Paid later, on top", es: "De pago, más adelante, como extra", pt: "Pagos, mais tarde, como extra" },
  "site.laterIntro": {
    en: "Four modules are planned — the paid layer on top of your data. Some of it already works in today's free app; nothing is billed yet, and what's free for you today stays free for you.",
    es: "Hay cuatro módulos planeados — la capa de pago sobre tus datos. Parte de eso ya funciona en la app gratis de hoy; todavía no se cobra nada, y lo que hoy es gratis para ti sigue siendo gratis para ti.",
    pt: "Quatro módulos estão planejados — a camada paga por cima dos seus dados. Parte disso já funciona no app grátis de hoje; nada é cobrado ainda, e o que é grátis para você hoje continua grátis para você.",
  },
  "site.modAutopilot": {
    en: "Autopilot — automatic matching, Owed that clears itself, recurring jobs.",
    es: "Autopilot — emparejado automático, Por cobrar que se cierra solo, trabajos recurrentes.",
    pt: "Autopilot — conciliação automática, A receber que se fecha sozinho, serviços recorrentes.",
  },
  "site.modAlerts": {
    en: "Alerts — owed reminders and confirmations on WhatsApp or by text.",
    es: "Alerts — recordatorios de cobro y confirmaciones por WhatsApp o SMS.",
    pt: "Alerts — lembretes de cobrança e confirmações por WhatsApp ou SMS.",
  },
  "site.modInsights": {
    en: "Insights — reports, margins, your year in review.",
    es: "Insights — reportes, márgenes, tu año en resumen.",
    pt: "Insights — relatórios, margens, seu ano em resumo.",
  },
  "site.modTime": {
    en: "Time Machine — version history and restore.",
    es: "Time Machine — historial de versiones y restauración.",
    pt: "Time Machine — histórico de versões e restauração.",
  },
  "site.laterNote": {
    en: "Module prices will be announced when they ship. Founding members pay $6/mo for all of them, forever — a price that never rises.",
    es: "Los precios de cada módulo se anunciarán cuando salgan. Los fundadores pagan $6/mes por todos, para siempre — un precio que nunca sube.",
    pt: "Os preços dos módulos serão anunciados quando saírem. Os fundadores pagam $6/mês por todos, para sempre — um preço que nunca sobe.",
  },
  "site.filterTitle": { en: "The rule we charge by", es: "La regla con la que cobramos", pt: "A regra pela qual cobramos" },
  "site.filterBody": {
    en: "We charge for what we build on top of your data — never to unlock your own records, never to meter them, never by selling them.",
    es: "Cobramos por lo que construimos encima de tus datos — nunca por desbloquear tus propios registros, nunca por medirlos, nunca vendiéndolos.",
    pt: "Cobramos pelo que construímos por cima dos seus dados — nunca para liberar seus próprios registros, nunca para limitá-los, nunca vendendo-os.",
  },

  // ---- trade pages: shared ----
  "site.tradeSoundFamiliar": { en: "Sound familiar?", es: "¿Te suena?", pt: "Parece familiar?" },
  "site.tradeWhatItDoes": { en: "What contado does for you", es: "Lo que contado hace por ti", pt: "O que o contado faz por você" },
  "site.tradeLang": {
    en: "In English, Spanish and Portuguese — switch any time, free.",
    es: "En inglés, español y portugués — cambia cuando quieras, gratis.",
    pt: "Em inglês, espanhol e português — troque quando quiser, grátis.",
  },
  "site.tradeOthers": { en: "See also:", es: "Ver también:", pt: "Veja também:" },
  "site.faqLangQ": {
    en: "Can I use it in Spanish or Portuguese?",
    es: "¿Puedo usarlo en español o portugués?",
    pt: "Posso usar em espanhol ou português?",
  },
  "site.faqLangA": {
    en: "Yes. English, Spanish and Portuguese, switchable any time. We never charge for language.",
    es: "Sí. Inglés, español y portugués, cambiables cuando quieras. Nunca cobramos por el idioma.",
    pt: "Sim. Inglês, espanhol e português, com troca a qualquer hora. Nunca cobramos pelo idioma.",
  },

  // ---- trade pages: cleaners ----
  "site.cleanersTitle": {
    en: "Bookkeeping for house cleaners paid on Venmo, Cash App, Zelle and cash.",
    es: "Contabilidad para limpiadoras que cobran por Venmo, Cash App, Zelle y efectivo.",
    pt: "Contabilidade para faxineiras que recebem por Venmo, Cash App, Zelle e dinheiro.",
  },
  "site.cleanersSub": {
    en: "Every house, every payment, every client who still owes you — in one place, in ten seconds, from the driveway.",
    es: "Cada casa, cada pago, cada clienta que todavía te debe — en un solo lugar, en diez segundos, desde la entrada.",
    pt: "Cada casa, cada pagamento, cada cliente que ainda te deve — em um só lugar, em dez segundos, da calçada.",
  },
  "site.cleanersPain1": {
    en: "Payments land in three apps and a pocket of cash.",
    es: "Los pagos llegan a tres apps y a un bolsillo con efectivo.",
    pt: "Os pagamentos chegam em três apps e num bolso com dinheiro.",
  },
  "site.cleanersPain2": {
    en: "Sarah pays every two weeks — except the week she forgets.",
    es: "Sarah paga cada dos semanas — menos la semana que se le olvida.",
    pt: "A Sarah paga a cada duas semanas — menos na semana em que esquece.",
  },
  "site.cleanersPain3": {
    en: "In January, someone asks for your numbers and you have a phone full of screenshots.",
    es: "En enero alguien te pide tus números y tienes un teléfono lleno de capturas.",
    pt: "Em janeiro alguém pede seus números e você tem um celular cheio de prints.",
  },
  "site.cleanersDoes1": {
    en: "Screenshot your Venmo, Cash App and Zelle — contado reads every payment and sorts business from personal with a swipe.",
    es: "Toma captura de tu Venmo, Cash App y Zelle — contado lee cada pago y separa negocio de personal con un deslizamiento.",
    pt: "Tire print do seu Venmo, Cash App e Zelle — o contado lê cada pagamento e separa negócio de pessoal com um deslize.",
  },
  "site.cleanersDoes2": {
    en: "Log the clean before the money arrives; it waits in Owed under Sarah's name until her payment shows up — then clears itself.",
    es: "Registra la limpieza antes de que llegue el dinero; queda en la pestaña Por cobrar bajo el nombre de Sarah hasta que aparece su pago — y se cierra solo.",
    pt: "Registre a limpeza antes de o dinheiro chegar; ela espera na aba A receber no nome da Sarah até o pagamento aparecer — e dá baixa sozinha.",
  },
  "site.cleanersDoes3": {
    en: "Supplies go in with a photo of the receipt, tagged for Schedule C. Mileage is estimated from each client's distance — no GPS.",
    es: "Los insumos entran con una foto del recibo, etiquetados para el Schedule C. El millaje se estima con la distancia de cada clienta — sin GPS.",
    pt: "Os produtos entram com uma foto do recibo, marcados para o Schedule C. A quilometragem é estimada pela distância de cada cliente — sem GPS.",
  },
  "site.cleanersFaq1Q": {
    en: "Does it work if I'm paid half on Venmo and half in cash?",
    es: "¿Funciona si me pagan mitad por Venmo y mitad en efectivo?",
    pt: "Funciona se me pagam metade por Venmo e metade em dinheiro?",
  },
  "site.cleanersFaq1A": {
    en: "Yes. Screenshots cover the apps; cash you log as a sale in a few taps. Both land in the same books.",
    es: "Sí. Las capturas cubren las apps; el efectivo lo registras como venta en unos toques. Todo llega a los mismos libros.",
    pt: "Sim. Os prints cobrem os apps; o dinheiro você registra como venda em poucos toques. Tudo cai no mesmo livro-caixa.",
  },
  "site.cleanersFaq2Q": {
    en: "Do my clients see anything?",
    es: "¿Mis clientas ven algo?",
    pt: "Minhas clientes veem alguma coisa?",
  },
  "site.cleanersFaq2A": {
    en: "No. Your books are yours alone. Today contado never messages a client; if reminder alerts arrive later, they will be opt-in and yours to switch on.",
    es: "No. Tus libros son solo tuyos. Hoy contado nunca le escribe a una clienta; si más adelante llegan recordatorios, serán opcionales y tú decides activarlos.",
    pt: "Não. Seu livro-caixa é só seu. Hoje o contado nunca manda mensagem para uma cliente; se lembretes chegarem depois, serão opcionais e você decide ativar.",
  },

  // ---- trade pages: landscapers ----
  "site.landscapersTitle": {
    en: "Bookkeeping for landscapers paid on Venmo, Cash App, Zelle and cash.",
    es: "Contabilidad para jardineros que cobran por Venmo, Cash App, Zelle y efectivo.",
    pt: "Contabilidade para jardineiros que recebem por Venmo, Cash App, Zelle e dinheiro.",
  },
  "site.landscapersSub": {
    en: "Mowing, edging, the monthly accounts — tracked from the truck, one hand, before the next yard.",
    es: "Cortes, bordes, las cuentas mensuales — llevadas desde la camioneta, con una mano, antes del próximo jardín.",
    pt: "Cortes, acabamentos, as contas mensais — controlados da caminhonete, com uma mão, antes do próximo quintal.",
  },
  "site.landscapersPain1": {
    en: "Twenty yards a week, paid six different ways.",
    es: "Veinte jardines por semana, pagados de seis maneras distintas.",
    pt: "Vinte quintais por semana, pagos de seis jeitos diferentes.",
  },
  "site.landscapersPain2": {
    en: "The monthly accounts pay late and you stop noticing which ones.",
    es: "Las cuentas mensuales pagan tarde y dejas de notar cuáles.",
    pt: "As contas mensais atrasam e você para de notar quais.",
  },
  "site.landscapersPain3": {
    en: "Gas, blades, mulch — receipts in the glovebox until tax time.",
    es: "Gasolina, cuchillas, mantillo — recibos en la guantera hasta la temporada de impuestos.",
    pt: "Gasolina, lâminas, adubo — recibos no porta-luvas até a hora do imposto.",
  },
  "site.landscapersDoes1": {
    en: "Screenshot the payment apps after the route; contado reads every payment and you swipe business from personal.",
    es: "Toma captura de las apps de pago al terminar la ruta; contado lee cada pago y tú deslizas negocio o personal.",
    pt: "Tire print dos apps de pagamento depois da rota; o contado lê cada pagamento e você desliza negócio ou pessoal.",
  },
  "site.landscapersDoes2": {
    en: "Make the monthly account a recurring job: it expects the money on the day, waits in Owed if it's late, and flags after three misses.",
    es: "Convierte la cuenta mensual en un trabajo recurrente: espera el dinero ese día, queda en la pestaña Por cobrar si se atrasa y avisa tras tres faltas.",
    pt: "Transforme a conta mensal em serviço recorrente: ele espera o dinheiro no dia, fica na aba A receber se atrasar e avisa depois de três faltas.",
  },
  "site.landscapersDoes3": {
    en: "Snap the gas receipt, tag it Car & truck. Each client's round trip × your visits becomes a mileage estimate — never GPS.",
    es: "Fotografía el recibo de gasolina, etiquétalo como Auto y camioneta. El viaje redondo de cada cliente × tus visitas se vuelve una estimación de millaje — nunca GPS.",
    pt: "Fotografe o recibo de gasolina, marque como Carro e caminhonete. A ida e volta de cada cliente × suas visitas vira uma estimativa de quilometragem — nunca GPS.",
  },
  "site.landscapersFaq1Q": { en: "Can it handle a crew?", es: "¿Sirve para una cuadrilla?", pt: "Serve para uma equipe?" },
  "site.landscapersFaq1A": {
    en: "It's built for the owner's phone — one account, your books. Multi-user is deliberately not here yet.",
    es: "Está hecho para el teléfono del dueño — una cuenta, tus libros. Multiusuario no está todavía, a propósito.",
    pt: "Foi feito para o celular do dono — uma conta, seu livro-caixa. Multiusuário ainda não existe, de propósito.",
  },
  "site.landscapersFaq2Q": {
    en: "Does it do estimates or invoices?",
    es: "¿Hace presupuestos o facturas?",
    pt: "Faz orçamentos ou faturas?",
  },
  "site.landscapersFaq2A": {
    en: "No. contado keeps the books after the work — who paid, who owes, what you spent. Quotes and invoices are a different tool.",
    es: "No. contado lleva los libros después del trabajo — quién pagó, quién debe, qué gastaste. Presupuestos y facturas son otra herramienta.",
    pt: "Não. O contado cuida do livro-caixa depois do serviço — quem pagou, quem deve, o que você gastou. Orçamentos e faturas são outra ferramenta.",
  },

  // ---- trade pages: barbers ----
  "site.barbersTitle": {
    en: "Bookkeeping for barbers paid on Cash App, Venmo, Zelle and cash.",
    es: "Contabilidad para barberos que cobran por Cash App, Venmo, Zelle y efectivo.",
    pt: "Contabilidade para barbeiros que recebem por Cash App, Venmo, Zelle e dinheiro.",
  },
  "site.barbersSub": {
    en: "Thirty cuts a day, half of them cash. Your real number, without counting the drawer.",
    es: "Treinta cortes al día, la mitad en efectivo. Tu número real, sin contar la caja.",
    pt: "Trinta cortes por dia, metade em dinheiro. Seu número real, sem contar a gaveta.",
  },
  "site.barbersPain1": {
    en: "Cash App says one thing, the drawer says another, the chair rent is due Friday.",
    es: "Cash App dice una cosa, la caja otra, y la renta de la silla vence el viernes.",
    pt: "O Cash App diz uma coisa, a gaveta outra, e o aluguel da cadeira vence sexta.",
  },
  "site.barbersPain2": {
    en: "Regulars who “get you next week” — and you can't remember who.",
    es: "Clientes fijos que “te pagan la próxima” — y no recuerdas quiénes.",
    pt: "Clientes fixos que “acertam semana que vem” — e você não lembra quem.",
  },
  "site.barbersPain3": {
    en: "Clippers, product, the chair — what did the year actually cost?",
    es: "Máquinas, producto, la silla — ¿cuánto costó el año en realidad?",
    pt: "Máquinas, produtos, a cadeira — quanto o ano custou de verdade?",
  },
  "site.barbersDoes1": {
    en: "End of day: screenshot Cash App, tap in the cash. Two minutes, one hand, and the day is booked.",
    es: "Al cierre: captura de Cash App, el efectivo a mano. Dos minutos, una mano, y el día queda registrado.",
    pt: "Fim do dia: print do Cash App, o dinheiro digitado. Dois minutos, uma mão, e o dia está lançado.",
  },
  "site.barbersDoes2": {
    en: "Log the cut when the regular says “next week” — it waits in Owed under his name, and clears when he pays.",
    es: "Registra el corte cuando el cliente dice “la próxima” — queda en la pestaña Por cobrar a su nombre y se cierra cuando paga.",
    pt: "Registre o corte quando o cliente diz “semana que vem” — fica na aba A receber no nome dele e dá baixa quando ele pagar.",
  },
  "site.barbersDoes3": {
    en: "Photograph the supply receipt, tag it. Chair rent, product, tools — categorized for Schedule C before January.",
    es: "Fotografía el recibo de insumos, etiquétalo. Renta de silla, producto, herramientas — categorizados para el Schedule C antes de enero.",
    pt: "Fotografe o recibo dos produtos, marque. Aluguel da cadeira, produtos, ferramentas — categorizados para o Schedule C antes de janeiro.",
  },
  "site.barbersFaq1Q": {
    en: "I'm mostly cash. Is it still worth it?",
    es: "Cobro casi todo en efectivo. ¿Aún vale la pena?",
    pt: "Recebo quase tudo em dinheiro. Ainda vale a pena?",
  },
  "site.barbersFaq1A": {
    en: "Yes — a cash cut is a few taps: the amount, then paid in cash. Your cash days and your Cash App days land in the same books.",
    es: "Sí — un corte en efectivo son unos toques: el monto y pagado en efectivo. Tus días de efectivo y tus días de Cash App llegan a los mismos libros.",
    pt: "Sim — um corte em dinheiro são poucos toques: o valor e pago em dinheiro. Seus dias de dinheiro e de Cash App caem no mesmo livro-caixa.",
  },
  "site.barbersFaq2Q": { en: "Does it book appointments?", es: "¿Agenda citas?", pt: "Marca horários?" },
  "site.barbersFaq2A": {
    en: "No. contado is the ledger, not the calendar. It keeps what you earned and what you spent; your booking app keeps the chair.",
    es: "No. contado es el libro, no la agenda. Lleva lo que ganaste y gastaste; tu app de citas lleva la silla.",
    pt: "Não. O contado é o livro-caixa, não a agenda. Ele guarda o que você ganhou e gastou; seu app de horários cuida da cadeira.",
  },

  // ---- about ----
  "site.aboutTitle": { en: "Why contado exists", es: "Por qué existe contado", pt: "Por que o contado existe" },
  "site.aboutIntro": {
    en: "Millions of people clean, mow and cut for a living and get paid through apps and cash. Almost none of them have books. Not because they don't care — because every tool assumes a desk, a bank feed and an hour. They have a phone, a driveway and ten seconds.",
    es: "Millones de personas limpian, cortan pasto y cortan cabello para vivir, y cobran por apps y en efectivo. Casi ninguna tiene libros. No porque no les importe — porque cada herramienta supone un escritorio, una conexión bancaria y una hora. Ellas tienen un teléfono, una entrada y diez segundos.",
    pt: "Milhões de pessoas limpam, cortam grama e cortam cabelo para viver, e recebem por apps e em dinheiro. Quase nenhuma tem livro-caixa. Não por descuido — porque toda ferramenta pressupõe uma mesa, uma conexão bancária e uma hora. Elas têm um celular, uma calçada e dez segundos.",
  },
  "site.aboutWhat": {
    en: "contado turns the screenshots you already take into real books — and stops there. No bank login, no invoicing, no ads.",
    es: "contado convierte las capturas que ya tomas en libros de verdad — y se detiene ahí. Sin clave del banco, sin facturas, sin anuncios.",
    pt: "O contado transforma os prints que você já tira em livro-caixa de verdade — e para por aí. Sem senha do banco, sem faturas, sem anúncios.",
  },
  "site.aboutBeliefs": { en: "What we hold to", es: "En qué creemos", pt: "No que acreditamos" },
  "site.belief3": {
    en: "Every log saved instantly, forever, free.",
    es: "Cada registro guardado al instante, para siempre, gratis.",
    pt: "Cada registro salvo na hora, para sempre, grátis.",
  },
  "site.belief4": {
    en: "One payment, one sale. Nothing is ever counted twice.",
    es: "Un pago, una venta. Nada se cuenta dos veces.",
    pt: "Um pagamento, uma venda. Nada é contado duas vezes.",
  },
  "site.belief5": {
    en: "Three languages, one price: none. We never charge for language.",
    es: "Tres idiomas, un precio: ninguno. Nunca cobramos por el idioma.",
    pt: "Três idiomas, um preço: nenhum. Nunca cobramos pelo idioma.",
  },
  "site.aboutHow": { en: "How it's built", es: "Cómo está hecho", pt: "Como é feito" },
  "site.aboutHowBody": {
    en: "One web app that works on any phone, in English, Spanish and Portuguese. Money is stored to the cent, never as a float. Your rows are fenced to your account at the database, by row-level security. Every row is exportable any time, and your whole account is deletable, always.",
    es: "Una app web que funciona en cualquier teléfono, en inglés, español y portugués. El dinero se guarda al centavo, nunca como decimal flotante. Tus filas están cercadas a tu cuenta en la base de datos, con seguridad a nivel de fila. Cada fila se puede exportar cuando quieras, y tu cuenta entera se puede borrar, siempre.",
    pt: "Um app web que funciona em qualquer celular, em inglês, espanhol e português. O dinheiro é guardado em centavos, nunca como número flutuante. Suas linhas ficam cercadas à sua conta no banco de dados, por segurança em nível de linha. Cada linha pode ser exportada quando quiser, e sua conta inteira pode ser apagada, sempre.",
  },
  "site.aboutTalk": { en: "Questions? Talk to us.", es: "¿Preguntas? Háblanos.", pt: "Dúvidas? Fale com a gente." },

  // ---- contact ----
  "site.contactTitle": { en: "Talk to us", es: "Háblanos", pt: "Fale com a gente" },
  "site.contactIntro": {
    en: "Every message gets read. For the quickest answers, the help center covers the common ones.",
    es: "Cada mensaje se lee. Para respuestas rápidas, el centro de ayuda cubre las más comunes.",
    pt: "Toda mensagem é lida. Para respostas rápidas, a central de ajuda cobre as mais comuns.",
  },
  "site.contactText": { en: "Text us on WhatsApp", es: "Escríbenos por WhatsApp", pt: "Chame no WhatsApp" },
  "site.contactHelp": { en: "Browse the help center", es: "Ver el centro de ayuda", pt: "Ver a central de ajuda" },
  "site.contactNoChannel": {
    en: "Support channels are being set up — for now, the help center is the fastest way to an answer.",
    es: "Los canales de soporte se están configurando — por ahora, el centro de ayuda es la forma más rápida de obtener respuesta.",
    pt: "Os canais de suporte estão sendo configurados — por enquanto, a central de ajuda é o caminho mais rápido para uma resposta.",
  },

  // ---- faq ----
  "site.faqTitle": { en: "Questions, answered plainly", es: "Preguntas, respondidas en claro", pt: "Perguntas, respondidas sem rodeios" },
  "site.faqIntro": {
    en: "The short version of what people ask before they try contado.",
    es: "La versión corta de lo que la gente pregunta antes de probar contado.",
    pt: "A versão curta do que as pessoas perguntam antes de testar o contado.",
  },
  "site.faq1Q": { en: "Is contado free?", es: "¿contado es gratis?", pt: "O contado é grátis?" },
  "site.faq1A": {
    en: "Yes. The core is free forever: logging, confirming, totals, who owes you, exports, every language. Paid modules will come later, on top — and the founding hundred lock $6/mo for all of them.",
    es: "Sí. Lo esencial es gratis para siempre: registrar, confirmar, totales, quién te debe, exportar, todos los idiomas. Más adelante habrá módulos de pago como extra sobre lo gratis — y los cien fundadores aseguran $6/mes por todos.",
    pt: "Sim. O essencial é grátis para sempre: registrar, confirmar, totais, quem te deve, exportar, todos os idiomas. Módulos pagos virão depois, como extra sobre o grátis — e os cem fundadores garantem $6/mês por todos.",
  },
  "site.faq2Q": { en: "Which payment apps work?", es: "¿Qué apps de pago funcionan?", pt: "Quais apps de pagamento funcionam?" },
  "site.faq2A": {
    en: "Venmo, Cash App and Zelle screenshots, plus cash you type in. Screenshot the Transactions list, not the social feed — the feed hides amounts.",
    es: "Capturas de Venmo, Cash App y Zelle, más el efectivo que escribes. Toma captura de la lista de Transacciones, no del feed social — el feed oculta los montos.",
    pt: "Prints do Venmo, Cash App e Zelle, mais o dinheiro que você digita. Tire print da lista de Transações, não do feed social — o feed esconde os valores.",
  },
  "site.faq3Q": { en: "Do I have to connect my bank?", es: "¿Tengo que conectar mi banco?", pt: "Preciso conectar meu banco?" },
  "site.faq3A": {
    en: "No. You upload your own screenshots — there is no bank login in contado today, and screenshots will always be the default.",
    es: "No. Tú subes tus propias capturas — hoy no hay acceso bancario en contado, y las capturas siempre serán lo principal.",
    pt: "Não. Você envia seus próprios prints — hoje não existe login bancário no contado, e os prints sempre serão o padrão.",
  },
  "site.faq4Q": { en: "What happens to my screenshots?", es: "¿Qué pasa con mis capturas?", pt: "O que acontece com meus prints?" },
  "site.faq4A": {
    en: "They're sent to an AI service to be read, then discarded — never stored. The only images we keep are photos you choose to attach to a sale, and those stay with that sale until you delete your account.",
    es: "Se envían a un servicio de IA para leerlas y luego se descartan — nunca se guardan. Las únicas imágenes que guardamos son fotos que tú decides adjuntar a una venta, y quedan con esa venta hasta que borres tu cuenta.",
    pt: "São enviados a um serviço de IA para leitura e depois descartados — nunca ficam guardados. As únicas imagens que guardamos são fotos que você escolhe anexar a uma venda, e elas ficam com essa venda até você apagar a conta.",
  },
  "site.faq5Q": { en: "Does it do invoices or estimates?", es: "¿Hace facturas o presupuestos?", pt: "Faz faturas ou orçamentos?" },
  "site.faq5A": {
    en: "No. contado is a ledger, not an invoicing app: it tracks who owes you and clears it when the payment shows up. Quotes and invoices are a different tool.",
    es: "No. contado es un libro, no una app de facturas: registra quién te debe y lo cierra cuando aparece el pago. Presupuestos y facturas son otra herramienta.",
    pt: "Não. O contado é um livro-caixa, não um app de faturas: ele registra quem te deve e dá baixa quando o pagamento aparece. Orçamentos e faturas são outra ferramenta.",
  },
  "site.faq6Q": { en: "Does it file my taxes?", es: "¿Presenta mis impuestos?", pt: "Ele declara meus impostos?" },
  "site.faq6A": {
    en: "No — it gets you ready. Schedule-C categories on expenses, a mileage estimate, proof of income, and a CSV your preparer opens directly. Estimates never mix with actuals.",
    es: "No — te deja listo. Categorías del Schedule C en los gastos, una estimación de millaje, comprobante de ingresos y un CSV que tu contador abre directo. Las estimaciones nunca se mezclan con lo real.",
    pt: "Não — ele te deixa pronto. Categorias do Schedule C nas despesas, uma estimativa de quilometragem, comprovante de renda e um CSV que seu contador abre direto. Estimativas nunca se misturam com o real.",
  },
  "site.faq7Q": { en: "Does it work on my phone?", es: "¿Funciona en mi teléfono?", pt: "Funciona no meu celular?" },
  "site.faq7A": {
    en: "Yes. It's a website that works on any phone, with no install. Every flow is built to survive ten seconds, one hand, in a driveway.",
    es: "Sí. Es un sitio web que funciona en cualquier teléfono, sin instalar nada. Cada flujo está hecho para sobrevivir diez segundos, con una mano, en la entrada de una casa.",
    pt: "Sim. É um site que funciona em qualquer celular, sem instalar nada. Cada fluxo foi feito para sobreviver dez segundos, com uma mão, na calçada.",
  },
  "site.faq8Q": { en: "Can I export or delete my data?", es: "¿Puedo exportar o borrar mis datos?", pt: "Posso exportar ou apagar meus dados?" },
  "site.faq8A": {
    en: "Always. Export everything as CSV any time, free. Delete your account in Settings and everything is erased for good seven days later — you can change your mind inside those seven days.",
    es: "Siempre. Exporta todo en CSV cuando quieras, gratis. Borra tu cuenta en Ajustes y todo se elimina para siempre siete días después — puedes arrepentirte dentro de esos siete días.",
    pt: "Sempre. Exporte tudo em CSV quando quiser, grátis. Apague sua conta em Configurações e tudo é removido para sempre sete dias depois — você pode mudar de ideia dentro desses sete dias.",
  },
  "site.faq9Q": { en: "Is there a way to try it without an account?", es: "¿Se puede probar sin cuenta?", pt: "Dá para testar sem conta?" },
  "site.faq9A": {
    en: "Yes — a shared demo account. Everyone who uses it sees the same test data, so try everything and put nothing real in. The help center explains how.",
    es: "Sí — una cuenta de prueba compartida. Todos los que la usan ven los mismos datos de prueba, así que prueba todo y no pongas nada real. El centro de ayuda explica cómo.",
    pt: "Sim — uma conta de teste compartilhada. Todo mundo que a usa vê os mesmos dados de teste, então teste tudo e não coloque nada real. A central de ajuda explica como.",
  },
  "site.faq10Q": { en: "Who is contado for?", es: "¿Para quién es contado?", pt: "Para quem é o contado?" },
  "site.faq10A": {
    en: "Very small service businesses that get paid through apps and cash — cleaners, landscapers, barbers and anyone who works like them. One owner, one phone.",
    es: "Negocios de servicios muy pequeños que cobran por apps y en efectivo — limpiadoras, jardineros, barberos y cualquiera que trabaje así. Un dueño, un teléfono.",
    pt: "Negócios de serviço bem pequenos que recebem por apps e em dinheiro — faxineiras, jardineiros, barbeiros e quem mais trabalha assim. Um dono, um celular.",
  },

  // ---- privacy: the website's analytics, disclosed ----
  "site.privacyAnalytics": {
    en: "The public website (these pages, not the app) may use Google Analytics to count visits. The app itself never sends analytics, and a browser that sends Do Not Track gets none at all.",
    es: "El sitio público (estas páginas, no la app) puede usar Google Analytics para contar visitas. La app nunca envía datos de análisis, y un navegador que envía Do Not Track no recibe ninguno.",
    pt: "O site público (estas páginas, não o app) pode usar o Google Analytics para contar visitas. O app em si nunca envia dados de análise, e um navegador que envia Do Not Track não recebe nenhum.",
  },

  // ---- footer: track-payments column ----
  "site.footerTrack": { en: "Track payments", es: "Registrar pagos", pt: "Registrar pagamentos" },
  "site.trackVenmo": { en: "Venmo bookkeeping", es: "Contabilidad de Venmo", pt: "Contabilidade do Venmo" },
  "site.trackCashApp": { en: "Cash App bookkeeping", es: "Contabilidad de Cash App", pt: "Contabilidade do Cash App" },
  "site.trackZelle": { en: "Zelle tracking", es: "Registro de Zelle", pt: "Controle do Zelle" },
  "site.trackCash": { en: "Cash income", es: "Ingresos en efectivo", pt: "Renda em dinheiro" },

  // ---- /track/venmo ----
  "site.chVenmoTitle": {
    en: "Venmo bookkeeping, from the screenshots you already take.",
    es: "Contabilidad de Venmo, con las capturas que ya tomas.",
    pt: "Contabilidade do Venmo, com os prints que você já tira.",
  },
  "site.chVenmoSub": {
    en: "Business and personal mixed in one Venmo feed? Screenshot your Transactions list and contado turns it into real books — sorted, totaled, tax-ready.",
    es: "¿Negocio y personal mezclados en un solo Venmo? Toma captura de tu lista de Transacciones y contado la convierte en libros de verdad — separados, sumados, listos para impuestos.",
    pt: "Negócio e pessoal misturados num só Venmo? Tire print da sua lista de Transações e o contado transforma tudo em livro-caixa de verdade — separado, somado, pronto para o imposto.",
  },
  "site.chVenmoPain1": {
    en: "Rent from your cousin, $120.00 from Sarah, gas money — one feed, three different stories.",
    es: "La renta de tu primo, $120.00 de Sarah, dinero de gasolina — un solo feed, tres historias distintas.",
    pt: "O aluguel do seu primo, $120.00 da Sarah, dinheiro da gasolina — um feed só, três histórias diferentes.",
  },
  "site.chVenmoPain2": {
    en: "The social feed hides amounts, and tax season doesn't care.",
    es: "El feed social oculta los montos, y la temporada de impuestos no perdona.",
    pt: "O feed social esconde os valores, e a época do imposto não perdoa.",
  },
  "site.chVenmoPain3": {
    en: "Scrolling January through December to add up a year, by hand.",
    es: "Recorrer de enero a diciembre para sumar el año, a mano.",
    pt: "Rolar de janeiro a dezembro para somar o ano, na mão.",
  },
  "site.chVenmoDoes1": {
    en: "Screenshot the Transactions list — not the social feed — and contado reads every payment: who, how much, when.",
    es: "Toma captura de la lista de Transacciones — no del feed social — y contado lee cada pago: quién, cuánto, cuándo.",
    pt: "Tire print da lista de Transações — não do feed social — e o contado lê cada pagamento: quem, quanto, quando.",
  },
  "site.chVenmoDoes2": {
    en: "Swipe right for business, left for personal. Your cousin's rent never touches your books.",
    es: "Desliza a la derecha para negocio, a la izquierda para personal. La renta de tu primo nunca toca tus libros.",
    pt: "Deslize para a direita para negócio, para a esquerda para pessoal. O aluguel do seu primo nunca entra no seu livro-caixa.",
  },
  "site.chVenmoDoes3": {
    en: "Duplicates are caught across overlapping screenshots, so nothing counts twice — one payment, one entry.",
    es: "Los duplicados se detectan entre capturas superpuestas, así nada se cuenta dos veces — un pago, una entrada.",
    pt: "Duplicatas são detectadas entre prints sobrepostos, então nada conta duas vezes — um pagamento, um lançamento.",
  },
  "site.chVenmoFaq1Q": {
    en: "Do I have to connect my Venmo account?",
    es: "¿Tengo que conectar mi cuenta de Venmo?",
    pt: "Preciso conectar minha conta do Venmo?",
  },
  "site.chVenmoFaq1A": {
    en: "No. There is no Venmo login and no bank connection — you screenshot your own Transactions list and upload it. Screenshots are read by an AI service and discarded, never stored.",
    es: "No. No hay acceso a Venmo ni conexión bancaria — tú tomas captura de tu propia lista de Transacciones y la subes. Las capturas se leen con un servicio de IA y se descartan, nunca se guardan.",
    pt: "Não. Não há login do Venmo nem conexão bancária — você tira print da sua própria lista de Transações e envia. Os prints são lidos por um serviço de IA e descartados, nunca guardados.",
  },
  "site.chVenmoFaq2Q": {
    en: "I use a Venmo business profile. Does it still work?",
    es: "Uso un perfil de negocio en Venmo. ¿Igual funciona?",
    pt: "Uso um perfil comercial no Venmo. Ainda funciona?",
  },
  "site.chVenmoFaq2A": {
    en: "Yes — contado reads the payments your screenshots show, whichever profile they come from. Business or personal, you still confirm every row before it lands in your books.",
    es: "Sí — contado lee los pagos que muestran tus capturas, vengan del perfil que vengan. Negocio o personal, tú confirmas cada fila antes de que entre en tus libros.",
    pt: "Sim — o contado lê os pagamentos que seus prints mostram, venham do perfil que vierem. Comercial ou pessoal, você confirma cada linha antes de entrar no livro-caixa.",
  },

  // ---- /track/cash-app ----
  "site.chCashAppTitle": {
    en: "Cash App bookkeeping for people paid by the day.",
    es: "Contabilidad de Cash App para quien cobra por día.",
    pt: "Contabilidade do Cash App para quem recebe por dia.",
  },
  "site.chCashAppSub": {
    en: "Cuts, cleans, side jobs — screenshot your Cash App activity at close and the day is booked in two minutes, one hand.",
    es: "Cortes, limpiezas, trabajos extra — captura tu actividad de Cash App al cierre y el día queda registrado en dos minutos, con una mano.",
    pt: "Cortes, faxinas, bicos — tire print da sua atividade do Cash App no fim do dia e tudo fica lançado em dois minutos, com uma mão.",
  },
  "site.chCashAppPain1": {
    en: "Cash App says one number, the drawer says another.",
    es: "Cash App dice un número, la caja dice otro.",
    pt: "O Cash App diz um número, a gaveta diz outro.",
  },
  "site.chCashAppPain2": {
    en: "Payments to your $cashtag pile up with no note of which job they were.",
    es: "Los pagos a tu $cashtag se acumulan sin nota de qué trabajo eran.",
    pt: "Os pagamentos no seu $cashtag se acumulam sem nota de qual serviço eram.",
  },
  "site.chCashAppPain3": {
    en: "In January someone asks for your income and it lives in two apps and a pocket.",
    es: "En enero alguien pide tus ingresos y viven en dos apps y un bolsillo.",
    pt: "Em janeiro alguém pede sua renda e ela mora em dois apps e um bolso.",
  },
  "site.chCashAppDoes1": {
    en: "Screenshot your Cash App activity; contado reads every payment and you confirm each row before it counts.",
    es: "Toma captura de tu actividad de Cash App; contado lee cada pago y tú confirmas cada fila antes de que cuente.",
    pt: "Tire print da sua atividade do Cash App; o contado lê cada pagamento e você confirma cada linha antes de contar.",
  },
  "site.chCashAppDoes2": {
    en: "Log cash jobs in a few taps — the amount, then paid in cash. Cash days and Cash App days land in the same books.",
    es: "Los trabajos en efectivo se registran en unos toques — el monto y pagado en efectivo. Los días de efectivo y los de Cash App llegan a los mismos libros.",
    pt: "Serviços em dinheiro entram em poucos toques — o valor e pago em dinheiro. Os dias de dinheiro e os de Cash App caem no mesmo livro-caixa.",
  },
  "site.chCashAppDoes3": {
    en: "Who still owes you waits in its own tab, grouped by client, aged — one tap when they pay.",
    es: "Quién te debe espera en su propia pestaña, por cliente y con los días — un toque cuando pagan.",
    pt: "Quem ainda te deve espera na própria aba, por cliente e com os dias — um toque quando pagam.",
  },
  "site.chCashAppFaq1Q": {
    en: "Cash App takes a fee on some payments. Which amount gets recorded?",
    es: "Cash App cobra comisión en algunos pagos. ¿Qué monto se registra?",
    pt: "O Cash App cobra taxa em alguns pagamentos. Qual valor é registrado?",
  },
  "site.chCashAppFaq1A": {
    en: "The amount your screenshot shows. If you want to log a fee, add it as an expense — contado never invents numbers you didn't confirm.",
    es: "El monto que muestra tu captura. Si quieres registrar la comisión, agrégala como gasto — contado nunca inventa números que no confirmaste.",
    pt: "O valor que o seu print mostra. Se quiser registrar a taxa, lance como despesa — o contado nunca inventa números que você não confirmou.",
  },
  "site.chCashAppFaq2Q": {
    en: "Half my week is cash, not Cash App. Still worth it?",
    es: "La mitad de mi semana es efectivo, no Cash App. ¿Aún vale la pena?",
    pt: "Metade da minha semana é dinheiro vivo, não Cash App. Ainda vale a pena?",
  },
  "site.chCashAppFaq2A": {
    en: "Yes — a cash job is a few taps: the amount, then paid in cash. Both halves of your week land in the same books.",
    es: "Sí — un trabajo en efectivo son unos toques: el monto y pagado en efectivo. Las dos mitades de tu semana llegan a los mismos libros.",
    pt: "Sim — um serviço em dinheiro são poucos toques: o valor e pago em dinheiro. As duas metades da sua semana caem no mesmo livro-caixa.",
  },

  // ---- /track/zelle ----
  "site.chZelleTitle": {
    en: "Zelle payment tracking without the bank login.",
    es: "Registro de pagos Zelle sin la clave del banco.",
    pt: "Controle de pagamentos Zelle sem a senha do banco.",
  },
  "site.chZelleSub": {
    en: "Zelle lives inside your banking app and exports nothing. Screenshot your Zelle activity and contado builds the books your bank never gave you.",
    es: "Zelle vive dentro de la app de tu banco y no exporta nada. Captura tu actividad de Zelle y contado arma los libros que tu banco nunca te dio.",
    pt: "O Zelle mora dentro do app do seu banco e não exporta nada. Tire print da sua atividade do Zelle e o contado monta o livro-caixa que seu banco nunca te deu.",
  },
  "site.chZellePain1": {
    en: "No feed, no export, no history page — just entries inside your bank app.",
    es: "Sin feed, sin exportar, sin página de historial — solo movimientos dentro de la app del banco.",
    pt: "Sem feed, sem exportação, sem página de histórico — só lançamentos dentro do app do banco.",
  },
  "site.chZellePain2": {
    en: "Payments from clients and transfers from family, all in the same list.",
    es: "Pagos de clientes y transferencias de la familia, todo en la misma lista.",
    pt: "Pagamentos de clientes e transferências da família, tudo na mesma lista.",
  },
  "site.chZellePain3": {
    en: "Come tax time, Zelle income is the number everyone forgets.",
    es: "Al llegar los impuestos, el ingreso por Zelle es el número que todos olvidan.",
    pt: "Na hora do imposto, a renda do Zelle é o número que todo mundo esquece.",
  },
  "site.chZelleDoes1": {
    en: "Screenshot the Zelle activity in your banking app — contado reads names, amounts and dates from the picture.",
    es: "Toma captura de la actividad de Zelle en la app de tu banco — contado lee nombres, montos y fechas de la imagen.",
    pt: "Tire print da atividade do Zelle no app do seu banco — o contado lê nomes, valores e datas da imagem.",
  },
  "site.chZelleDoes2": {
    en: "Swipe business from personal; only business lands in your totals and your tax CSV.",
    es: "Desliza para separar negocio de personal; solo el negocio entra en tus totales y en tu CSV de impuestos.",
    pt: "Deslize para separar negócio de pessoal; só o negócio entra nos seus totais e no CSV do imposto.",
  },
  "site.chZelleDoes3": {
    en: "Log the job when you finish it; when the Zelle payment shows up in a screenshot, it matches and clears the owed entry on its own.",
    es: "Registra el trabajo al terminarlo; cuando el pago por Zelle aparece en una captura, se empareja y cierra lo pendiente solo.",
    pt: "Registre o serviço ao terminar; quando o pagamento do Zelle aparece num print, ele concilia e dá baixa no pendente sozinho.",
  },
  "site.chZelleFaq1Q": {
    en: "Which banks work?",
    es: "¿Con qué bancos funciona?",
    pt: "Funciona com quais bancos?",
  },
  "site.chZelleFaq1A": {
    en: "Any bank whose app shows your Zelle activity on screen — if you can screenshot it, contado can read it. You confirm every row before it counts.",
    es: "Cualquier banco cuya app muestre tu actividad de Zelle en pantalla — si puedes tomarle captura, contado puede leerla. Tú confirmas cada fila antes de que cuente.",
    pt: "Qualquer banco cujo app mostre sua atividade do Zelle na tela — se dá para tirar print, o contado consegue ler. Você confirma cada linha antes de contar.",
  },
  "site.chZelleFaq2Q": {
    en: "Do I have to give contado my bank login?",
    es: "¿Tengo que darle a contado la clave de mi banco?",
    pt: "Preciso dar ao contado a senha do meu banco?",
  },
  "site.chZelleFaq2A": {
    en: "No. You upload your own screenshots — there is no bank login in contado today, and screenshots will always be the default.",
    es: "No. Tú subes tus propias capturas — hoy no hay acceso bancario en contado, y las capturas siempre serán lo principal.",
    pt: "Não. Você envia seus próprios prints — hoje não existe login bancário no contado, e os prints sempre serão o padrão.",
  },

  // ---- /track/cash ----
  "site.chCashTitle": {
    en: "How to track cash income when you're self-employed.",
    es: "Cómo llevar el ingreso en efectivo si trabajas por tu cuenta.",
    pt: "Como controlar a renda em dinheiro de quem trabalha por conta própria.",
  },
  "site.chCashSub": {
    en: "No receipt, no record, no proof — unless you log it. contado makes the log quick enough to actually happen: type the amount, mark it paid in cash, done.",
    es: "Sin recibo, sin registro, sin comprobante — a menos que lo anotes. contado hace el registro tan rápido que de verdad sucede: escribes el monto, lo marcas pagado en efectivo, listo.",
    pt: "Sem recibo, sem registro, sem comprovante — a não ser que você anote. O contado deixa o registro rápido o bastante para acontecer de verdade: você digita o valor, marca como pago em dinheiro, pronto.",
  },
  "site.chCashPain1": {
    en: "The drawer knows your real number; your records don't.",
    es: "La caja sabe tu número real; tus registros no.",
    pt: "A gaveta sabe seu número real; seus registros não.",
  },
  "site.chCashPain2": {
    en: "Apartments, loans and tax preparers all ask for proof of income that cash can't show.",
    es: "Departamentos, préstamos y contadores piden un comprobante de ingresos que el efectivo no da.",
    pt: "Aluguel, financiamento e contador pedem um comprovante de renda que o dinheiro vivo não dá.",
  },
  "site.chCashPain3": {
    en: "A year of little jobs adds up to a number you can only guess.",
    es: "Un año de trabajos pequeños suma un número que solo puedes adivinar.",
    pt: "Um ano de servicinhos soma um número que você só consegue chutar.",
  },
  "site.chCashDoes1": {
    en: "Log a cash job in a few taps — the amount, then paid in cash. Built for one hand, between jobs.",
    es: "Registra un trabajo en efectivo en unos toques — el monto y pagado en efectivo. Hecho para una mano, entre trabajos.",
    pt: "Registre um serviço em dinheiro em poucos toques — o valor e pago em dinheiro. Feito para uma mão, entre um serviço e outro.",
  },
  "site.chCashDoes2": {
    en: "Cash sits next to your Venmo, Cash App and Zelle income — one ledger, every total real.",
    es: "El efectivo queda junto a tus ingresos de Venmo, Cash App y Zelle — un solo libro, cada total real.",
    pt: "O dinheiro fica ao lado da sua renda de Venmo, Cash App e Zelle — um livro só, cada total de verdade.",
  },
  "site.chCashDoes3": {
    en: "Print a proof of income any time, and hand your preparer a CSV of actual income and expenses.",
    es: "Imprime un comprobante de ingresos cuando quieras, y entrégale a tu contador un CSV de ingresos y gastos reales.",
    pt: "Imprima um comprovante de renda quando quiser, e entregue ao seu contador um CSV de renda e despesas reais.",
  },
  "site.chCashFaq1Q": {
    en: "Is logging cash income even worth it for taxes?",
    es: "¿Vale la pena registrar el ingreso en efectivo para los impuestos?",
    pt: "Vale a pena registrar a renda em dinheiro para o imposto?",
  },
  "site.chCashFaq1A": {
    en: "What you report is between you and your preparer — contado's job is the record. Every cash entry is dated, totaled and exportable, so whatever you decide, you have the numbers.",
    es: "Lo que declaras es entre tú y tu contador — el trabajo de contado es el registro. Cada entrada en efectivo queda con fecha, sumada y exportable, así que decidas lo que decidas, tienes los números.",
    pt: "O que você declara é entre você e seu contador — o trabalho do contado é o registro. Cada lançamento em dinheiro fica com data, somado e exportável; decida o que decidir, os números estão com você.",
  },
  "site.chCashFaq2Q": {
    en: "Can I log a cash job someone still owes me for?",
    es: "¿Puedo registrar un trabajo en efectivo que todavía me deben?",
    pt: "Posso registrar um serviço em dinheiro que ainda estão me devendo?",
  },
  "site.chCashFaq2A": {
    en: "Yes — log the sale and answer “No — owes me.” It waits in Owed under their name until you tap “Got cash.”",
    es: "Sí — registra la venta y responde “No — me debe”. Queda en Por cobrar a su nombre hasta que tocas “Recibí efectivo”.",
    pt: "Sim — registre a venda e responda “Não — me deve”. Fica em A receber no nome da pessoa até você tocar “Recebi em dinheiro”.",
  },

  // ---- FAQ: long-tail additions ----
  "site.faq11Q": {
    en: "How do I keep track of who owes me money?",
    es: "¿Cómo llevo el control de quién me debe dinero?",
    pt: "Como faço para saber quem está me devendo?",
  },
  "site.faq11A": {
    en: "Log the job when you do the work, even before the money arrives. It waits in Owed, grouped by client and aged, until you tap “Got cash” — or a payment in your next screenshots clears it automatically.",
    es: "Registra el trabajo cuando lo haces, aun antes de que llegue el dinero. Queda en la pestaña Por cobrar, por cliente y con los días, hasta que tocas “Recibí efectivo” — o un pago en tus próximas capturas lo cierra solo.",
    pt: "Registre o serviço quando fizer o trabalho, mesmo antes de o dinheiro chegar. Ele espera na aba A receber, por cliente e com os dias, até você tocar “Recebi em dinheiro” — ou um pagamento nos próximos prints dá baixa sozinho.",
  },
  "site.faq12Q": {
    en: "How do I prove my income if I'm paid in cash?",
    es: "¿Cómo compruebo mis ingresos si me pagan en efectivo?",
    pt: "Como comprovo minha renda se recebo em dinheiro?",
  },
  "site.faq12A": {
    en: "Log the cash as it comes in. contado builds a proof of income you can print or save as PDF, plus a CSV of actual income and expenses your tax preparer opens directly.",
    es: "Registra el efectivo cuando llega. contado arma un comprobante de ingresos que puedes imprimir o guardar como PDF, más un CSV de ingresos y gastos reales que tu contador abre directo.",
    pt: "Registre o dinheiro conforme ele entra. O contado monta um comprovante de renda que você pode imprimir ou salvar em PDF, mais um CSV de renda e despesas reais que seu contador abre direto.",
  },
  "site.faq13Q": {
    en: "Can it separate business and personal Venmo payments?",
    es: "¿Puede separar los pagos personales y de negocio en Venmo?",
    pt: "Dá para separar pagamentos pessoais e do negócio no Venmo?",
  },
  "site.faq13A": {
    en: "Yes — that's the swipe. Every payment read from your screenshots becomes a card: right is business, left is personal. Personal never touches your books or your taxes.",
    es: "Sí — para eso es el deslizamiento. Cada pago leído de tus capturas se vuelve una tarjeta: derecha es negocio, izquierda es personal. Lo personal nunca toca tus libros ni tus impuestos.",
    pt: "Sim — é para isso que serve o deslize. Cada pagamento lido dos seus prints vira um cartão: direita é negócio, esquerda é pessoal. O pessoal nunca entra no seu livro-caixa nem nos seus impostos.",
  },
} as const;
