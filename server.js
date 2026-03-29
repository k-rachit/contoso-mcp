import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "contoso.json"), "utf8"));
const server = new Server({ name: "contoso-account-copilot", version: "4.0.0" }, { capabilities: { tools: {} } });

function normalize(v) { return String(v || "").trim().toLowerCase(); }
function findAccountByName(name) { var q = normalize(name); return db.accounts.find(function(a) { return normalize(a.name).includes(q); }); }
function searchAccounts(query) { var q = normalize(query); return db.accounts.filter(function(a) { return [a.name, a.industry, a.region, a.owner, a.tier].some(function(v) { return normalize(v).includes(q); }); }); }
function money(n) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n); }

server.setRequestHandler(ListToolsRequestSchema, async function() { return {
  tools: [
    { name: "search_accounts", description: "Search Contoso accounts by name, industry, region, owner, or tier.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
    { name: "get_account_briefing", description: "Get a concise business briefing for a Contoso account including owner, health, value, renewal, executive sponsor, Microsoft products, and summary.", inputSchema: { type: "object", properties: { accountName: { type: "string" } }, required: ["accountName"] } },
    { name: "list_open_opportunities", description: "List open sales opportunities for a Contoso account with stage, amount, close date, and Microsoft products.", inputSchema: { type: "object", properties: { accountName: { type: "string" } }, required: ["accountName"] } },
    { name: "get_customer_risks", description: "Show key account risks for a Contoso account.", inputSchema: { type: "object", properties: { accountName: { type: "string" } }, required: ["accountName"] } },
    { name: "get_exec_summary", description: "Return an executive summary of account status, value, renewal, pipeline, risks, and Microsoft products.", inputSchema: { type: "object", properties: { accountName: { type: "string" } }, required: ["accountName"] } },
    { name: "get_recent_notes", description: "Get recent meeting notes and activity for a Contoso account.", inputSchema: { type: "object", properties: { accountName: { type: "string" } }, required: ["accountName"] } },
    { name: "get_next_actions", description: "Suggest next best actions for a Contoso account based on health, risks, and pipeline stage.", inputSchema: { type: "object", properties: { accountName: { type: "string" } }, required: ["accountName"] } },
    { name: "compare_accounts", description: "Compare two Contoso accounts side by side on health, value, pipeline, risks, and tier.", inputSchema: { type: "object", properties: { accountName1: { type: "string" }, accountName2: { type: "string" } }, required: ["accountName1", "accountName2"] } },
    { name: "create_note", description: "Add a new note to a Contoso account. Returns confirmation.", inputSchema: { type: "object", properties: { accountName: { type: "string" }, text: { type: "string" } }, required: ["accountName", "text"] } },
    { name: "update_opportunity_stage", description: "Update the stage of an opportunity for a Contoso account.", inputSchema: { type: "object", properties: { accountName: { type: "string" }, opportunityTitle: { type: "string" }, newStage: { type: "string" } }, required: ["accountName", "opportunityTitle", "newStage"] } },
    { name: "prepare_meeting_brief", description: "Generate a comprehensive meeting preparation brief for a Contoso account combining briefing, risks, notes, pipeline, and suggested talking points.", inputSchema: { type: "object", properties: { accountName: { type: "string" } }, required: ["accountName"] } }
  ]
}; });

server.setRequestHandler(CallToolRequestSchema, async function(request) {
  var name = request.params.name;
  var args = request.params.arguments;

  if (name === "search_accounts") {
    var results = searchAccounts(args?.query || "");
    if (results.length === 0) return { content: [{ type: "text", text: "No Contoso accounts found for " + (args?.query || "") + "." }] };
    var text = results.map(function(a) { return "- " + a.name + " | " + a.industry + " | " + a.region + " | Tier: " + a.tier + " | Owner: " + a.owner + " | Health: " + a.health; }).join("\n");
    return { content: [{ type: "text", text: "Matching accounts:\n" + text }] };
  }

  if (name === "compare_accounts") {
    var a1 = findAccountByName(args?.accountName1 || "");
    var a2 = findAccountByName(args?.accountName2 || "");
    if (a1 === undefined || a2 === undefined) return { content: [{ type: "text", text: "Could not find one or both accounts." }] };
    var p1 = a1.opportunities.reduce(function(s, o) { return s + o.amount; }, 0);
    var p2 = a2.opportunities.reduce(function(s, o) { return s + o.amount; }, 0);
    var pr1 = a1.opportunities.flatMap(function(o) { return o.products || []; }).filter(function(v, i, a) { return a.indexOf(v) === i; }).join(", ");
    var pr2 = a2.opportunities.flatMap(function(o) { return o.products || []; }).filter(function(v, i, a) { return a.indexOf(v) === i; }).join(", ");
    var text = ["Account Comparison", "", "| Metric | " + a1.name + " | " + a2.name + " |", "|---|---|---|", "| Industry | " + a1.industry + " | " + a2.industry + " |", "| Region | " + a1.region + " | " + a2.region + " |", "| Tier | " + a1.tier + " | " + a2.tier + " |", "| Health | " + a1.health + " | " + a2.health + " |", "| Annual Value | " + money(a1.annualValue) + " | " + money(a2.annualValue) + " |", "| Open Pipeline | " + money(p1) + " | " + money(p2) + " |", "| Risks | " + a1.risks.length + " | " + a2.risks.length + " |", "| Renewal | " + a1.renewalDate + " | " + a2.renewalDate + " |", "| Owner | " + a1.owner + " | " + a2.owner + " |", "| MS Products | " + pr1 + " | " + pr2 + " |"].join("\n");
    return { content: [{ type: "text", text: text }] };
  }

  var account = findAccountByName(args?.accountName || "");
  if (account === undefined) return { content: [{ type: "text", text: "No Contoso account found matching " + (args?.accountName || "") + "." }] };

  if (name === "get_account_briefing") {
    var products = account.opportunities.flatMap(function(o) { return o.products || []; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
    var text = ["Account Briefing: " + account.name, "Owner: " + account.owner, "Executive Sponsor: " + account.executiveSponsor, "Industry: " + account.industry, "Region: " + account.region, "Tier: " + account.tier, "Health: " + account.health, "Annual Value: " + money(account.annualValue), "Renewal Date: " + account.renewalDate, "Last Meeting: " + account.lastMeeting, "Next Meeting: " + account.nextMeeting, "Microsoft Products: " + products.join(", "), "Summary: " + account.summary].join("\n");
    return { content: [{ type: "text", text: text }] };
  }

  if (name === "list_open_opportunities") {
    var text = "Open opportunities for " + account.name + ":\n" + account.opportunities.map(function(o) { return "- " + o.title + " | " + o.stage + " | " + money(o.amount) + " | Close: " + o.closeDate + " | Products: " + (o.products || []).join(", "); }).join("\n");
    return { content: [{ type: "text", text: text }] };
  }

  if (name === "get_customer_risks") {
    var text = "Key risks for " + account.name + ":\n" + account.risks.map(function(r) { return "- " + r; }).join("\n");
    return { content: [{ type: "text", text: text }] };
  }

  if (name === "get_exec_summary") {
    var totalPipeline = account.opportunities.reduce(function(s, o) { return s + o.amount; }, 0);
    var products = account.opportunities.flatMap(function(o) { return o.products || []; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
    var text = ["Executive Summary: " + account.name, "Health: " + account.health, "Tier: " + account.tier, "Owner: " + account.owner, "Executive Sponsor: " + account.executiveSponsor, "Region: " + account.region, "Annual Value: " + money(account.annualValue), "Renewal Date: " + account.renewalDate, "Open Pipeline: " + money(totalPipeline), "Microsoft Products: " + products.join(", "), "Top Risks: " + account.risks.slice(0, 2).join("; "), "Next Meeting: " + account.nextMeeting, "Summary: " + account.summary].join("\n");
    return { content: [{ type: "text", text: text }] };
  }

  if (name === "get_recent_notes") {
    var text = "Recent notes for " + account.name + ":\n" + account.notes.map(function(n) { return "- [" + n.date + "] " + n.author + ": " + n.text; }).join("\n");
    return { content: [{ type: "text", text: text }] };
  }

  if (name === "get_next_actions") {
    var actions = [];
    if (account.health === "Red") { actions.push("Schedule urgent exec-to-exec call to stabilize relationship"); actions.push("Escalate open support cases internally"); }
    if (account.health === "Amber") { actions.push("Follow up on pending procurement or budget blockers"); actions.push("Prepare competitive displacement strategy if competitor is active"); }
    if (account.health === "Green") { actions.push("Propose expansion or upsell based on current momentum"); }
    account.opportunities.forEach(function(o) {
      if (o.stage === "Proposal") actions.push("Follow up on proposal for " + o.title + " (" + money(o.amount) + ")");
      if (o.stage === "Negotiation") actions.push("Prepare final terms for " + o.title + " (" + money(o.amount) + ")");
      if (o.stage === "Qualification" || o.stage === "Discovery") actions.push("Schedule deep-dive or workshop for " + o.title);
    });
    if (account.nextMeeting) actions.push("Prepare briefing for next meeting on " + account.nextMeeting);
    var text = "Suggested next actions for " + account.name + ":\n" + actions.map(function(a, i) { return (i + 1) + ". " + a; }).join("\n");
    return { content: [{ type: "text", text: text }] };
  }



  if (name === "create_note") {
    var account = findAccountByName(args.accountName || "");
    if (!account) return { content: [{ type: "text", text: "Account not found: " + (args.accountName || "") }] };
    var newNote = { date: new Date().toISOString().split("T")[0], author: "User", text: args.text };
    account.notes.unshift(newNote);
    return { content: [{ type: "text", text: "Note added to " + account.name + " on " + newNote.date + ": " + args.text }] };
  }

  if (name === "update_opportunity_stage") {
    var account = findAccountByName(args.accountName || "");
    if (!account) return { content: [{ type: "text", text: "Account not found: " + (args.accountName || "") }] };
    var opp = account.opportunities.find(function(o) { return normalize(o.title).includes(normalize(args.opportunityTitle || "")); });
    if (!opp) return { content: [{ type: "text", text: "Opportunity not found: " + (args.opportunityTitle || "") }] };
    var oldStage = opp.stage;
    opp.stage = args.newStage;
    return { content: [{ type: "text", text: "Updated " + opp.title + " for " + account.name + ": " + oldStage + " -> " + args.newStage }] };
  }

  if (name === "prepare_meeting_brief") {
    var account = findAccountByName(args.accountName || "");
    if (!account) return { content: [{ type: "text", text: "Account not found: " + (args.accountName || "") }] };
    var pipeline = account.opportunities.reduce(function(s, o) { return s + o.amount; }, 0);
    var products = account.opportunities.flatMap(function(o) { return o.products || []; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
    var sections = [];
    sections.push("MEETING BRIEF: " + account.name);
    sections.push("Date: " + (account.nextMeeting || "TBD") + " | Owner: " + account.owner + " | Exec Sponsor: " + (account.executiveSponsor || "N/A"));
    sections.push("");
    sections.push("ACCOUNT SNAPSHOT");
    sections.push("Health: " + account.health + " | Tier: " + (account.tier || "N/A") + " | Region: " + account.region);
    sections.push("Annual Value: " + money(account.annualValue) + " | Pipeline: " + money(pipeline) + " | Renewal: " + account.renewalDate);
    sections.push("Products: " + (account.microsoftProducts || []).join(", "));
    sections.push("");
    sections.push("RECENT ACTIVITY");
    account.notes.slice(0, 3).forEach(function(n) { sections.push("- [" + n.date + "] " + n.author + ": " + n.text); });
    sections.push("");
    sections.push("OPEN PIPELINE");
    account.opportunities.forEach(function(o) { sections.push("- " + o.title + " | " + o.stage + " | " + money(o.amount) + " | Close: " + o.closeDate); });
    sections.push("");
    sections.push("RISKS");
    if (account.risks.length === 0) { sections.push("- No active risks"); }
    account.risks.forEach(function(r) { sections.push("- " + r); });
    sections.push("");
    sections.push("SUGGESTED TALKING POINTS");
    if (account.health === "Red") { sections.push("- Address relationship stability and escalation resolution"); sections.push("- Reaffirm commitment with concrete action plan"); }
    if (account.health === "Amber") { sections.push("- Review blockers and agree on timeline to resolve"); sections.push("- Highlight recent wins to build momentum"); }
    if (account.health === "Green") { sections.push("- Explore expansion opportunities"); sections.push("- Discuss innovation roadmap alignment"); }
    account.opportunities.forEach(function(o) {
      if (o.stage === "Proposal") sections.push("- Seek approval or feedback on " + o.title + " proposal");
      if (o.stage === "Negotiation") sections.push("- Finalize commercial terms for " + o.title);
      if (o.stage === "Discovery" || o.stage === "Qualification") sections.push("- Validate requirements and timeline for " + o.title);
    });
    sections.push("- Confirm next steps and follow-up date");
    var text = sections.join("\n");
    return { content: [{ type: "text", text: text }] };
  }



  if (name === "create_note") {
    var account = findAccountByName(args.accountName || "");
    if (!account) return { content: [{ type: "text", text: "Account not found: " + (args.accountName || "") }] };
    var newNote = { date: new Date().toISOString().split("T")[0], author: "User", text: args.text };
    account.notes.unshift(newNote);
    return { content: [{ type: "text", text: "Note added to " + account.name + " on " + newNote.date + ": " + args.text }] };
  }

  if (name === "update_opportunity_stage") {
    var account = findAccountByName(args.accountName || "");
    if (!account) return { content: [{ type: "text", text: "Account not found: " + (args.accountName || "") }] };
    var opp = account.opportunities.find(function(o) { return normalize(o.title).includes(normalize(args.opportunityTitle || "")); });
    if (!opp) return { content: [{ type: "text", text: "Opportunity not found: " + (args.opportunityTitle || "") }] };
    var oldStage = opp.stage;
    opp.stage = args.newStage;
    return { content: [{ type: "text", text: "Updated " + opp.title + " for " + account.name + ": " + oldStage + " -> " + args.newStage }] };
  }

  if (name === "prepare_meeting_brief") {
    var account = findAccountByName(args.accountName || "");
    if (!account) return { content: [{ type: "text", text: "Account not found: " + (args.accountName || "") }] };
    var pipeline = account.opportunities.reduce(function(s, o) { return s + o.amount; }, 0);
    var products = account.opportunities.flatMap(function(o) { return o.products || []; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
    var sections = [];
    sections.push("MEETING BRIEF: " + account.name);
    sections.push("Date: " + (account.nextMeeting || "TBD") + " | Owner: " + account.owner + " | Exec Sponsor: " + (account.executiveSponsor || "N/A"));
    sections.push("");
    sections.push("ACCOUNT SNAPSHOT");
    sections.push("Health: " + account.health + " | Tier: " + (account.tier || "N/A") + " | Region: " + account.region);
    sections.push("Annual Value: " + money(account.annualValue) + " | Pipeline: " + money(pipeline) + " | Renewal: " + account.renewalDate);
    sections.push("Products: " + (account.microsoftProducts || []).join(", "));
    sections.push("");
    sections.push("RECENT ACTIVITY");
    account.notes.slice(0, 3).forEach(function(n) { sections.push("- [" + n.date + "] " + n.author + ": " + n.text); });
    sections.push("");
    sections.push("OPEN PIPELINE");
    account.opportunities.forEach(function(o) { sections.push("- " + o.title + " | " + o.stage + " | " + money(o.amount) + " | Close: " + o.closeDate); });
    sections.push("");
    sections.push("RISKS");
    if (account.risks.length === 0) { sections.push("- No active risks"); }
    account.risks.forEach(function(r) { sections.push("- " + r); });
    sections.push("");
    sections.push("SUGGESTED TALKING POINTS");
    if (account.health === "Red") { sections.push("- Address relationship stability and escalation resolution"); sections.push("- Reaffirm commitment with concrete action plan"); }
    if (account.health === "Amber") { sections.push("- Review blockers and agree on timeline to resolve"); sections.push("- Highlight recent wins to build momentum"); }
    if (account.health === "Green") { sections.push("- Explore expansion opportunities"); sections.push("- Discuss innovation roadmap alignment"); }
    account.opportunities.forEach(function(o) {
      if (o.stage === "Proposal") sections.push("- Seek approval or feedback on " + o.title + " proposal");
      if (o.stage === "Negotiation") sections.push("- Finalize commercial terms for " + o.title);
      if (o.stage === "Discovery" || o.stage === "Qualification") sections.push("- Validate requirements and timeline for " + o.title);
    });
    sections.push("- Confirm next steps and follow-up date");
    var text = sections.join("\n");
    return { content: [{ type: "text", text: text }] };
  }



  if (name === "create_note") {
    var account = findAccountByName(args.accountName || "");
    if (!account) return { content: [{ type: "text", text: "Account not found: " + (args.accountName || "") }] };
    var newNote = { date: new Date().toISOString().split("T")[0], author: "User", text: args.text };
    account.notes.unshift(newNote);
    return { content: [{ type: "text", text: "Note added to " + account.name + " on " + newNote.date + ": " + args.text }] };
  }

  if (name === "update_opportunity_stage") {
    var account = findAccountByName(args.accountName || "");
    if (!account) return { content: [{ type: "text", text: "Account not found: " + (args.accountName || "") }] };
    var opp = account.opportunities.find(function(o) { return normalize(o.title).includes(normalize(args.opportunityTitle || "")); });
    if (!opp) return { content: [{ type: "text", text: "Opportunity not found: " + (args.opportunityTitle || "") }] };
    var oldStage = opp.stage;
    opp.stage = args.newStage;
    return { content: [{ type: "text", text: "Updated " + opp.title + " for " + account.name + ": " + oldStage + " -> " + args.newStage }] };
  }

  if (name === "prepare_meeting_brief") {
    var account = findAccountByName(args.accountName || "");
    if (!account) return { content: [{ type: "text", text: "Account not found: " + (args.accountName || "") }] };
    var pipeline = account.opportunities.reduce(function(s, o) { return s + o.amount; }, 0);
    var products = account.opportunities.flatMap(function(o) { return o.products || []; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
    var sections = [];
    sections.push("MEETING BRIEF: " + account.name);
    sections.push("Date: " + (account.nextMeeting || "TBD") + " | Owner: " + account.owner + " | Exec Sponsor: " + (account.executiveSponsor || "N/A"));
    sections.push("");
    sections.push("ACCOUNT SNAPSHOT");
    sections.push("Health: " + account.health + " | Tier: " + (account.tier || "N/A") + " | Region: " + account.region);
    sections.push("Annual Value: " + money(account.annualValue) + " | Pipeline: " + money(pipeline) + " | Renewal: " + account.renewalDate);
    sections.push("Products: " + (account.microsoftProducts || []).join(", "));
    sections.push("");
    sections.push("RECENT ACTIVITY");
    account.notes.slice(0, 3).forEach(function(n) { sections.push("- [" + n.date + "] " + n.author + ": " + n.text); });
    sections.push("");
    sections.push("OPEN PIPELINE");
    account.opportunities.forEach(function(o) { sections.push("- " + o.title + " | " + o.stage + " | " + money(o.amount) + " | Close: " + o.closeDate); });
    sections.push("");
    sections.push("RISKS");
    if (account.risks.length === 0) { sections.push("- No active risks"); }
    account.risks.forEach(function(r) { sections.push("- " + r); });
    sections.push("");
    sections.push("SUGGESTED TALKING POINTS");
    if (account.health === "Red") { sections.push("- Address relationship stability and escalation resolution"); sections.push("- Reaffirm commitment with concrete action plan"); }
    if (account.health === "Amber") { sections.push("- Review blockers and agree on timeline to resolve"); sections.push("- Highlight recent wins to build momentum"); }
    if (account.health === "Green") { sections.push("- Explore expansion opportunities"); sections.push("- Discuss innovation roadmap alignment"); }
    account.opportunities.forEach(function(o) {
      if (o.stage === "Proposal") sections.push("- Seek approval or feedback on " + o.title + " proposal");
      if (o.stage === "Negotiation") sections.push("- Finalize commercial terms for " + o.title);
      if (o.stage === "Discovery" || o.stage === "Qualification") sections.push("- Validate requirements and timeline for " + o.title);
    });
    sections.push("- Confirm next steps and follow-up date");
    var text = sections.join("\n");
    return { content: [{ type: "text", text: text }] };
  }

  return { content: [{ type: "text", text: "Unknown tool: " + name }] };
});

var transport = new StdioServerTransport();
await server.connect(transport);