import { useCallback, useEffect, useRef, useState } from 'react'

export function useApi(fetcher, deps = [], { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(immediate ? 'loading' : 'idle')
  const requestId = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const execute = useCallback(
    async (...args) => {
      requestId.current += 1
      const currentRequest = requestId.current
      setStatus('loading')
      setError(null)
      try {
        const result = await fetcher(...args)
        if (!mounted.current || currentRequest !== requestId.current) return undefined
        setData(result)
        setStatus('success')
        return result
      } catch (caught) {
        if (!mounted.current || currentRequest !== requestId.current) return undefined
        if (caught?.cancelled) return undefined
        setError(caught)
        setStatus('error')
        return undefined
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetcher, ...deps],
  )

  useEffect(() => {
    if (immediate) execute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, immediate])

  return {
    data,
    error,
    status,
    isLoading: status === 'loading',
    isError: status === 'error',
    isSuccess: status === 'success',
    refetch: execute,
    setData,
  }
}
