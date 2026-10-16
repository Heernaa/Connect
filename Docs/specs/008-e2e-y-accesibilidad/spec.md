# Spec 008 — E2E y verificación de accesibilidad

**Estado:** planificada — desbloqueada (las pantallas de los juegos están en la
spec 006)
**Fase:** 7 de 7
**Constitución:** §5 (pruebas), §4.3 (verificación), §7.1 (dispositivos)

## 1. Propósito

Esta spec cierra el proyecto con la verificación que demuestra que lo construido
funciona de verdad **y** que cumple los estándares de accesibilidad que son el
núcleo del producto (§1.1).

Las pruebas E2E recorren la aplicación como lo haría una persona: registrarse,
jugar a los tres juegos, ver la clasificación y usar el chat. La auditoría de
accesibilidad comprueba cada pantalla contra **WCAG 2.2 nivel AA**, que es el
compromiso asumido.

Ambas cosas se ejecutan en **los tres dispositivos objetivo** — ordenador, tablet
y móvil — porque ninguno de los tres es secundario (§7.1).

## 2. Alcance

**Incluye:**

- Recorridos E2E de los flujos principales.
- Auditoría de accesibilidad en todas las pantallas.
- Configuración de Playwright en los tres dispositivos.
- Checklist manual de §4.1 y §4.2 documentado como verificación.

**Fuera de alcance:**

- Pruebas de carga o rendimiento.
- Pruebas en navegadores muy antiguos.
- Certificación externa de accesibilidad.

## 3. Requisitos

### R-001 — Recorrido completo de juego

- Un E2E recorre: registro → login → jugar → ver puntuación → clasificación.
- Cubre **los tres juegos**, no solo uno.
- Se verifica que la puntuación que aparece coincide con la calculada por el
  servidor.

### R-002 — Un E2E por juego

- **Paraulógic:** encontrar una palabra, pedir una pista, comprobar que la
  puntuación sube 1 punto y que la pista no resta.
- **Wordle:** hacer intentos, ver las tres pistas, confirmar que **solo se puede
  jugar una vez**.
- **Acertijo:** responder bien y mal, comprobar que la puntuación no penaliza los
  intentos previos.

### R-003 — Persistencia entre sesiones

- Un E2E comprueba que el progreso **sobrevive** a cerrar el navegador y volver.
- Incluye recargar a mitad de Paraulógic.

### R-004 — Chat

- Un E2E envía un mensaje, lo ve en el polling y comprueba el bloqueo.

### R-005 — Accesibilidad automática

- axe-core audita **todas** las pantallas, incluidas las de los tres juegos.
- **Cero violaciones** de nivel A y AA.
- La auditoría corre en la suite: una violación nueva **rompe la build**.

### R-006 — Los tres dispositivos

- Los E2E se ejecutan en los perfiles de **ordenador, tablet y móvil** (§7.1).
- Sin scroll horizontal en móvil (360px).
- Sin pérdida de contenido con zoom al 200%.

### R-007 — Navegación por teclado

- Un E2E **completa un flujo entero solo con teclado**.
- El foco es visible y el orden sigue el visual.
- No hay trampas de foco.

### R-008 — Verificación manual documentada

- La auditoría automática **no sustituye** a la revisión manual (§4.3).
- Existe un checklist de §4.1 y §4.2 que se recorre pantalla por pantalla.
- El checklist está firmado y fechado: consta quién lo hizo y cuándo.
- axe detecta lo que sabe medir; **no** sabe si un mensaje se entiende.

### R-009 — CI local

- Un comando ejecuta toda la suite: unitarias, integración y E2E.
- El proyecto no se despliega, pero la suite debe poder correr de una vez.
- Un fallo de accesibilidad rompe la suite igual que un fallo funcional.

## 4. Criterios de aceptación

- [ ] El E2E completo pasa de principio a fin.
- [ ] Los tres juegos tienen E2E propio.
- [ ] La puntuación mostrada coincide con la del servidor.
- [ ] El progreso sobrevive a cerrar el navegador.
- [ ] Wordle no se puede jugar dos veces.
- [ ] axe-core no reporta violaciones A ni AA en ninguna pantalla.
- [ ] Los E2E pasan en ordenador, tablet y móvil.
- [ ] Sin scroll horizontal a 360px.
- [ ] Un flujo completo se puede hacer solo con teclado.
- [ ] El checklist manual está firmado y fechado.

## 5. Dependencias y referencias

- **Predecesoras:** todas las specs anteriores (001 a 007).
- **Sucesoras:** ninguna. Es la última.
- **Constitución:** §4.1, §4.2, §4.3 (accesibilidad), §5 (estrategia de
  pruebas), §7.1 (dispositivos).

> **Esta spec estaba bloqueada y ya no lo está.** R-001, R-002 y R-005 exigen
> recorridos y auditorías de **las pantallas de los tres juegos**, y esas
> pantallas no existían: la 006 las dejaba fuera de su alcance remitiendo a
> «specs de la fase 6» que nunca se escribieron.
>
> El 2026-10-16 las pantallas de Paraulógic, Wordle y Acertijo entraron en la
> **spec 006** (R-014 a R-020), junto con el botón «Saltar partida» de §2.1.6 y
> el reporte de acertijo de §2.1.4. Con eso, «un E2E por juego» y «axe sobre
> todas las pantallas» ya tienen algo que medir.