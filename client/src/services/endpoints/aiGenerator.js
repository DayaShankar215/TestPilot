import { apiClient, unwrap } from '../apiClient'

export const aiGeneratorApi = {
  /**
   * Spec route is `/ai/test-case-generation` and accepts a requirement
   * reference, a requirement id, or free text.
   */
  async generate(payload, projectId) {
    const response = await apiClient.post(
      '/ai/test-case-generation',
      projectId ? { ...payload, projectId } : payload,
      { timeout: 120000 },
    )
    return unwrap(response)
  },
}