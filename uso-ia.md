# Uso de IA en el proyecto

## Figma

En figma no se ha dado uso a la IA excepeto por el uso de [**Figma MCP**](#figma-1), que se explicara mas adelante.

## SDD

> Se elijio seguir el modelo de **Spec-Anchored**, para tener siempre el codigo actualizado a la **Spec**, pero teniendo la **flexibilidad** de podre tocar codigo y adaptar la **Spec** a este en casos necesarios.

Para crear la estructura del proyecto siguiendo la **metodología SDD** nos ayudamos de **IA (OpenCode y Codex)**, con el modelo de **Space Bunny** en el caso de **Opencode** y **GPT-6 Luna** en **Codex**, para que crease la estructura correcta en cada documento en base a nuestra descripción.

### Dudas

Se le obligo a exrpesar sus dudas en un archivo Markdown llamado **dudas.md**. Estas dudas serían posteriormente resueltas para poder seguir redactando el archivo **Constitution.md**.

_Gracias a este paso se delimitó el alcance exacto del proyecto y los riesgos que aceptamos asumir para un MVP._

## Implementación de Spec

Una vez tuvimos la **Spec** en un estado que nos pareció correcto empezamos a implementar estas con **Agentes de IA**.

Para ello, les dejamos que trabajaran hasta tener todos los tests pasados para cada **Spec** y nosotros **revisavamos** el trabajo que íban realizando, buscando que no hubiera ningun **error** que el agente hubiera pasado por alto.

### Agentes de IA

- **Opencode**
  - _Modelo_ --> Space Bunny Free - Effor Alto

- **Codex**
  - _Modelo_ --> GPT-6 Luna - Effor Medio

### MCP

#### Figma

Para poder traer el estilo del diseno de **Figma** a nuestra implementación se conecto a **Opencode** el **MCP** de Figma, para **extrer** la información del prototipo y crear un archivo **Markdown** que define los **estilos**, **colores** etc.

_Estos estilos se adaptaron al las normas de accesibilidad de **WCAG 2.2 AA** por parte de la IA, aceptamos los cambios propeustos y de ahi la diferencia respecto al prototipo_

## Evidencias

- La documentación del proceso y los requisitos elaborados con apoyo de IA se
  pueden consultar en [`Docs/`](Docs/README.md), incluidas las especificaciones
  numeradas y el registro de dudas.
- La adaptación del diseño de Figma se refleja en el sistema de diseño y sus
  pruebas: [`Docs/sistema-diseno.md`](Docs/sistema-diseno.md) y los archivos de
  `frontend/src/design/`.
- Prototipo utilizado como referencia: [Figma — Abuelos](https://www.figma.com/design/QCSNtnC9MKocVP36jPhDxi/Abuelos?node-id=58-183&p=f&t=aiMBIqLb7SYhSXBr-0).

La IA se utilizó como apoyo; el equipo revisó las propuestas y decidió cuáles
incorporar.
