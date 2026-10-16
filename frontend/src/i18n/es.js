/**
 * Diccionario de la interfaz, en español (§4.2, R-007).
 *
 * Ninguna cadena visible se escribe dentro de un componente: todas salen de
 * aquí. Si mañana se añade otro idioma, se añade otro archivo y no se toca ni un
 * componente.
 *
 * El estilo es llano a propósito. Quien lee esto es alguien de 70 años que se
 * ha equivocado al teclear, no alguien leyendo documentación técnica. Por eso
 * no hay «inválido», ni «campo requerido», ni «la petición ha fallado»: hay
 * «Escribe tu nombre de usuario» y «No se ha podido conectar con el servidor».
 *
 * Reglas al escribir aquí:
 *
 * · Enfase en segunda persona («Escribe», «Pulsa»), nunca en tercera impersonal.
 * · Cada error dice **qué pasó y qué hacer**. Si no hay nada que hacer, no es un
 *   mensaje de error.
 * · Sin tecnicismos: nada de «timeout», «endpoint», «token» ni «código de error».
 * · Nunca se enseña un número de código técnico a quien usa el producto.
 */
export const es = {
  app: {
    name: 'Connect',
    tagline: 'Juegos de palabras para pensar acompañado.',
    description:
      'Juegos sencillos, sin prisas y sin límite de tiempo. Puedes dejar tu partida y volver cuando quieras: tu progreso no se pierde.',
  },

  common: {
    loading: 'Cargando…',
    yes: 'Sí',
    no: 'No',
    unknown: 'No lo sabemos',
    backHome: 'Volver a la portada',
    retry: 'Volver a intentarlo',
    cancel: 'Cancelar',
    fieldRequirement: '({state})',
    mandatory: 'obligatorio',
    optional: 'opcional',
  },

  accessibility: {
    skipToContent: 'Saltar al contenido principal',
    // El control de tamaño de fuente (R-001). Los botones llevan `aria-label`
    // porque su contenido es una letra y sin esto un lector de pantalla
    // anunciaría «A más», que no explica nada.
    textSize: 'Tamaño del texto',
    textSizeHint: 'Puedes ampliar el texto hasta el doble de su tamaño.',
    increaseTextSize: 'Agrandar el texto',
    decreaseTextSize: 'Reducir el texto',
    currentTextSize: 'Tamaño actual del texto: {percent} por ciento',
    textSizeMax: 'Este es el tamaño máximo.',
    textSizeMin: 'Este es el tamaño mínimo.',
  },

  nav: {
    mainNavigation: 'Navegación principal',
    home: 'Portada',
    games: 'Juegos',
    register: 'Crear una cuenta',
    login: 'Entrar',
    leaderboard: 'Clasificación',
    chat: 'Chat',
  },

  home: {
    heading: 'Bienvenido a Connect',
    intro:
      'Aquí encontrarás tus juegos de palabras. Todos son de pensar: sin límite de tiempo, sin pagar y sin castigo por equivocarse.',
    // Los nombres y las descripciones de los juegos los sirve la API (§2.1.2):
    // en el cliente no se escribe ni uno.
    comingSoon: 'Tus juegos llegarán en las próximas semanas.',
    whatIsTitle: 'Qué puedes hacer aquí',
    whatIsPlay: 'Jugar a los tres juegos de palabras cuando quieras.',
    whatIsPause: 'Dejar una partida a medias y seguir donde la dejaste.',
    whatIsCommunity: 'Ver la puntuación de otras personas y charlar con ellas.',
    ctaRegister: 'Crear una cuenta',
    ctaLogin: 'Entrar si ya tienes cuenta',
    ctaGames: 'Ver los juegos',
    ctaLeaderboard: 'Ver la clasificación',
  },

  games: {
    heading: 'Los juegos',
    intro: 'Elige un juego para empezar. Puedes cambiar de juego cuando quieras.',
    loading: 'Cargando los juegos…',
    empty: 'Ahora mismo no hay ningún juego disponible. Vuelve a intentarlo más tarde.',
    play: 'Jugar',
    played: 'Ya has jugado',
    notPlayed: 'Sin jugar',
    playedHint: 'Puedes volver a entrar y seguir donde lo dejaste.',
    notPlayedHint: 'Esta es tu primera vez con este juego.',
    // R-011: el estado se dice con texto, no solo con un color. El icono del
    // componente de estado es una señal redundante para quien no distingue
    // colores o usa un lector de pantalla.
    stateLabel: 'Estado: {state}',
  },

  register: {
    heading: 'Crear una cuenta',
    intro:
      'Solo necesitas un nombre de usuario y una contraseña. No pedimos correo electrónico ni datos personales.',
    usernameLabel: 'Nombre de usuario',
    usernameHint: 'Al menos 3 caracteres. Es el nombre con el que entrarás.',
    usernameAutocomplete: 'username',
    passwordLabel: 'Contraseña',
    passwordHint: 'Al menos 8 caracteres. Una frase que recuerdes con facilidad va bien.',
    passwordConfirmLabel: 'Repite la contraseña',
    passwordConfirmHint: 'Escribe aquí la misma contraseña para confirmar que la has retenir.',
    passwordAutocomplete: 'new-password',
    submit: 'Crear mi cuenta',
    submitting: 'Creando la cuenta…',
    success: 'Ya tienes cuenta. Este es el nombre con el que te verán los demás: {alias}.',
    successAction: 'Ir a los juegos',
    haveAccount: '¿Ya tienes cuenta?',
    haveAccountAction: 'Entra con tu nombre de usuario',
  },

  login: {
    heading: 'Entrar',
    intro: 'Escribe tu nombre de usuario y tu contraseña para ver tus juegos.',
    usernameLabel: 'Nombre de usuario',
    passwordLabel: 'Contraseña',
    usernameAutocomplete: 'username',
    passwordAutocomplete: 'current-password',
    submit: 'Entrar',
    submitting: 'Entrando…',
    noAccount: '¿Todavía no tienes cuenta?',
    noAccountAction: 'Crea una ahora',
    signedInAs: 'Estás dentro como {alias}.',
    signOut: 'Cerrar sesión',
    signingOut: 'Cerrando sesión…',
    // El enlace al chat y al borrado van en la cabecera, junto al alias: es
    // donde ya está la información de «quién eres aquí dentro».
    accountHeading: 'Tu cuenta',
  },

  service: {
    heading: 'Estado del servicio',
    loading: 'Comprobando la conexión con el servidor…',
    online: 'Conectado. El servidor responde correctamente.',
    offline: 'No se pudo conectar con el servidor.',
    offlineHint:
      'Si acabas de arrancar el proyecto, espera unos segundos y vuelve a intentarlo. Si el problema sigue, revisa que los tres servicios estén levantados.',
    retry: 'Comprobar de nuevo',
    databaseConnected: 'Base de datos conectada.',
    databaseUnreachable: 'El servidor responde, pero la base de datos no está accesible.',
    checkLabel: 'Servicio en marcha',
    databaseLabel: 'Base de datos',
  },

  /** ERRORES (R-009)
   *
   *  Cada uno dice qué pasó y qué hacer. Sin códigos, sin palabras técnicas y
   *  sin nada que la persona no pueda cumplir. Los del servidor ya vienen
   *  redactados así (`backend/app/errors.py`): aquí solo están los que nacen en
   *  el navegador, y el texto que llega del servidor se enseña tal cual.
   */
  errors: {
    title: 'Algo no ha ido bien',
    // Red
    network: 'No se ha podido conectar con el servidor. Comprueba tu conexión a internet y vuelve a intentarlo.',
    unexpectedResponse: 'El servidor ha devuelto una respuesta que no se entiende. Inténtalo de nuevo en unos segundos.',
    // Formularios (R-009)
    usernameRequired: 'Escribe tu nombre de usuario.',
    usernameTooShort: 'El nombre de usuario necesita al menos 3 caracteres.',
    usernameTooLong: 'El nombre de usuario no puede tener más de 50 caracteres.',
    passwordRequired: 'Escribe tu contraseña.',
    passwordTooShort: 'La contraseña necesita al menos 8 caracteres. Una frase que recuerdes va bien.',
    passwordTooLong: 'La contraseña no puede tener más de 200 caracteres.',
    passwordConfirmationRequired: 'Repite la contraseña para confirmar que la has escrito bien.',
    passwordConfirmationMismatch: 'Las dos contraseñas no son iguales. Vuelve a escribirlas.',
    formUnexpected: 'No se ha podido enviar el formulario. Inténtalo de nuevo.',
    // Contenido de la API (R-013)
    contentUnexpected:
      'La información del juego no se ha podido leer. Vuelve a cargar la página en unos segundos.',
    contentEmpty: 'Ahora mismo no hay nada que enseñar. Vuelve a intentarlo más tarde.',
    // Clasificación y chat (spec 007). Los del servidor ya vienen redactados
    // así; estos son los que nacen en el navegador.
    chatUnavailable: 'No se ha podido cargar el chat. Comprueba tu conexión y vuelve a intentarlo.',
    messageRejected: 'No se ha podido enviar el mensaje. Escríbelo otra vez.',
    // Un hash desconocido lleva a la portada en lugar de a un error: el
    // producto no puede tener callejones sin salida (§2.1.6).
  },

  /** CLASIFICACIÓN (spec 007 · R-001, R-002)
   *
   *  Se ven el alias, los puntos y el juego. Nunca el nombre de usuario: el
   *  servidor ni siquiera lo envía (§6.5).
   */
  leaderboard: {
    heading: 'La clasificación',
    intro: 'Estas son las personas que más puntos tienen. Se puede ver sin entrar en la cuenta.',
    captionGlobal: 'Puntuación total de cada persona, sumando todos los juegos.',
    captionGame: 'Puntuación de cada persona en {game}.',
    loading: 'Cargando la clasificación…',
    empty: 'Todavía no hay nadie en la clasificación. Juega algo y aparecerá aquí.',
    points: '{points} puntos',
    pointsSingular: '1 punto',
    filterLegend: 'Elige qué clasificación quieres ver',
    filterAll: 'Todos los juegos',
    // La palabra «juego» se repite junto al nombre para que el encabezado se
    // entienda solo, sin tener que mirar la columna de al lado.
    gameHeading: 'Juego',
    rankHeading: 'Puesto',
    aliasHeading: 'Alias',
    pointsHeading: 'Puntos',
  },

  /** CHAT (spec 007 · R-003 a R-007)
   *
   *  Solo texto plano, sin enlaces ni imágenes. Los avisos del sistema se
   *  distinguen de lo que escriben las personas, para que nadie pueda hacerse
   *  pasar por el sistema (§6.4).
   */
  chat: {
    heading: 'El chat',
    intro: 'Aquí habla la gente. Se puede leer y escribir con tu alias, nunca con tu nombre de usuario.',
    messagesHeading: 'Mensajes',
    // El aviso va en singular y en plural porque `aria-live` lee las dos
    // formas: una para un mensaje y otra para varios.
    newMessage: 'Hay un mensaje nuevo.',
    newMessages: 'Hay {count} mensajes nuevos.',
    showNew: 'Ver los mensajes nuevos',
    writeLabel: 'Escribe tu mensaje',
    writeHint: 'Máximo {count} letras. No se pueden poner enlaces ni fotos.',
    writePlaceholder: 'Escribe aquí…',
    send: 'Enviar',
    sending: 'Enviando…',
    empty: 'Todavía no hay ningún mensaje. Puedes ser la primera persona en escribir.',
    requiresSession:
      'El chat es para quienes tienen cuenta. Entra con tu nombre de usuario y lo verás.',
    counter: '{written} de {max} letras',
    counterNearLimit: 'Quedan {left} letras.',
    counterOverLimit: 'Has escrito {extra} letras de más. Borra algo antes de enviar.',
    timeLabel: 'Mensaje de las {time}',
    systemLabel: 'Aviso del sistema',
    // El mensaje de quien mira, no el del sistema. Se usa si la conversación
    // aparece de golpe y no queremos que parezca un aviso.
    mineLabel: 'Tú',
  },

  /** BLOQUEO (spec 007 · R-006)
   *
   *  Sin confirmación y sin «¿seguro?». Se pide en el requisito: pedirla justo
   *  cuando alguien te está molestando es lo contrario de útil.
   */
  block: {
    action: 'Bloquear',
    done: 'Bloqueado',
    undo: 'Desbloquear',
    // El `aria-label` **sí** lleva el alias, y el texto visible no. El botón se
    // lee suelto en una lista de mensajes iguales, y sin el alias no se sabe a
    // quién se está bloqueando (WCAG 2.5.3). Un nombre accesible que no contenga
    // el texto visible rompe el reconocimiento por voz.
    actionLabel: 'Bloquear a {alias}',
    undoLabel: 'Desbloquear a {alias}',
    confirmHint: 'Bloquear es inmediato: no te llegará ningún mensaje más de esta persona.',
    undoHint: 'Si le desbloqueas, volverá a poder escribirte.',
    blockedNow: 'Has bloqueado a {alias}. No te llegará ningún mensaje más.',
    unblockedNow: 'Has desbloqueado a {alias}. Ya puede escribirte otra vez.',
  },

  /** BORRADO DE LA CUENTA (spec 007 · R-010, §6.5) */
  deleteAccount: {
    action: 'Borrar mi cuenta',
    warningTitle: 'Vas a borrar tu cuenta',
    warning: 'Se borrará todo lo tuyo: tus partidas, tus puntos y tus mensajes. No hay vuelta atrás y no podrás recuperarlos.',
    // Se dice que no hay copia porque es verdad, y no decirlo dejaría pensar lo
    // contrario (§4.2: ninguna etiqueta engañosa).
    noBackup: 'No se guarda ninguna copia de tus datos.',
    confirm: 'Sí, borrar mi cuenta',
    confirming: 'Borrando…',
    done: 'Tu cuenta se ha borrado.',
  },

  /** Páginas que aún no están hechas. */
  upcoming: {
    leaderboard: {
      heading: 'La clasificación',
      intro:
        'Aquí se verá quién ha sacado más puntos en cada juego. Estamos preparándolo: todavía no está listo.',
    },
  },

  footer: {
    tagline: 'Juegos de palabras para pensar acompañado, sin prisas.',
  },
}

export default es
