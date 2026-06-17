# pm-mcp — Instrucciones para Claude Code

## Qué es esto

`pm-mcp` es un servidor MCP que expone los tools `get_trello_card` y `get_jira_issue` para traer el contenido de tarjetas e issues directamente en Claude Code.

Para que Claude analice los resultados automáticamente con Opus, copiá la sección de abajo a tu `~/.claude/CLAUDE.md` (configuración global) o al `CLAUDE.md` de tu proyecto. Esta sección es la fuente de verdad — si la actualizás acá, actualizala también en el global.

---

## Análisis de tarjetas y issues con Opus

Cuando uses `get_trello_card` o `get_jira_issue`, **siempre** lanzá un agente Opus para analizar los requerimientos antes de responder al usuario. Seguí estos pasos:

1. **Preguntale al usuario si quiere incluir imágenes en el análisis.**
   Decile: "¿Querés que analice las imágenes adjuntas? Omitirlas ahorra tokens si no son necesarias."
   Según la respuesta, usá `include_images: true` o `include_images: false` en el siguiente paso.

2. **Llamá al tool** con el parámetro `include_images` adecuado.

3. **Intentá leer el archivo de contexto del proyecto**: `.claude/project-context.md`.
   - Si **el archivo existe**: leé la primera línea para ver la fecha de generación. Si tiene más de 30 días o el usuario mencionó que el proyecto cambió mucho, borralo y tratalo como si no existiera.
   - Si **existe y es reciente**: tenés el contexto listo, no hace falta explorar el código.
   - Si **no existe**: Opus va a explorar el proyecto y vas a escribir el archivo después.

4. **Lanzá un agente Opus** (`Agent` tool con `model: "opus"`) con el contenido del issue y según el caso:

   - Si **tenés contexto cacheado**: incluilo en el prompt bajo el título "Contexto del proyecto (cacheado)". Indicale que no necesita explorar el código.
   - Si **no tenés contexto**: pedile que explore el proyecto usando `Read`, `Bash` con `find`/`ls`, etc. Que entienda: estructura de carpetas, tecnologías, convenciones de nombres, patrones de código, organización de funciones. Que incluya al final de su respuesta una sección `## Contexto del proyecto` con un resumen **conciso de máximo 200 palabras**, en formato estructurado (tech stack, estructura de carpetas, convenciones clave, patrones importantes). Solo lo esencial para entender cómo está hecho el proyecto.

   En ambos casos, el análisis debe estar en español, con un tono **amigable y conversacional**, como si le explicara a un colega. Sin jerga técnica innecesaria. Sé conciso — priorizá calidad sobre completitud. Con estas secciones **en este orden**:

   **¿Qué hay que hacer?**
   2-3 oraciones. Explicación clara y simple de qué se necesita construir o resolver.

   **Puntos clave**
   Máximo 4 bullets de 1 línea. Los aspectos más importantes del requerimiento.

   **¿Qué hay que tener en cuenta?**
   Máximo 3 bullets. Solo restricciones, casos borde o detalles genuinamente no obvios. **Omitir esta sección si no hay nada que un dev experimentado no inferiría solo.**

   **¿Cuándo está listo?**
   Máximo 4 bullets. Los criterios de aceptación más importantes.

   **Antes de arrancar**
   Máximo 5 items con ✓. Acciones concretas: decisiones a tomar, cosas a confirmar con el PO, dependencias a verificar. Sin acciones genéricas.

   **Cómo lo haría**
   Propuesta concreta de implementación **basada en el código real del proyecto**:
   - Enfoque recomendado, alineado con los patrones existentes
   - Pasos principales (a alto nivel)
   - Qué evitar o qué podría salir mal

   **Dónde falla esto a escala** *(incluir SOLO si el ticket involucra al menos uno de: endpoints paginados, scroll infinito, N+1 requests, alta concurrencia, o volumen de datos significativo. Omitir en tickets de UI puro, CRUD simple, o cambios de texto/i18n.)*
   Las 3 formas concretas en que el plan se rompe. Indicar qué parte del requerimiento genera cada riesgo.

   **Preguntas abiertas** *(siempre al final — omitir si no hay ambigüedades reales)*
   Numeradas: 1. 2. 3. — máximo 4. Cada una cita qué parte del card la genera. Solo las que realmente impactan el diseño o la implementación. Sin preguntas genéricas u obvias.

5. **Si Opus exploró el proyecto** (porque no había cache), escribí el archivo `.claude/project-context.md` con este formato:
   ```
   <!-- Generado: YYYY-MM-DD -->
   [contenido de la sección ## Contexto del proyecto que devolvió Opus]
   ```
   Este archivo está en `.gitignore` — es local de cada dev.

6. **Presentá el análisis de Opus** al usuario (sin la sección de contexto interna).

7. **Si hay preguntas abiertas**, presentalas de forma interactiva con `AskUserQuestion`:
   - Preguntas con opciones claras (sí/no, A/B, opciones discretas) → convertirlas a opciones seleccionables. Hasta 4 preguntas a la vez.
   - Preguntas genuinamente abiertas (requieren texto libre) → mostrarlas numeradas en texto y pedir al usuario que responda con número + respuesta.
   - Priorizar las preguntas que bloquean el diseño.

8. **¿Continuar con /sdd-new?** Una vez resueltas las preguntas, ofrecé:
   "¿Querés arrancar la implementación con `/sdd-new`? El contexto del análisis ya está en la conversación — el skill lo va a leer directamente."

   Si dice que sí, decile:
   > Escribí `/sdd-new` para arrancar. No hace falta que pegues nada — el skill toma el contexto de la conversación automáticamente.

   **No intentes invocar el skill automáticamente** (tiene `disable-model-invocation`). El usuario lo inicia manualmente y el skill lee el análisis de Opus directamente desde la conversación.
