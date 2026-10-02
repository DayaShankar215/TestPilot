import { apiClient } from '../apiClient'

export const aiGeneratorApi = {
  async generate(projectId, payload) {
    const { data } = await apiClient.post(`/projects/${projectId}/ai-test-cases/generate`, payload, {
      timeout: 60000,
    })
    return data.data
  },
}
