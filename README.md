# pm-mcp

Un MCP para Claude Code que conecta Trello y Jira, analiza tickets dentro del contexto de tu código y construye memoria local del proyecto para evitar exploraciones repetitivas.

La idea es simple:

En vez de copiar tickets manualmente, pegar contexto en el chat y hacer que Claude explore todo el repositorio desde cero cada vez, le das acceso directo a la tarjeta o issue y te ayuda a entender cómo implementar ese trabajo dentro del código existente.

---

# ¿Qué hace?

pm-mcp expone dos herramientas:

* `get_trello_card`
* `get_jira_issue`

Claude puede leer directamente:

* título
* descripción
* comentarios
* checklists
* labels
* asignados
* adjuntos
* subtasks
* imágenes (opcional)

Y usar esa información para analizar el trabajo antes de empezar a implementar.

---

# ¿Por qué existe?

Porque los tickets suelen decir qué hay que hacer.

Pero normalmente no dicen:

* dónde tocar código
* qué archivos modificar
* qué patrón reutilizar
* qué implementación similar ya existe
* qué riesgos existen
* qué partes del sistema están involucradas

pm-mcp ayuda a cerrar esa brecha.

---

# Flujo típico

```text
Ticket
 ↓
pm-mcp
 ↓
Claude analiza el ticket
 ↓
Consulta contexto y patrones existentes
 ↓
Explora el proyecto si hace falta
 ↓
Identifica impacto técnico
 ↓
Genera plan de implementación
```

El objetivo no es resumir tickets.

El objetivo es responder:

> "¿Cómo implementamos esto en ESTE proyecto?"

---

# ¿Qué pasa cuando Claude analiza un ticket?

Cuando le pedís algo como:

```text
Analizame la tarjeta X
```

Claude:

1. Lee el contenido del ticket.
2. Consulta el contexto local del proyecto (`.claude/project-context.md`).
3. Consulta patrones previamente descubiertos (`.claude/patterns.md`).
4. Explora el repositorio solo cuando hace falta.
5. Identifica archivos impactados.
6. Busca implementaciones similares ya existentes.
7. Detecta patrones reutilizables.
8. Señala riesgos, dependencias y dudas.
9. Genera un plan de implementación concreto.

La idea es minimizar exploración repetitiva y maximizar reutilización de código existente.

---

# Requisitos

* Node.js 18+
* Claude Code
* Credenciales de Trello y/o Jira

Verificá Node:

```bash
node --version
```

Instalá Claude Code:

```bash
npm install -g @anthropic-ai/claude-code
```

---

# Instalación

## 1. Clonar el repositorio

```bash
git clone https://github.com/ocampott/pm-mcp.git
cd pm-mcp
npm install
npm run build
```

## 2. Registrar el MCP en Claude Code

Reemplazá:

```text
/ruta/al/repo
```

por la ruta donde clonaste el proyecto.

Ejemplo:

```text
/Users/tomas/pm-mcp
```

### Trello

```bash
claude mcp add trello \
  -e TRELLO_API_KEY=tu_api_key \
  -e TRELLO_TOKEN=tu_token \
  -- node /ruta/al/repo/dist/index.js
```

### Jira

```bash
claude mcp add jira \
  -e JIRA_HOST=tu-empresa.atlassian.net \
  -e JIRA_EMAIL=tu@email.com \
  -e JIRA_API_TOKEN=tu_token \
  -- node /ruta/al/repo/dist/index.js
```

Podés registrar ambos al mismo tiempo usando nombres distintos.

Verificá que estén activos:

```bash
claude mcp list
```

---

# Cómo obtener las credenciales

## Trello

1. Entrá a https://trello.com/app-key
2. Copiá tu API Key
3. Hacé click en el link "Token"
4. Autorizá la aplicación
5. Copiá el token generado

Variables necesarias:

```text
TRELLO_API_KEY
TRELLO_TOKEN
```

---

## Jira

1. Entrá a https://id.atlassian.com/manage-profile/security/api-tokens
2. Click en "Create API token"
3. Elegí un nombre
4. Copiá el token generado

Variables necesarias:

```text
JIRA_HOST
JIRA_EMAIL
JIRA_API_TOKEN
```

Ejemplo:

```text
JIRA_HOST=miempresa.atlassian.net
```

Sin `https://`.

---

## Como usarlo: Trello

Podés pedirle a Claude:

```text
Leé la tarjeta de Trello con ID abc123
```

o

```text
Analizá esta tarjeta:
https://trello.com/c/abc123/nombre-de-la-tarjeta
```

### ¿Dónde encuentro el ID?

En la URL:

```text
https://trello.com/c/abc123/nombre-de-la-tarjeta
                      ^^^^^^
```

---

## Como usarlo: Jira

Podés pedirle:

```text
Leé el issue PROJ-123
```

o

```text
Analizá este issue:
https://miempresa.atlassian.net/browse/PROJ-123
```

### ¿Dónde encuentro la clave?

La clave del issue:

```text
PROJ-123
```

que aparece en Jira junto al título.

---

# Memoria local del proyecto

pm-mcp puede mantener contexto local dentro de:

```text
.claude/
├── project-context.md
└── patterns.md
```

---

## project-context.md

Contiene una vista resumida del proyecto:

* stack tecnológico
* estructura de carpetas
* convenciones
* arquitectura general
* patrones importantes

Ejemplo:

```text
Tech stack:
- Next.js
- React
- Node.js

Convenciones:
- Servicios en services/
- Componentes en components/
```

Su objetivo es evitar que Claude tenga que redescubrir el proyecto desde cero cada vez.

---

## patterns.md

Contiene conocimiento reutilizable descubierto durante análisis anteriores.

Por ejemplo:

* patrones CRUD
* flujos OAuth
* uploads de archivos
* integraciones externas
* componentes reutilizables
* servicios de referencia

Ejemplo:

```md
# Upload Pattern

Referencia:
components/shared/upload

Uso:
Cualquier funcionalidad de carga de archivos.
```

Con el tiempo, Claude empieza a construir una especie de mapa mental del proyecto.

En lugar de volver a explorar el mismo código una y otra vez, puede reutilizar conocimiento ya descubierto y enfocarse únicamente en el ticket actual.

---

# Preguntas frecuentes

## ¿Mis credenciales son seguras?

Sí.

Las credenciales se pasan como variables de entorno al registrar el MCP y no quedan hardcodeadas en el repositorio.

---

## ¿Necesito copiar el contenido del ticket?

No.

Claude puede leerlo directamente usando las herramientas MCP.

---

## ¿Claude analiza imágenes?

Sí.

Si la tarjeta tiene wireframes, mockups, screenshots o diagramas adjuntos, Claude puede analizarlos junto con el resto del ticket.

---

## ¿Cómo elimino el MCP?

```bash
claude mcp remove trello
```

```bash
claude mcp remove jira
```

---

# Filosofía

pm-mcp no intenta reemplazar Jira ni Trello.

No intenta gestionar proyectos.

No intenta decidir cómo desarrollar una feature.

Su objetivo es darle a Claude el contexto correcto para entender tickets reales y trabajar mejor sobre bases de código reales.

Con cada análisis, Claude puede construir conocimiento local del proyecto mediante `project-context.md` y `patterns.md`, reduciendo exploración repetitiva y reutilizando patrones ya descubiertos.
