// API Configuration
// Change NEXT_PUBLIC_API_URL in .env.local to switch backends

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = {
  baseUrl: API_BASE_URL,
  endpoints: {
    // Health
    health: `${API_BASE_URL}/api/health`,
    
    // Users
    users: {
      me: `${API_BASE_URL}/api/users/me`,
      dashboard: `${API_BASE_URL}/api/users/dashboard`,
    },
    
    // Integrations
    integrations: {
      list: `${API_BASE_URL}/api/integrations`,
      create: `${API_BASE_URL}/api/integrations`,
      validate: `${API_BASE_URL}/api/integrations/validate`,
      get: (id: string) => `${API_BASE_URL}/api/integrations/${id}`,
      update: (id: string) => `${API_BASE_URL}/api/integrations/${id}`,
      delete: (id: string) => `${API_BASE_URL}/api/integrations/${id}`,
      test: (id: string) => `${API_BASE_URL}/api/integrations/${id}/test`,
      agents: (id: string) => `${API_BASE_URL}/api/integrations/${id}/agents`,
      agent: (id: string, agentId: string) => `${API_BASE_URL}/api/integrations/${id}/agents/${agentId}`,
      analyzeAgent: (id: string, agentId: string) => `${API_BASE_URL}/api/integrations/${id}/agents/${agentId}/analyze`,
      limits: (id: string) => `${API_BASE_URL}/api/integrations/${id}/limits`,
    },
    
    // Agents
    agents: {
      list: `${API_BASE_URL}/api/agents`,
      create: `${API_BASE_URL}/api/agents`,
      get: (id: string) => `${API_BASE_URL}/api/agents/${id}`,
      update: (id: string) => `${API_BASE_URL}/api/agents/${id}`,
      delete: (id: string) => `${API_BASE_URL}/api/agents/${id}`,
      generateTestCases: (id: string) => `${API_BASE_URL}/api/agents/${id}/generate-test-cases`,
      analyzePrompt: (id: string) => `${API_BASE_URL}/api/agents/${id}/analyze-prompt`,
      dynamicVariables: (id: string) => `${API_BASE_URL}/api/agents/${id}/dynamic-variables`,
      knowledgeBase: (id: string) => `${API_BASE_URL}/api/agents/${id}/knowledge-base`,
      knowledgeBaseDocumentContent: (id: string, documentId: string) => `${API_BASE_URL}/api/agents/${id}/knowledge-base/${documentId}/content`,
      testCases: (id: string) => `${API_BASE_URL}/api/agents/${id}/test-cases`,
      workflow: (id: string) => `${API_BASE_URL}/api/agents/${id}/workflow`,
      promptVersions: (id: string) => `${API_BASE_URL}/api/agents/${id}/prompt-versions`,
    },

    // Custom Agents (Agent Builder)
    customAgents: {
      list: `${API_BASE_URL}/api/custom-agents`,
      create: `${API_BASE_URL}/api/custom-agents`,
      get: (id: string) => `${API_BASE_URL}/api/custom-agents/${id}`,
      update: (id: string) => `${API_BASE_URL}/api/custom-agents/${id}`,
      delete: (id: string) => `${API_BASE_URL}/api/custom-agents/${id}`,
      chat: (id: string) => `${API_BASE_URL}/api/custom-agents/${id}/chat`,
      simulate: (id: string) => `${API_BASE_URL}/api/custom-agents/${id}/simulate`,
      models: `${API_BASE_URL}/api/custom-agents/config/models`,
      voices: `${API_BASE_URL}/api/custom-agents/config/voices`,
    },
    
    // Test Cases
    testCases: {
      list: `${API_BASE_URL}/api/test-cases`,
      create: `${API_BASE_URL}/api/test-cases`,
      bulk: `${API_BASE_URL}/api/test-cases/bulk`,
      csvTemplate: `${API_BASE_URL}/api/test-cases/csv-template`,
      importCSV: `${API_BASE_URL}/api/test-cases/import-csv`,
      get: (id: string) => `${API_BASE_URL}/api/test-cases/${id}`,
      update: (id: string) => `${API_BASE_URL}/api/test-cases/${id}`,
      delete: (id: string) => `${API_BASE_URL}/api/test-cases/${id}`,
    },
    
    // Test Runs
    testRuns: {
      list: `${API_BASE_URL}/api/test-runs`,
      create: `${API_BASE_URL}/api/test-runs`,
      stats: `${API_BASE_URL}/api/test-runs/stats`,
      get: (id: string) => `${API_BASE_URL}/api/test-runs/${id}`,
      byAgent: (agentId: string) => `${API_BASE_URL}/api/test-runs?agent_id=${agentId}`,
      start: (id: string) => `${API_BASE_URL}/api/test-runs/${id}/start`,
      cancel: (id: string) => `${API_BASE_URL}/api/test-runs/${id}/cancel`,
      delete: (id: string) => `${API_BASE_URL}/api/test-runs/${id}`,
      compare: (ids: string[]) => `${API_BASE_URL}/api/test-runs/compare?ids=${ids.join(',')}`,
      startWorkflow: `${API_BASE_URL}/api/test-runs/start-workflow`,
    },
    
    // Test Execution
    testExecution: {
      analyzeForBatching: `${API_BASE_URL}/api/test-execution/analyze-for-batching`,
      startBatched: `${API_BASE_URL}/api/test-execution/start-batched`,
      generateSmartTestCases: `${API_BASE_URL}/api/test-execution/generate-smart-test-cases`,
    },

    // Scheduled Tests
    scheduledTests: {
      list: `${API_BASE_URL}/api/scheduled-tests`,
      create: `${API_BASE_URL}/api/scheduled-tests`,
      get: (id: string) => `${API_BASE_URL}/api/scheduled-tests/${id}`,
      update: (id: string) => `${API_BASE_URL}/api/scheduled-tests/${id}`,
      delete: (id: string) => `${API_BASE_URL}/api/scheduled-tests/${id}`,
      toggle: (id: string) => `${API_BASE_URL}/api/scheduled-tests/${id}/toggle`,
    },

    // Alert Settings
    alertSettings: {
      get: `${API_BASE_URL}/api/alert-settings`,
      update: `${API_BASE_URL}/api/alert-settings`,
      addEmail: `${API_BASE_URL}/api/alert-settings/add-email`,
      removeEmail: `${API_BASE_URL}/api/alert-settings/remove-email`,
      slackUpdate: `${API_BASE_URL}/api/alert-settings/slack`,
      slackTest: `${API_BASE_URL}/api/alert-settings/slack/test`,
    },

    // Team Members
    teamMembers: {
      list: `${API_BASE_URL}/api/team-members`,
      create: `${API_BASE_URL}/api/team-members`,
      delete: (id: string) => `${API_BASE_URL}/api/team-members/${id}`,
      checkRole: `${API_BASE_URL}/api/team-members/check-role`,
    },

    // Test Results
    testResults: {
      scanInferences: (id: string) => `${API_BASE_URL}/api/test-results/${id}/scan-inferences`,
      getInferenceScan: (id: string) => `${API_BASE_URL}/api/test-results/${id}/inference-scan`,
      toolDecisions: (id: string) => `${API_BASE_URL}/api/test-results/${id}/tool-decisions`,
    },

    // Compliance & Security
    compliance: {
      agentInferenceScans: (agentId: string) => `${API_BASE_URL}/api/agents/${agentId}/inference-scans`,
      complianceSummary: (agentId: string) => `${API_BASE_URL}/api/agents/${agentId}/compliance-summary`,
      acknowledgeInference: (inferenceId: string) => `${API_BASE_URL}/api/inferences/${inferenceId}/acknowledge`,
    },

    // Leakage Testing (Security)
    leakageTests: {
      builtinScenarios: `${API_BASE_URL}/api/builtin-scenarios`,
      scenarios: (agentId: string) => `${API_BASE_URL}/api/agents/${agentId}/leakage-scenarios`,
      createScenario: (agentId: string) => `${API_BASE_URL}/api/agents/${agentId}/leakage-scenarios`,
      runTest: (agentId: string, scenarioId: string) => `${API_BASE_URL}/api/agents/${agentId}/leakage-tests/${scenarioId}/run`,
      testRuns: (agentId: string) => `${API_BASE_URL}/api/agents/${agentId}/leakage-tests`,
      securitySummary: (agentId: string) => `${API_BASE_URL}/api/agents/${agentId}/security-summary`,
    },

    // Consistency Testing
    consistencyTests: {
      start: (agentId: string) => `${API_BASE_URL}/api/agents/${agentId}/consistency-tests`,
      list: (agentId: string) => `${API_BASE_URL}/api/agents/${agentId}/consistency-tests`,
      get: (runId: string) => `${API_BASE_URL}/api/consistency-tests/${runId}`,
      summary: (agentId: string) => `${API_BASE_URL}/api/agents/${agentId}/consistency-summary`,
    },

    // Realtime Monitoring
    monitoring: {
      sessions: `${API_BASE_URL}/api/monitoring/sessions`,
      createSession: `${API_BASE_URL}/api/monitoring/sessions`,
      startMonitoring: (agentId: string) => `${API_BASE_URL}/api/monitoring/sessions/${agentId}/start`,
      stopMonitoring: (agentId: string) => `${API_BASE_URL}/api/monitoring/sessions/${agentId}/stop`,
      calls: `${API_BASE_URL}/api/monitoring/calls`,
      call: (callId: string) => `${API_BASE_URL}/api/monitoring/calls/${callId}`,
      reanalyze: (callId: string) => `${API_BASE_URL}/api/monitoring/calls/${callId}/reanalyze`,
      insights: (agentId: string) => `${API_BASE_URL}/api/monitoring/insights/${agentId}`,
      deleteCall: (callId: string) => `${API_BASE_URL}/api/monitoring/calls/${callId}`,
    },

    // Booking (public - no auth)
    booking: {
      create: `${API_BASE_URL}/api/booking`,
      availability: (date: string) => `${API_BASE_URL}/api/booking/availability?date=${date}`,
      weeklyAvailability: `${API_BASE_URL}/api/booking/weekly-availability`,
      get: (id: string) => `${API_BASE_URL}/api/booking/${id}`,
      cancel: (id: string) => `${API_BASE_URL}/api/booking/${id}/cancel`,
    },
  },
  
  // WebSocket URL for real-time updates
  wsUrl: API_BASE_URL.replace('http', 'ws') + '/ws',
};

export default api;
