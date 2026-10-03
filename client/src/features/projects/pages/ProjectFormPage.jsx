import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '../../../components/common/PageHeader'
import { Card, CardBody, CardFooter } from '../../../components/common/Card'
import { Button } from '../../../components/common/Button'
import { FormField, Input, Select, Textarea } from '../../../components/forms/FormControls'
import { Alert } from '../../../components/feedback/States'
import { projectsApi, usersApi } from '../../../services/endpoints'
import { projectSchema } from '../../../utils/schemas'
import { ENVIRONMENT, PROJECT_STATUS } from '../../../utils/constants'
import { ROUTES } from '../../../utils/routes'
import { useToast } from '../../../context/ToastContext'
import { useActiveProject } from '../../../context/ActiveProjectContext'

export function ProjectFormPage({ mode }) {
  const isEdit = mode === 'edit'
  const navigate = useNavigate()
  const toast = useToast()
  const { projectId } = useParams()
  const { setActiveProject } = useActiveProject()
  const [users, setUsers] = useState([])
  const [loadingProject, setLoadingProject] = useState(isEdit)
  const [apiError, setApiError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      key: '',
      description: '',
      status: 'planning',
      release: '',
      environment: 'dev',
      ownerId: '',
    },
  })

  useEffect(() => {
    usersApi.list().then(setUsers).catch(() => setUsers([]))
  }, [])

  useEffect(() => {
    if (!isEdit) {
      usersApi
        .list()
        .then((list) => {
          if (list[0]) reset((current) => ({ ...current, ownerId: list[0].id }))
        })
        .catch(() => {})
      return
    }

    let cancelled = false
    projectsApi
      .get(projectId)
      .then((project) => {
        if (cancelled) return
        reset({
          name: project.name,
          key: project.key,
          description: project.description,
          status: project.status,
          release: project.release,
          environment: project.environment,
          ownerId: project.ownerId,
        })
      })
      .catch((error) => {
        if (!cancelled) setApiError(error)
      })
      .finally(() => {
        if (!cancelled) setLoadingProject(false)
      })

    return () => {
      cancelled = true
    }
  }, [isEdit, projectId, reset])

  const onSubmit = async (values) => {
    setApiError(null)
    try {
      if (isEdit) {
        await projectsApi.update(projectId, values)
        toast.success('Project updated', `${values.name} has been saved.`)
        navigate(ROUTES.project(projectId))
      } else {
        const created = await projectsApi.create(values)
        setActiveProject(created.id)
        toast.success('Project created', `${created.name} is ready.`)
        navigate(ROUTES.project(created.id))
      }
    } catch (error) {
      setApiError(error)
      toast.error(isEdit ? 'Could not save project' : 'Could not create project', error?.message)
    }
  }

  if (loadingProject) {
    return (
      <div className="page">
        <PageHeader title="Project settings" />
        <Card>
          <CardBody>
            <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-md)' }} aria-hidden="true" />
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title={isEdit ? 'Project settings' : 'Create a project'}
        description={
          isEdit
            ? 'Update the project scope, release and default environment.'
            : 'A project scopes its own requirements, test cases, runs, defects and reports.'
        }
        actions={
          <Button variant="secondary" onClick={() => navigate(isEdit ? ROUTES.project(projectId) : ROUTES.projects)}>
            Cancel
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <Card>
            <CardBody className="stack">
              {apiError && (
                <Alert tone="danger" title={isEdit ? 'Could not save changes' : 'Could not create project'}>
                  {apiError.message}
                </Alert>
              )}

              <FormField label="Project name" htmlFor="name" required error={errors.name?.message}>
                <Input id="name" placeholder="Payments Gateway" invalid={Boolean(errors.name)} {...register('name')} />
              </FormField>

              <FormField
                label="Project key"
                htmlFor="key"
                required
                error={errors.key?.message}
                hint="Short prefix used for requirement, test case and defect references."
              >
                <Input id="key" placeholder="PAY" maxLength={4} invalid={Boolean(errors.key)} {...register('key')} />
              </FormField>

              <FormField label="Description" htmlFor="description" error={errors.description?.message}>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="What this project covers and who owns it."
                  invalid={Boolean(errors.description)}
                  {...register('description')}
                />
              </FormField>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="stack">
              <FormField label="Status" htmlFor="status" required error={errors.status?.message}>
                <Select id="status" {...register('status')}>
                  {Object.entries(PROJECT_STATUS).map(([value, entry]) => (
                    <option key={value} value={value}>
                      {entry.label} — {entry.description}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Current release" htmlFor="release" required error={errors.release?.message}>
                <Input id="release" placeholder="2026.03" invalid={Boolean(errors.release)} {...register('release')} />
              </FormField>

              <FormField label="Default environment" htmlFor="environment" required error={errors.environment?.message}>
                <Select id="environment" {...register('environment')}>
                  {Object.entries(ENVIRONMENT).map(([value, entry]) => (
                    <option key={value} value={value}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Project owner" htmlFor="ownerId" required error={errors.ownerId?.message}>
                <Select id="ownerId" {...register('ownerId')}>
                  <option value="">Select an owner</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} — {user.title}
                    </option>
                  ))}
                </Select>
              </FormField>
            </CardBody>
            <CardFooter>
              <div className="row-between">
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                  {isEdit ? 'Changes apply immediately.' : 'You can add members after creating the project.'}
                </span>
                <div className="row-sm">
                  <Button
                    variant="secondary"
                    onClick={() => navigate(isEdit ? ROUTES.project(projectId) : ROUTES.projects)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={isSubmitting} disabled={isEdit && !isDirty}>
                    {isEdit ? 'Save changes' : 'Create project'}
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  )
}
