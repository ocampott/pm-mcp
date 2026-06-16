# pm-mcp — Instrucciones para Claude Code

## Qué es esto

`pm-mcp` es un servidor MCP que expone los tools `get_trello_card` y `get_jira_issue` para traer el contenido de tarjetas e issues directamente en Claude Code.

Para que Claude analice los resultados automáticamente con Opus, copiá la sección de abajo a tu `~/.claude/CLAUDE.md` (configuración global) o al `CLAUDE.md` de tu proyecto.

---

## Análisis de tarjetas y issues con Opus

Cuando uses `get_trello_card` o `get_jira_issue`, **siempre** lanzá un agente Opus para analizar los requerimientos antes de responder al usuario. Seguí estos pasos:

1. **Llamá al tool** para obtener los datos del issue/tarjeta (descripción, comentarios, subtasks, imágenes).
2. **Lanzá un agente Opus** (`Agent` tool con `model: "opus"`) para que analice el contenido. En el prompt del agente incluí:
   - Todo el texto del issue (descripción, comentarios, subtasks)
   - Si hay imágenes, describí brevemente lo que muestran (ya que vos podés verlas)
   - El path del directorio del proyecto actual
   - Pedile al agente que haga dos cosas en orden:

     **Paso 1 — Entender el proyecto:**
     Antes de analizar el requerimiento, que explore el proyecto usando las herramientas disponibles (`Read`, `Bash` con `find`/`ls`, etc.). Que entienda: estructura de carpetas, tecnologías usadas, convenciones de nombres, patrones de código, cómo se manejan los estilos, cómo están organizadas las funciones, etc. Esto es para que la propuesta de implementación sea concreta y alineada con lo que ya existe.

     **Paso 2 — Producir el análisis** en español, con un tono amigable y conversacional, como si le explicara a un colega. Sin jerga técnica innecesaria. Con estas secciones:

     **¿Qué hay que hacer?**
     Explicación clara y simple de qué se necesita construir o resolver.

     **Puntos clave**
     Los aspectos más importantes del requerimiento, en lenguaje llano.

     **¿Qué hay que tener en cuenta?**
     Restricciones, casos borde o detalles que puedan complicar la implementación.

     **¿Cuándo está listo?**
     Criterios de aceptación inferidos: qué debe cumplir la solución para darse por terminada.

     **Preguntas abiertas**
     Ambigüedades o decisiones no definidas que sería bueno aclarar antes de arrancar.

     **Cómo lo haría**
     Propuesta concreta de implementación **basada en el código real del proyecto**. Incluir:
     - El enfoque recomendado, alineado con los patrones que ya existen en el código
     - Los pasos principales para llevarlo a cabo (a alto nivel)
     - Tecnologías o patrones del proyecto que aplican bien a este caso
     - Qué evitar o qué podría salir mal, considerando el estado actual del código

3. **Presentá el análisis de Opus** al usuario.
4. **Esperá confirmación** de que el análisis es correcto antes de proponer o escribir cualquier código.
