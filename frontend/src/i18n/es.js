/**
 * Diccionario de la interfaz, en español (§4.2).
 *
 * Ninguna cadena visible se escribe dentro de un componente: todas salen de
 * aquí. Si mañana se añade otro idioma, se añade otro archivo y no se toca ni un
 * componente.
 */
export const es = {
  app: {
    name: 'Connect',
    tagline: 'Juegos de palabras para pensar acompañado.',
    description:
      'Juegos sencillos, sin prisas y sin límite de tiempo. Puedes dejar tu partida y volver cuando quieras: tu progreso no se pierde.',
  },

  accessibility: {
    skipToContent: 'Saltar al contenido principal',
  },

  home: {
    heading: 'Bienvenido a Connect',
    intro:
      'Aquí encontrarás tus juegos de palabras. Todos son de pensar: sin límite de tiempo, sin pagar y sin castigo por equivocarse.',
    // Los nombres y las descripciones de los juegos los sirve la API (§2.1.2):
    // en el cliente no se escribe ni uno.
    comingSoon: 'Tus juegos llegarán en las próximas semanas.',
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

  nav: {
    mainNavigation: 'Navegación principal',
  },
}

export default es