/**
 * Sign-in screen: email field, magic-link sent state, and the human
 * rewrites of network errors. The demo word itself ("tester") is a
 * credential, not copy — it is never translated.
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
  "signin.genericError": {
    en: "Something went wrong. Try again in a moment.",
    es: "Algo salió mal. Intenta de nuevo en un momento.",
    pt: "Algo deu errado. Tente de novo em um instante.",
  },
  "signin.demoFailed": {
    en: "The test account couldn't sign in right now.",
    es: "La cuenta de prueba no pudo entrar en este momento.",
    pt: "A conta de teste não conseguiu entrar agora.",
  },
  "signin.demoUnreachable": {
    en: "Couldn't reach the server. Check your connection and try again.",
    es: "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
    pt: "Não deu para conectar ao servidor. Confira sua conexão e tente de novo.",
  },
} as const;
