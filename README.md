# Contoso MCP Server

A local Model Context Protocol (MCP) server that turns Perplexity into an enterprise account management copilot. Connects to mock CRM data and exposes 11 business tools.

## Architecture


- **Client**: Perplexity Mac app (or any MCP-compatible client)
- **Server**: Node.js using @modelcontextprotocol/sdk
- **Data**: Local JSON file (swap for Salesforce/Dynamics 365 API in production)

## Tools (11)

| Tool | Type | Description |
|------|------|-------------|
| search_accounts | Read | Search by name, industry, region, owner, or tier |
| get_account_briefing | Read | Account snapshot with owner, health, value, products |
| list_open_opportunities | Read | Pipeline with stage, amount, close date, products |
| get_customer_risks | Read | Key account risks |
| get_exec_summary | Read | Executive summary combining all account data |
| get_recent_notes | Read | Meeting notes and activity log |
| get_next_actions | Read | AI-suggested next steps based on health and pipeline |
| compare_accounts | Read | Side-by-side comparison of two accounts |
| create_note | Write | Add a note to an account |
| update_opportunity_stage | Write | Move an opportunity to a new stage |
| prepare_meeting_brief | Read | Full meeting prep combining briefing, notes, risks, pipeline, talking points |

## Data

10 accounts across 3 regions:
- **APAC** (5): Northwind Retail Group, Contoso Health Services, Fabrikam Manufacturing, Woodgrove Bank, Adventure Works Logistics
- **AMER** (2): Litware Inc, Fourth Coffee
- **EMEA** (3): Tailspin Toys, Alpine Ski House, Proseware Ltd

## Setup

```bash
cd contoso-mcp
npm install
```

## Run

```bash
node server.js
```

## Perplexity Mac Connector

Settings > Connectors > Add Local Connector:

| Field | Value |
|-------|-------|
| Name | contoso-mcp |
| Command | node |
| Args | /Users/rachitkumar/Documents/AOM-Secure-Docs/contoso-mcp/server.js |

## Demo Prompts

1. "Brief me on Northwind Retail Group before my 2pm call"
2. "Compare Fabrikam Manufacturing vs Woodgrove Bank"
3. "Show all APAC accounts with health below 70"
4. "What are the open opportunities for Contoso Health Services?"
5. "Prepare a meeting brief for Fourth Coffee"
6. "Add a note to Litware Inc: Discussed cloud migration timeline"
7. "Move the Fabrikam Manufacturing opportunity to Negotiation stage"

\n## A2A Agent Layer (Agent-to-Agent)\n\nThis project also exposes CRM data as a Google A2A-compatible agent for multi-agent orchestration.\n\n| Protocol | Purpose | Client |\n|----------|---------|--------|\n| **MCP** | Human-to-agent | Perplexity Mac app |\n| **A2A** | Agent-to-agent | Any A2A client, LangGraph, ADK |\n\nSee [a2a-demo/README.md](a2a-demo/README.md) for details.\n\n## Tech Stack

- Node.js + ES Modules
- @modelcontextprotocol/sdk
- Perplexity Mac app (MCP client)

## Production Path

Replace `contoso.json` with real CRM API calls (Dynamics 365, Salesforce, HubSpot). The tool interface stays the same.

## License

MIT
