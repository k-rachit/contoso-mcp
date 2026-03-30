import express from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const dataPath = join(__dirname, "..", "data", "contoso.json");
const db = JSON.parse(readFileSync(dataPath, "utf8"));

const money = (value) =>
  typeof value === "number" ? `$${value.toLocaleString()}` : "N/A";

app.get("/.well-known/agent.json", (req, res, next) => {
  try {
    const card = JSON.parse(readFileSync(join(__dirname, "agent-card.json"), "utf8"));
    res.json(card);
  } catch (err) {
    next(err);
  }
});

app.post("/tasks/send", (req, res, next) => {
  try {
    const { id, message } = req.body || {};
    const userText = message?.parts?.[0]?.text || "";
    const lower = userText.toLowerCase();
    let responseText = "";

    if (lower.includes("brief") || lower.includes("account")) {
      const account = db.accounts.find(a =>
        lower.includes(a.name.toLowerCase().split(" ")[0])
      );

      if (account) {
        responseText =
          `${account.name} (${account.region || "N/A"} - ${account.industry || "N/A"})\n` +
          `Health: ${account.health ?? "N/A"}/100 | Tier: ${account.tier || "N/A"} | Value: ${money(account.annualValue)}\n` +
          `Owner: ${account.owner || "N/A"} | Sponsor: ${account.executiveSponsor || "N/A"}\n` +
          `Products: ${(account.microsoftProducts || []).join(", ") || "None"}\n` +
          `Risks: ${(account.risks || []).map(r => r).join("; ") || "None"}`;
      } else {
        responseText = `Account not found. Available: ${db.accounts.map(a => a.name).join(", ")}`;
      }
    } else if (lower.includes("pipeline") || lower.includes("opportunit")) {
      const opps = db.accounts.flatMap(a =>
        (a.opportunities || []).filter(
          o => o.stage !== "Closed Won" && o.stage !== "Closed Lost"
        )
      );

      responseText = opps.length
        ? opps.map(
            o => `${o.name}: ${o.stage || "N/A"} - ${money(o.amount)} (close: ${o.close_date || "N/A"})`
          ).join("\n")
        : "No open opportunities found.";
    } else if (lower.includes("compare")) {
      const found = db.accounts.filter(a =>
        lower.includes(a.name.toLowerCase().split(" ")[0])
      );

      if (found.length >= 2) {
        responseText = found
          .slice(0, 2)
          .map(
            a => `${a.name}: Health ${a.health ?? "N/A"} | ${money(a.annualValue)} | ${a.tier || "N/A"}`
          )
          .join("\nvs\n");
      } else {
        responseText = `Name two accounts to compare. Available: ${db.accounts.map(a => a.name).join(", ")}`;
      }
    } else if (lower.includes("meeting") || lower.includes("prep")) {
      const account = db.accounts.find(a =>
        lower.includes(a.name.toLowerCase().split(" ")[0])
      );

      if (account) {
        const risks = (account.risks || []).map(r => r).join("; ");
        const opps = (account.opportunities || [])
          .map(o => `${o.name}: ${o.stage || "N/A"} - ${money(o.amount)}`)
          .join("\n");

        responseText =
          `Meeting Brief: ${account.name}\n` +
          `Owner: ${account.owner || "N/A"} | Health: ${account.health ?? "N/A"}/100\n` +
          `Pipeline:\n${opps || "No open opportunities"}\n` +
          `Risks: ${risks || "None"}\n` +
          `Talking Points:\n1. Review account health\n2. Discuss ${(account.microsoftProducts || [])[0] || "product"} adoption\n3. Address risks\n4. Plan next engagement`;
      } else {
        responseText = `Specify an account. Available: ${db.accounts.map(a => a.name).join(", ")}`;
      }
    } else {
      responseText = "I can help with: account briefings, pipeline reviews, meeting prep, and comparisons.";
    }

    res.json({
      id: id || "test-id",
      status: { state: "completed" },
      artifacts: [{ parts: [{ type: "text", text: responseText }] }]
    });
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({
    error: "internal_error",
    message: err.message
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`A2A Contoso Agent running on http://localhost:${PORT}`);
  console.log(`Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
});
