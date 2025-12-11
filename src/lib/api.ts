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
    },
    
    // Integrations
    integrations: {
      list: `${API_BASE_URL}/api/integrations`,
      create: `${API_BASE_URL}/api/integrations`,
      get: (id: string) => `${API_BASE_URL}/api/integrations/${id}`,
      update: (id: string) => `${API_BASE_URL}/api/integrations/${id}`,
      delete: (id: string) => `${API_BASE_URL}/api/integrations/${id}`,
    },
    
    // Agents
    agents: {
      list: `${API_BASE_URL}/api/agents`,
      create: `${API_BASE_URL}/api/agents`,
      get: (id: string) => `${API_BASE_URL}/api/agents/${id}`,
      update: (id: string) => `${API_BASE_URL}/api/agents/${id}`,
      delete: (id: string) => `${API_BASE_URL}/api/agents/${id}`,
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
      start: (id: string) => `${API_BASE_URL}/api/test-runs/${id}/start`,
      cancel: (id: string) => `${API_BASE_URL}/api/test-runs/${id}/cancel`,
      delete: (id: string) => `${API_BASE_URL}/api/test-runs/${id}`,
    },
  },
};

export default api;
