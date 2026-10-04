import { prisma } from '../../config/database.js'
import { env } from '../../config/env.js'
import { ApiError } from '../../utils/apiError.js'
import { recordActivity } from '../../services/activity.js'

const STEP_TEMPLATES = {
  functional: (subject) => [
    { action: `Open the feature for ${subject}`, expected: 'The screen loads with no errors' },
    { action: `Complete the primary flow for ${subject}`, expected: 'The change is saved' },
    { action: 'Reload and verify the change', expected: 'The value persists' },
  ],
  positive: (subject) => [
    { action: `Enter valid data for ${subject}`, expected: 'No validation errors appear' },
    { action: 'Submit the form', expected: 'A success confirmation is shown' },
  ],
  negative: (subject) => [
    { action: `Leave a required field empty for ${subject}`, expected: 'The field is flagged' },
    { action: 'Submit invalid data', expected: 'A clear validation message appears and nothing is saved' },
  ],
  boundary: (subject) => [
    { action: `Submit the minimum accepted value for ${subject}`, expected: 'The value is accepted' },
    { action: 'Submit one step below the minimum', expected: 'The value is rejected' },
    { action: 'Submit the maximum accepted value', expected: 'The value is accepted' },
  ],
  integration: (subject) => [
    { action: `Exercise ${subject} through its upstream dependency`, expected: 'Data is passed correctly' },
    { action: 'Exercise the dependent flow', expected: 'The integration contract holds' },
  ],
  regression: (subject) => [
    { action: `Re-run the ${subject} flow on the current build`, expected: 'Behaviour matches the last known good build' },
  ],
}

function buildSteps(type, subject) {
  const template = STEP_TEMPLATES[type] ?? STEP_TEMPLATES.functional
  return template(subject).map((step, index) => ({ order: index + 1, ...step }))
}

/**
 * Local generator. It exists so the flow is fully usable offline and in CI;
 * it is deterministic and does not pretend to be a language model.
 */
function localSuggestions(subject, { types, count, projectId }) {
  const suggestions = []
  for (const type of types) {
    while (suggestions.length < count) {
      const index = suggestions.length + 1
      suggestions.push({
        id: `sug_${type}_${index}`,
        title: `${subject} — ${type.replace(/^\w/, (char) => char.toUpperCase())} ${index}`,
        description: `Covers the ${type} path for ${subject}.`,
        type,
        priority: 'medium',
        status: 'draft',
        projectId: projectId ?? null,
        steps: buildSteps(type, subject),
      })
    }
  }
  return suggestions
}

async function remoteSuggestions(subject, input) {
  const prompt = [
    'You are a senior QA engineer. Write concise, testable test cases.',
    'Return JSON only: {"suggestions":[{"title","description","steps":[{"action","expected"}]}]}',
    `types=${input.types.join(',')} count=${input.count}`,
    `Subject: ${subject}`,
  ].join('\n')

  const response = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.AI_API_KEY}` },
    body: JSON.stringify({
      model: env.AI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You generate software test cases as strict JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(env.aiTimeoutMs),
  })

  if (!response.ok) throw new ApiError(502, `AI provider responded with ${response.status}.`)

  const payload = await response.json()
  let parsed
  try {
    parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? '{}')
  } catch {
    throw new ApiError(502, 'AI provider returned malformed output.')
  }

  const raw = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
  if (!raw.length) throw new ApiError(502, 'AI provider returned no usable suggestions.')

  return raw.slice(0, input.count).map((item, index) => {
    const type = input.types.includes(item.type) ? item.type : input.types[0]
    return {
      id: `sug_${type}_${index + 1}`,
      title: String(item.title ?? 'Untitled').slice(0, 200),
      description: String(item.description ?? ''),
      type,
      priority: 'medium',
      status: 'draft',
      projectId: input.projectId ?? null,
      steps: Array.isArray(item.steps)
        ? item.steps.map((step, position) => ({
            order: position + 1,
            action: String(step.action ?? '').slice(0, 500),
            expected: String(step.expected ?? '').slice(0, 500),
          }))
        : [],
    }
  })
}

export async function generateTestCases(auth, input) {
  const startedAt = Date.now()

  let subject = input.description.trim()
  let requirement = null

  if (input.requirementId) {
    requirement = await prisma.requirement.findFirst({
      where: {
        OR: [{ id: input.requirementId }, { ref: input.requirementId }],
        ...(input.projectId ? { projectId: input.projectId } : {}),
      },
      select: { id: true, ref: true, title: true, description: true, projectId: true },
    })
    // An unknown reference is not an error: the user may be describing behaviour.
    if (requirement) subject = requirement.description || requirement.title
    else if (!subject) throw ApiError.notFound('Requirement not found.')
  }

  if (!subject) throw ApiError.badRequest('Describe the behaviour you want covered.')

  const useRemote = env.AI_PROVIDER === 'openai' && Boolean(env.AI_API_KEY)
  const suggestions = useRemote
    ? await remoteSuggestions(subject, input)
    : localSuggestions(subject, input)

  // Persisted for audit, usage limits and the "unreviewed suggestions" metric.
  // Test cases are only created once the user edits and approves them.
  await prisma.aiGeneration.create({
    data: {
      projectId: requirement?.projectId ?? input.projectId ?? null,
      userId: auth.user.id,
      requirementId: requirement?.id ?? null,
      provider: useRemote ? 'openai' : 'local',
      model: useRemote ? env.AI_MODEL : 'heuristic-v1',
      inputSummary: subject.slice(0, 500),
      promptVersion: env.AI_PROMPT_VERSION,
      suggestions,
      durationMs: Date.now() - startedAt,
    },
  })

  if (requirement?.projectId) {
    await recordActivity(auth, {
      projectId: requirement.projectId,
      action: 'ai.generated',
      entityType: 'requirement',
      entityId: requirement.id,
      summary: `Generated ${suggestions.length} suggestion(s) for ${requirement.ref}`,
    })
  }

  return {
    provider: useRemote ? 'openai' : 'local',
    model: useRemote ? env.AI_MODEL : 'heuristic-v1',
    promptVersion: env.AI_PROMPT_VERSION,
    requirement: requirement ? { id: requirement.id, ref: requirement.ref, title: requirement.title } : null,
    suggestions,
  }
}