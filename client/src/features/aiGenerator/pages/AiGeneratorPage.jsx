import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import {
  AlertTriangle,
  Check,
  Info,
  Pencil,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardBody, CardHeader } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { Badge, StatusBadge } from '../../../components/common/Badge'
import { EmptyState } from '../../../components/common/EmptyState'
import { Modal } from '../../../components/common/Overlay'
import { Skeleton } from '../../../components/common/Skeleton'
import { Alert } from '../../../components/feedback/States'
import { FormField, Input, Select, Textarea } from '../../../components/forms/FormControls'
import { MultiSelect } from '../../../components/forms/MultiSelect'
import { StepEditor } from '../../../components/forms/Editors'
import { aiGeneratorApi, requirementsApi, testCasesApi } from '../../../services/endpoints'
import { useApi } from '../../../hooks/useApi'
import { useToast } from '../../../context/ToastContext'
import { usePermissions } from '../../../context/PermissionsContext'
import { CONFIDENCE, PRIORITY, TEST_CASE_TYPE } from '../../../utils/constants'
import { aiGenerationSchema } from '../../../utils/schemas'
import { formatDateTime } from '../../../utils/formatters'
import { ROUTES } from '../../../utils/routes'

const generatorFormSchema = z.object({
  requirementId: z.string(),
  description: z.string(),
  count: z.coerce.number().int().min(1).max(15),
})

export function AiGeneratorPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = usePermissions()
  const [searchParams] = useSearchParams()

  const [types, setTypes] = useState(['functional', 'negative'])
  const [result, setResult] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [decisions, setDecisions] = useState({})
  const [editing, setEditing] = useState(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(generatorFormSchema),
    defaultValues: {
      requirementId: searchParams.get('requirementId') ?? '',
      description: '',
      count: 5,
    },
  })

  const requirementsFetcher = useMemo(
    () => () => requirementsApi.list(projectId, { pageSize: 100, sortBy: 'ref' }),
    [projectId],
  )
  const { data: requirementData } = useApi(requirementsFetcher, [projectId])

  const requirementId = watch('requirementId')

  const suggestions = result?.suggestions ?? []
  const approved = suggestions.filter((item) => decisions[item.id] === 'approved')

  const decide = (id, decision) => setDecisions((current) => ({ ...current, [id]: decision }))

  const generate = async (values) => {
    const parsed = aiGenerationSchema.safeParse({
      requirementId: values.requirementId,
      description: values.description,
      types,
      count: values.count,
    })

    if (!parsed.success) {
      toast.error('Check the generation inputs', parsed.error.issues[0]?.message)
      return
    }

    setGenerating(true)
    setResult(null)
    setDecisions({})
    try {
      const response = await aiGeneratorApi.generate(projectId, parsed.data)
      setResult(response)
      setEditing(null)
      toast.info(
        `${response.suggestions.length} suggestion${response.suggestions.length === 1 ? '' : 's'} ready`,
        'Nothing has been saved to the test library yet.',
      )
    } catch (error) {
      toast.error('Generation failed', error?.message)
    } finally {
      setGenerating(false)
    }
  }

  const saveApproved = async () => {
    setSaving(true)
    try {
      const created = []
      for (const suggestion of approved) {
        const record = await testCasesApi.create(projectId, {
          title: suggestion.title,
          description: suggestion.description,
          type: suggestion.type,
          priority: suggestion.priority,
          status: 'draft',
          module: requirementData?.items?.find((item) => item.id === requirementId)?.module ?? 'General',
          requirementIds: suggestion.requirementIds,
          preconditions: suggestion.preconditions,
          testData: [],
          steps: suggestion.steps,
        })
        created.push(record)
      }
      toast.success(
        `${created.length} test case${created.length === 1 ? '' : 's'} saved as drafts`,
        created.map((item) => item.ref).join(', '),
      )
      navigate(ROUTES.testCases(projectId))
    } catch (error) {
      toast.error('Could not save suggestions', error?.message)
    } finally {
      setSaving(false)
    }
  }

  if (!can('ai:generate')) {
    return (
      <div className="page">
        <PageHeader title="AI test generator" description="Draft test cases from a requirement." />
        <Alert tone="info" title="Not available for your role">
          AI generation is limited to testers, managers and admins.
        </Alert>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="AI test generator"
        description="Draft suggested test cases from a requirement. Suggestions are reviewed and approved by a person before anything is saved."
        actions={
          approved.length > 0 && (
            <Button icon={Save} onClick={saveApproved} loading={saving}>
              Save {approved.length} approved
            </Button>
          )
        }
      />

      <Alert tone="warning" title="Suggestions require human approval">
        Generated content is unverified. Review every step, confirm the expected results are correct, and check for
        duplicates before saving. Nothing is written to the test library until you approve it.
      </Alert>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card>
          <CardHeader title="Generation inputs" subtitle="Pick a requirement or describe the behaviour" />
          <CardBody className="stack">
            <FormField label="Requirement" htmlFor="ai-requirement" hint="Choosing a requirement links every approved case back to it.">
              <Select id="ai-requirement" {...register('requirementId')}>
                <option value="">No requirement — use the description below</option>
                {(requirementData?.items ?? []).map((requirement) => (
                  <option key={requirement.id} value={requirement.id}>
                    {requirement.ref} — {requirement.title}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Behaviour description"
              htmlFor="ai-description"
              error={errors.description?.message}
              hint="Used when no requirement is selected."
            >
              <Textarea
                id="ai-description"
                rows={4}
                placeholder="A user can reset their password from the login screen using a verified email address."
                invalid={Boolean(errors.description)}
                {...register('description')}
              />
            </FormField>

            <MultiSelect
              label="Test types to cover"
              options={Object.entries(TEST_CASE_TYPE).map(([value, entry]) => ({ value, label: entry.label }))}
              value={types}
              onChange={setTypes}
              placeholder="Select at least one test type"
            />

            <FormField label="Number of suggestions" htmlFor="ai-count" error={errors.count?.message}>
              <Input id="ai-count" type="number" min={1} max={15} {...register('count')} />
            </FormField>

            <Button
              icon={Wand2}
              onClick={handleSubmit(generate)}
              loading={generating}
              disabled={generating}
            >
              Generate suggestions
            </Button>

            {errors.description && (
              <span className="field__error" role="alert">
                {errors.description.message}
              </span>
            )}
          </CardBody>
        </Card>

        <div className="stack">
          {generating && (
            <Card>
              <CardBody className="stack">
                <span className="text-secondary">Generating suggestions…</span>
                <Skeleton height={120} />
                <Skeleton height={120} />
              </CardBody>
            </Card>
          )}

          {!generating && !result && (
            <Card>
              <CardBody flush>
                <EmptyState
                  icon={Sparkles}
                  title="No suggestions yet"
                  description="Choose a requirement or describe the behaviour, then generate suggestions to review here."
                />
              </CardBody>
            </Card>
          )}

          {result && (
            <>
              <Card>
                <CardHeader
                  title={`${result.suggestions.length} suggestion${result.suggestions.length === 1 ? '' : 's'}`}
                  subtitle={`Based on ${result.basedOn.type === 'requirement' ? result.basedOn.ref : 'your description'} · ${result.model} · ${formatDateTime(result.generatedAt)}`}
                />
                <CardBody className="stack-sm">
                  <Alert tone="info" icon={Info}>
                    {result.disclaimer}
                  </Alert>
                  <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                    Approve a suggestion to include it in the save action. Edit any step before approving.
                  </p>
                </CardBody>
              </Card>

              {suggestions.map((suggestion) => {
                const decision = decisions[suggestion.id]
                return (
                  <Card key={suggestion.id}>
                    <CardHeader
                      title={suggestion.title}
                      subtitle={suggestion.description}
                      actions={
                        <div className="row-sm">
                          {decision === 'approved' && <StatusBadge map={APPROVAL} value="approved" />}
                          {decision === 'rejected' && <StatusBadge map={APPROVAL} value="rejected" />}
                        </div>
                      }
                    />
                    <CardBody className="stack">
                      <div className="row-sm" style={{ gap: 6, flexWrap: 'wrap' }}>
                        <Badge tone="accent">{TEST_CASE_TYPE[suggestion.type]?.label ?? suggestion.type}</Badge>
                        <Badge tone={PRIORITY[suggestion.priority]?.tone ?? 'neutral'}>
                          {PRIORITY[suggestion.priority]?.label ?? suggestion.priority} priority
                        </Badge>
                        <Badge tone={CONFIDENCE[suggestion.confidence]?.tone ?? 'neutral'}>
                          {CONFIDENCE[suggestion.confidence]?.label ?? 'Unknown confidence'}
                        </Badge>
                        {suggestion.possibleDuplicate && (
                          <Badge tone="warning" icon={AlertTriangle}>
                            Possible duplicate
                          </Badge>
                        )}
                      </div>

                      {suggestion.missingFields?.length > 0 && (
                        <Alert tone="warning">
                          Incomplete: {suggestion.missingFields.join(', ')}. Fill this in before approving.
                        </Alert>
                      )}

                      <ol className="step-list">
                        {suggestion.steps.map((step, index) => (
                          <li key={step.id ?? index} className="step-card">
                            <span className="step-card__number" aria-hidden="true">
                              {index + 1}
                            </span>
                            <div className="step-card__body">
                              <div className="stack-sm" style={{ gap: 2 }}>
                                <span className="stat__label">Action</span>
                                <p>{step.action}</p>
                              </div>
                              <div className="stack-sm" style={{ gap: 2 }}>
                                <span className="stat__label">Expected result</span>
                                <p>{step.expectedResult}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>

                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Pencil}
                          onClick={() => setEditing(suggestion)}
                        >
                          Edit steps
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Trash2}
                          onClick={() => decide(suggestion.id, 'rejected')}
                          disabled={decision === 'rejected'}
                        >
                          {decision === 'rejected' ? 'Rejected' : 'Reject'}
                        </Button>
                        <Button
                          size="sm"
                          icon={Check}
                          onClick={() => decide(suggestion.id, decision === 'approved' ? undefined : 'approved')}
                        >
                          {decision === 'approved' ? 'Approved' : 'Approve'}
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                )
              })}

              {approved.length > 0 && (
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => navigate(ROUTES.testCases(projectId))}>
                    Cancel
                  </Button>
                  <Button icon={Save} onClick={saveApproved} loading={saving}>
                    Save {approved.length} approved as drafts
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit suggestion"
        description={editing?.title}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setResult((current) => ({
                  ...current,
                  suggestions: current.suggestions.map((item) =>
                    item.id === editing.id ? { ...item, ...editing, id: item.id } : item,
                  ),
                }))
                setEditing(null)
                toast.success('Suggestion updated', 'Approve it to include it in the save action.')
              }}
            >
              Save suggestion
            </Button>
          </>
        }
      >
        {editing && (
          <div className="stack">
            <FormField label="Title" htmlFor="suggestion-title">
              <Input
                id="suggestion-title"
                value={editing.title}
                onChange={(event) => setEditing({ ...editing, title: event.target.value })}
              />
            </FormField>
            <FormField label="Expected result" htmlFor="suggestion-expected">
              <Input
                id="suggestion-expected"
                value={editing.expectedResult ?? ''}
                placeholder="Optional summary of the outcome"
                onChange={(event) => setEditing({ ...editing, expectedResult: event.target.value })}
              />
            </FormField>
            <StepEditor
              steps={editing.steps}
              onChange={(next) => setEditing({ ...editing, steps: next })}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

const APPROVAL = {
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'neutral' },
}