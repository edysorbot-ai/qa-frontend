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
    },

    // Team Members
    teamMembers: {
      list: `${API_BASE_URL}/api/team-members`,
      create: `${API_BASE_URL}/api/team-members`,
      delete: (id: string) => `${API_BASE_URL}/api/team-members/${id}`,
      checkRole: `${API_BASE_URL}/api/team-members/check-role`,
    },
  },
};

export default api;
