import api from './api'

export interface ApiKey {
  id: string
  name: string
  api_key?: string // Only returned when creating
  created_at: string
  expires_at?: string
}

interface ListApiKeysResponse {
  api_keys: ApiKey[]
}

interface CreateApiKeyRequest {
  name: string
}

interface CreateApiKeyResponse {
  id: string
  name: string
  api_key: string // Full key, only shown once
}

export const apiKeyService = {
  // List all API keys for current user
  list: async (): Promise<ApiKey[]> => {
    const response: ListApiKeysResponse = await api.get('/console/apikeys')
    return response.api_keys || []
  },

  // Create a new API key
  create: async (name: string): Promise<CreateApiKeyResponse> => {
    const data: CreateApiKeyRequest = { name }
    return api.post('/console/apikeys', data)
  },

  // Delete an API key
  delete: async (id: string): Promise<void> => {
    return api.delete(`/console/apikeys/${id}`)
  },
}
