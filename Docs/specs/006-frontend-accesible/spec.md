# Spec 006 — Frontend accesible

**Estado:** pendiente
**Fase:** 5 de 7
**Constitución:** §1.1 y §4 (accesibilidad), §3.1 (idiomas)

## 1. Propósito

La accesibilidad **no es un extra de este proyecto: es el producto** (§1.1). El
usuario objetivo tiene dificultades visuales, motrices o cognitivas, o
simplemente no está familiarizado con la tecnología. Cualquier decisión de
diseño se juzga con una pregunta: *¿puede usarlo alguien de 75 años con
problemas de vista?*

Esta spec construye la base visual y de navegación sobre la que se
implementarán los tres juegos. Define el sistema de tokens de diseño, la
navegación por teclado, la estructura semántica y el diccionario de textos, de
forma que las specs de juegos hereden la accesibilidad en vez de tener que
reimplementarla pantalla a pantalla.

## 2. Alcance

**Incluye:**

- Sistema de tokens de diseño (tipografía, color, espaciado, tamaños).
- Navegación por teclado con foco visible.
- Estructura semántica y HTML correcto.
- Diccionario centralizado de textos de UI.
- Páginas base: portada, lista de juegos, registro, login.
- Verificación automática de accesibilidad.

**Fuera de alcance:**

- La lógica visual de los tres juegos (specs de la fase 6).
- Clasificación y chat (spec 007).
- E2E completo en tres dispositivos (spec 008); aquí solo la auditoría base.

## 3. Requisitos

### R-001 — Tipografía ampliable

- Tamaño de fuente base **16px** como mínimo.
- Control para aumentar el tamaño **hasta el 200%**.
- El aumento **persiste** entre recargas y naveecciones.
- La tipografía es sans-serif y de lectura clara.
- **Ningún texto** se incrusta como imagen.

### R-002 — Objetivos táctiles

- Botones y enlaces tienen un área mínima de **44×44px**.
- Los controles contiguos están bien separados.
- El espaciado se mantiene al aumentar el tamaño de fuente.

### R-003 — Contraste

- Contraste mínimo **4.5:1** en texto normal, **3:1** en texto grande y
  bordes de controles.
- Ningún color del sistema queda por debajo del umbral.
- El contraste se **verifica automáticamente**, no se estima a ojo.

### R-004 — Sin depender solo del color

- Toda información que se transmite por color va **también** por texto, icono
  o forma.
- Esto es obligatorio en Wordle: la pista de cada letra no puede ser solo el
  color (§2.1.4).

### R-005 — Navegación por teclado

- **Todo** es accesible con teclado, sin necesidad de ratón.
- El foco es **siempre visible** y no queda oculto tras overlays.
- El orden del foco sigue el orden visual.
- No hay trampas de foco: se puede escapar de cualquier componente.
- El contenido saltable permite llegar al principal en una tecla.

### R-006 — HTML semántico

- Se usan elementos nativos: `button`, `label`, encabezados jerárquicos.
- Cada campo de formulario tiene su `label` asociado.
- Cada imagen tiene `alt`; decorativas, `alt=""`.
- Los botones que solo tienen icono llevan `aria-label` en español.
- El documento declara `lang="es"`.

### R-007 — Diccionario de textos

- **Todas** las cadenas visibles en la UI están en un diccionario central
  (§4.2).
- No hay texto hardcodeado dentro de los componentes.
- El diccionario está en español y usa lenguaje llano, sin tecnicismos.

### R-008 — Animación y sonido

- Se respeta `prefers-reduced-motion`.
- No hay animaciones que puedan provocar mareo, ni parpadeos, ni destellos.
- No hay sonido, o es desactivable.
- Ninguna partida tiene temporizador que expire sin aviso (§4.1).

### R-009 — Mensajes en lenguaje llano

- Los errores dicen **qué pasó y qué hacer**, sin códigos técnicos.
- No hay "Error 500" ni "undefined" en pantalla.
- Los mensajes de validación se asocian a su campo y se anuncian.

### R-010 — Escalado y reflow

- Sin **scroll horizontal** en móvil (360px), tablet ni escritorio (§7.1).
- El contenido no se superpone al aumentar el tamaño al 200%.
- Con zoom del navegador al 200% no se pierde contenido.

### R-011 — Páginas base

- **Portada:** bienvenida, acceso al registro y al login, y enlace a la
  clasificación.
- **Lista de juegos:** los tres juegos, cada uno con nombre, descripción clara y
  el estado (jugado / sin jugar).
- **Registro** y **login:** accesibles, con validación en lenguaje llano.
- Todas con el mismo esqueleto: `main`, encabezados jerárquicos y navegación.

### R-012 — Verificación automática de accesibilidad

Existe una prueba automática que audita cada pantalla:

- Se ejecuta **axe-core** sobre portada, lista de juegos, registro y login.
- **Cero violaciones** de nivel A y AA.
- La auditoría falla si aparece una violación nueva.
- Cubre contraste, nombres accesibles, orden del foco y etiquetas.

> Esta auditoría es el punto 4 de §4.3: la accesibilidad se **prueba**, no se
> supone. La comprobación manual del checklist de §4.1 y §4.2 es obligatoria
> **además** de esto, no un sustituto.

### R-013 — Validación de los datos de la API en el cliente

- Los datos que llegan de la API se **validan en tiempo de ejecución** antes
  de usarse (§3.2).
- Si un campo esperado falta o tiene un tipo inesperado, la UI lo detecta y
  muestra un mensaje claro en vez de romperse en silencio.

## 4. Criterios de aceptación

- [ ] El tamaño de fuente se puede subir al 200% y persiste al recargar.
- [ ] Todos los botones miden al menos 44×44px.
- [ ] axe-core no reporta ninguna violación A ni AA en las cuatro pantallas.
- [ ] Todo el recorrido es navegable solo con teclado.
- [ ] El foco es visible en todos los elementos interactivos.
- [ ] Ninguna cadena de texto está hardcodeada en los componentes.
- [ ] `prefers-reduced-motion` desactiva las animaciones.
- [ ] No hay scroll horizontal a 360px ni al zoom del 200%.
- [ ] Los errores se muestran en lenguaje llano.
- [ ] El documento declara `lang="es"`.
- [ ] Los datos inválidos de la API producen un mensaje, no una pantalla rota.

## 5. Dependencias y referencias

- **Predecesoras:** 001 (entorno), 003 (autenticación, para las pantallas de
  registro y login).
- **Sucesoras:** las specs de juegos y la 007 heredarán estos tokens.
- **Constitución:** §1.1 (accesibilidad como producto), §4.1 (diseño), §4.2
  (técnico), §4.3 (verificación), §3.1 (idiomas), §3.2 (JavaScript).