---
description: Check the connection status of Trello and Jira integrations. Shows which accounts are configured and connected.
---

Call the `get_status` MCP tool (plugin: `ticket-analyzer`, server: `pm`).

Present the result to the user exactly as returned by the tool — no reformatting needed.

If no integrations are configured, add:
> Podés configurar tus credenciales con `/ticket-analyzer:setup`.
