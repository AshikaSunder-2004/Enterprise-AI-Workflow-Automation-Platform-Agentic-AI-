# Example Workflow Template: New Lead → Enrich → Notify → CRM → Approval → Email

This template demonstrates a full end-to-end lead handling workflow using AI agents and multiple tool integrations.

## Workflow JSON Definition

```json
{
  "nodes": [
    {
      "id": "start-1",
      "type": "start",
      "label": "Start"
    },
    {
      "id": "agent-enrich",
      "type": "agent",
      "label": "Enrich Lead",
      "goal": "Research the lead from the trigger payload. Find their company info, LinkedIn profile, recent news about their company. Use web_search to gather information. Return a structured summary with: name, company, role, company_size, recent_news.",
      "allowedTools": ["web_search", "http_request"],
      "maxIterations": 8,
      "budgetTokens": 50000,
      "outputKey": "lead_enrichment",
      "retries": 1
    },
    {
      "id": "tool-slack",
      "type": "tool",
      "label": "Notify Sales Team",
      "toolName": "slack_send_message",
      "inputMapping": {
        "channel": "#sales-leads",
        "text": "🎯 New enriched lead: {{context.lead_enrichment.name}} from {{context.lead_enrichment.company}}. Company size: {{context.lead_enrichment.company_size}}."
      },
      "outputKey": "slack_result"
    },
    {
      "id": "tool-jira",
      "type": "tool",
      "label": "Create CRM Task",
      "toolName": "jira_create_issue",
      "inputMapping": {
        "projectKey": "SALES",
        "summary": "Follow up: {{context.lead_enrichment.name}} - {{context.lead_enrichment.company}}",
        "description": "Lead enrichment data: {{context.lead_enrichment}}",
        "issueType": "Task",
        "priority": "High"
      },
      "outputKey": "jira_result"
    },
    {
      "id": "human-approve",
      "type": "human",
      "label": "Manager Approval",
      "prompt": "New enriched lead ready for outreach. Lead: {{context.lead_enrichment.name}} at {{context.lead_enrichment.company}}. Please approve sending the outreach email.",
      "outputKey": "manager_approval",
      "timeoutAction": "fail"
    },
    {
      "id": "tool-email",
      "type": "tool",
      "label": "Send Outreach Email",
      "toolName": "gmail_send",
      "inputMapping": {
        "to": "{{context.triggerPayload.email}}",
        "subject": "Quick question about {{context.lead_enrichment.company}}",
        "body": "Hi {{context.lead_enrichment.name}}, I noticed that {{context.lead_enrichment.recent_news}}. I thought our AI workflow platform might be relevant to your work at {{context.lead_enrichment.company}}. Would you have 15 minutes for a quick call?",
        "isHtml": false
      },
      "outputKey": "email_result"
    },
    {
      "id": "end-1",
      "type": "end",
      "label": "End"
    }
  ],
  "edges": [
    { "id": "e1", "source": "start-1", "target": "agent-enrich" },
    { "id": "e2", "source": "agent-enrich", "target": "tool-slack" },
    { "id": "e3", "source": "tool-slack", "target": "tool-jira" },
    { "id": "e4", "source": "tool-jira", "target": "human-approve" },
    { "id": "e5", "source": "human-approve", "target": "tool-email" },
    { "id": "e6", "source": "tool-email", "target": "end-1" }
  ]
}
```

## Trigger Payload Example

```json
{
  "email": "prospect@company.com",
  "name": "Jane Smith",
  "company": "Acme Corp",
  "source": "website_form"
}
```

## What Happens

1. **Start** — Webhook received with lead data
2. **Agent: Enrich Lead** — Gemini agent searches the web for company info, LinkedIn, news. Uses up to 8 iterations.
3. **Tool: Slack** — Sends enriched lead summary to #sales-leads channel
4. **Tool: Jira** — Creates a follow-up task in the SALES project
5. **Human: Manager Approval** — Pauses workflow, sends notification to manager for approval
6. **Tool: Gmail** — Sends personalized outreach email (only after approval)
7. **End** — Workflow complete

## Required Tool Scopes
- `web:search` — for web_search
- `http:request` — for http_request  
- `chat:write` — for slack_send_message
- `jira:write` — for jira_create_issue
- `gmail:send` — for gmail_send
