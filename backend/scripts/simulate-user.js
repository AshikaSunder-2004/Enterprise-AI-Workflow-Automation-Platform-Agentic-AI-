const fs = require('fs');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const API_BASE = 'http://localhost:4000/api';
  console.log('🤖 Starting Automated E2E Test & Simulation...');
  
  // 1. Register a test user
  console.log('\n--- 1. Registering Test User ---');
  const email = `test.user.${Date.now()}@example.com`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantName: 'Acme Test Corp',
      name: 'Test Admin',
      email: email,
      password: 'password123!'
    })
  });
  
  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    console.error('Failed to register:', registerData);
    return;
  }
  
  const token = registerData.accessToken;
  console.log(`✅ User registered successfully. Email: ${email}`);
  
  // 2. Create Workflow
  console.log('\n--- 2. Creating Workflow ---');
  const workflowDefinition = {
    nodes: [
      { id: "start-1", type: "start", label: "Start" },
      {
        id: "agent-enrich",
        type: "agent",
        label: "Enrich Lead",
        goal: "Extract lead data. Name: {{context.triggerPayload.name}}",
        allowedTools: ["web_search"],
        maxIterations: 2,
        budgetTokens: 5000,
        outputKey: "lead_enrichment",
        retries: 1
      },
      { id: "end-1", type: "end", label: "End" }
    ],
    edges: [
      { id: "e1", source: "start-1", target: "agent-enrich" },
      { id: "e2", source: "agent-enrich", target: "end-1" }
    ]
  };

  const createRes = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Lead Enrichment Test Workflow',
      description: 'A test workflow to demonstrate the platform',
      triggerType: 'MANUAL',
      definition: workflowDefinition
    })
  });
  
  const createData = await createRes.json();
  if (!createRes.ok) {
    console.error('Failed to create workflow:', createData);
    return;
  }
  
  const workflowId = createData.workflow.id;
  console.log(`✅ Workflow created with ID: ${workflowId}`);

  // 3. Publish Workflow
  console.log('\n--- 3. Publishing Workflow ---');
  const publishRes = await fetch(`${API_BASE}/workflows/${workflowId}/publish`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const publishData = await publishRes.json();
  if (!publishRes.ok) {
    console.error('Failed to publish workflow:', publishData);
    return;
  }
  console.log(`✅ Workflow published (Version ID: ${publishData.versionId})`);

  // 4. Trigger Run
  console.log('\n--- 4. Triggering Workflow Run ---');
  const triggerRes = await fetch(`${API_BASE}/workflows/${workflowId}/trigger`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      payload: {
        name: "Jane Smith",
        email: "jane.smith@example.com",
        company: "Global Tech"
      }
    })
  });
  
  const triggerData = await triggerRes.json();
  if (!triggerRes.ok) {
    console.error('Failed to trigger workflow:', triggerData);
    return;
  }
  
  const runId = triggerData.runId;
  console.log(`✅ Workflow run triggered with Run ID: ${runId}`);
  console.log('\n🎉 Simulation Complete! Check your Dashboard at http://localhost:3000');
  console.log(`You can login with Email: ${email} and Password: password123!`);
}

run().catch(console.error);
