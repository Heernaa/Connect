# Plan — Spec 006: Frontend accesible

**Estado:** pendiente
**Progreso:** 0/16 tareas
**Rama:** `feature/spec-006-frontend-accesible`
**Spec:** [`spec.md`](./spec.md)

## Tareas

### R-001 a R-003 — Tokens de diseño

- [ ] 6.1 Definir la escala tipográfica en Tailwind con base 16px.
      → *R-001*
- [ ] 6.2 Implementar el control de tamaño de fuente con persistencia
      (localStorage) y tope del 200%.
      → *R-001*
- [ ] 6.3 Definir una escala de espaciado que garantice los 44×44px como mínimo en
      todos los controles interactivos.
      → *R-002*
- [ ] 6.4 Definir la paleta de colores y **verificar con una herramienta** que
      todos los pares cumplen 4.5:1 (3:1 en texto grande y bordes).
      → *R-003*
- [ ] 6.5 Test o script que falle si algún par de colores baja del umbral.
      → *R-003*

### R-004 — Sin depender solo del color

- [ ] 6.6 Documentar la regla y aplicarla a los componentes que transmiten
      estado por color (base para Wordle).
      → *R-004*

### R-005 — Navegación por teclado

- [ ] 6.7 Implementar el anillo de foco visible en todos los elementos
      interactivos, con contraste suficiente sobre cualquier fondo.
      → *R-005*
- [ ] 6.8 Verificar el orden del foco y añadir enlace de salto al contenido
      principal.
      → *R-005*
- [ ] 6.9 Comprobar que no hay trampas de foco en menús o diálogos.
      → *R-005*

### R-006 — HTML semántico

- [ ] 6.10 Crear la estructura base del documento con `lang="es"`, encabezados
      jerárquicos correctos y `main`.
      → *R-006*
- [ ] 6.11 Implementar los componentes base (botón, campo, tarjeta) con
      HTML nativo y `label` asociado.
      → *R-006*

### R-007 — Diccionario de textos

- [ ] 6.12 Crear el diccionario central con todas las cadenas de la UI en
      español llano.
      → *R-007*
- [ ] 6.13 Verificar con grep que no queda ninguna cadena hardcodeada en los
      componentes.
      → *R-007*

### R-008 a R-010 — Animación, mensajes y reflow

- [ ] 6.14 Respetar `prefers-reduced-motion` en todas las animaciones y
      transiciones.
      → *R-008*
- [ ] 6.15 Implementar el componente de error y de validación en lenguaje
      llano, asociado al campo y anunciado.
      → *R-009*
- [ ] 6.16 Comprobar reflow a 360px y con zoom al 200%: sin scroll horizontal
      ni solapamientos.
      → *R-010*

### R-011 — Páginas base

- [ ] 6.17 Portada con bienvenida, registro, login y enlace a clasificación.
      → *R-011*
- [ ] 6.18 Lista de juegos con nombre, descripción y estado.
      → *R-011*
- [ ] 6.19 Pantallas de registro y de login, con validación accesible.
      → *R-011*

### R-012 — Auditoría de accesibilidad

- [ ] 6.20 Configurar Playwright con axe-core y auditar las cuatro pantallas
      base.
      → *R-012*
- [ ] 6.21 Dejar la auditoría en la suite de pruebas, de modo que una
      violación nueva rompa la build.
      → *R-012*

### R-013 — Validación en el cliente

- [ ] 6.22 Implementar la validación en tiempo de ejecución de los datos de la
      API, con mensaje claro si el formato no cuadra.
      → *R-013*

## Verificación de la spec

- [ ] V.1 La fuente llega al 200% y persiste al recargar.
- [ ] V.2 Todos los botones miden 44×44px o más.
- [ ] V.3 axe-core no reporta violaciones A ni AA.
- [ ] V.4 El recorrido es navegable solo con teclado.
- [ ] V.5 El foco es visible en todo elemento interactivo.
- [ ] V.6 No hay texto hardcodeado en componentes.
- [ ] V.7 `prefers-reduced-motion` desactiva animaciones.
- [ ] V.8 Sin scroll horizontal a 360px ni al 200%.
- [ ] V.9 Los errores se muestran en lenguaje llano.
- [ ] V.10 El documento declara `lang="es"`.
- [ ] V.11 Datos inválidos producen mensaje, no pantalla rota.

## Notas

- La tarea 6.4 (verificar contraste) **debe hacerse con una herramienta**, no a
  ojo. La constitución lo pide expresamente en §4.2 y es el fallo más común.
- La auditoría axe-core (6.20) es **automatizada**. No sustituye a la revisión
  manual del checklist de §4.1 y §4.2, que sigue siendo obligatoria (§4.3):
  axe detecta lo que sabe medir, y no sabe si un mensaje se entiende.
- Los tokens de diseño creados aquí son la base de los juegos. Si un juego
  necesita un patrón visual nuevo, se añade **al sistema**, no se resuelve
  dentro del componente del juego (§1.3, §3.3).
- Al terminar, merge a `main` y actualizar el índice de `Docs/specs/README.md`.