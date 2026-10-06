/**
 * Sign-in screen: email field, magic-link sent state, and the human
 * rewrites of network errors.
 */
export const messages = {
  "signin.emailLabel": {
    en: "Your email",
    es: "Tu correo",
    pt: "Seu e-mail",
  },
  "signin.emailPlaceholder": {
    en: "you@example.com",
    es: "tu@ejemplo.com",
    pt: "voce@exemplo.com",
  },
  "signin.sendButton": {
    en: "Email me a sign-in link",
    es: "Envíame un enlace para entrar",
    pt: "Me envie um link para entrar",
  },
  "signin.sending": {
    en: "Sending…",
    es: "Enviando…",
    pt: "Enviando…",
  },
  "signin.checkEmail": {
    en: "Check your email",
    es: "Revisa tu correo",
    pt: "Confira seu e-mail",
  },
  "signin.sentTo": {
    en: "We sent a sign-in link to {email}. Open it",
    es: "Te enviamos un enlace de acceso a {email}. Ábrelo",
    pt: "Enviamos um link de acesso para {email}. Abra",
  },
  "signin.onThisDevice": {
    en: "on this device",
    es: "en este dispositivo",
    pt: "neste aparelho",
  },
  "signin.sentTail": {
    en: "— the link signs in whichever browser opens it.",
    es: "— el enlace inicia sesión en el navegador que lo abra.",
    pt: "— o link faz login no navegador em que for aberto.",
  },
  "signin.newLinkSent": {
    en: "New link sent.",
    es: "Nuevo enlace enviado.",
    pt: "Novo link enviado.",
  },
  "signin.nothingYet": {
    en: "Nothing yet? Give it a minute, then check spam.",
    es: "¿Nada todavía? Dale un minuto y revisa el spam.",
    pt: "Nada ainda? Espere um minuto e olhe o spam.",
  },
  "signin.differentEmail": {
    en: "Different email",
    es: "Otro correo",
    pt: "Outro e-mail",
  },
  "signin.resendLink": {
    en: "Resend link",
    es: "Reenviar enlace",
    pt: "Reenviar link",
  },
  "signin.unreachable": {
    en: "Couldn't reach the server. Check your connection and try again — if it keeps failing, it's us, not you.",
    es: "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo — si sigue fallando, es cosa nuestra, no tuya.",
    pt: "Não deu para conectar ao servidor. Confira sua conexão e tente de novo — se continuar falhando, o problema é nosso, não seu.",
  },
  // Shown for every 429 GoTrue raises on the sign-in endpoint: the
  // project-wide auth-email budget (Supabase Auth → Rate Limits — a FIXED
  // hourly window, so once it is spent nothing sends until the hour rolls
  // over), the 60 s per-address cooldown, and the per-IP request bucket
  // (~30 per 5 min). "Up to an hour" is the honest ceiling; the other two
  // clear far sooner. Without this key the raw English "email rate limit
  // exceeded" reached Spanish and Portuguese screens — three times, on
  // launch night.
  "signin.tooMany": {
    en: "Too many sign-in emails right now. Try again later — it can take up to an hour to clear.",
    es: "Demasiados correos de acceso por ahora. Intenta más tarde — puede tardar hasta una hora en liberarse.",
    pt: "Muitos e-mails de acesso agora. Tente mais tarde — pode levar até uma hora para liberar.",
  },
  // The resend button's countdown, matching the server's per-address window.
  "signin.resendIn": {
    en: "Resend in {seconds}s",
    es: "Reenviar en {seconds}s",
    pt: "Reenviar em {seconds}s",
  },
  "signin.genericError": {
    en: "Something went wrong. Try again in a moment.",
    es: "Algo salió mal. Intenta de nuevo en un momento.",
    pt: "Algo deu errado. Tente de novo em um instante.",
  },
  "signin.google": {
    en: "Continue with Google",
    es: "Continuar con Google",
    pt: "Continuar com o Google",
  },
  "signin.or": {
    en: "or",
    es: "o",
    pt: "ou",
  },
  // A sign-in that came BACK as an error in the URL (sign-in.tsx,
  // readReturnError). The app's own "Resend link" makes the first email's
  // link dead, so "open the newest email" is the instruction that works.
  "signin.linkExpired": {
    en: "That sign-in link expired or was already used. Enter your email for a new one, then open the newest email from us.",
    es: "Ese enlace de acceso venció o ya se usó. Escribe tu correo para recibir uno nuevo y abre el correo más reciente que te enviemos.",
    pt: "Esse link de acesso expirou ou já foi usado. Digite seu e-mail para receber um novo e abra o e-mail mais recente que enviarmos.",
  },
  "signin.returnFailed": {
    en: "That sign-in didn't go through. Try again below.",
    es: "Ese inicio de sesión no se completó. Intenta de nuevo abajo.",
    pt: "Esse login não foi concluído. Tente de novo abaixo.",
  },
  // The confirmation shown when a session arrives in the URL on a device
  // that never started a sign-in (upload-screen.tsx LinkSignedIn).
  "signin.linkedTitle": {
    en: "Signed in from a link",
    es: "Sesión iniciada desde un enlace",
    pt: "Login feito por um link",
  },
  "signin.linkedBody": {
    en: "This link signed this device in as {email}. If that's you, continue. If it isn't, sign out — anything you add here would go into that account.",
    es: "Este enlace inició sesión en este dispositivo como {email}. Si eres tú, continúa. Si no, cierra sesión — todo lo que agregues aquí iría a esa cuenta.",
    pt: "Este link entrou neste aparelho como {email}. Se for você, continue. Se não for, saia — tudo o que você adicionar aqui iria para essa conta.",
  },
  "signin.linkedContinue": { en: "Continue", es: "Continuar", pt: "Continuar" },
  "signin.linkedNotMe": {
    en: "Not me — sign out",
    es: "No soy yo — cerrar sesión",
    pt: "Não sou eu — sair",
  },
  "signin.googleFailed": {
    en: "Google sign-in didn't go through. Use the email link instead.",
    es: "No se pudo entrar con Google. Usa el enlace por correo.",
    pt: "Não deu para entrar com o Google. Use o link por e-mail.",
  },
} as const;
