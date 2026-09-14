import { useCallback, useEffect, useState } from 'react'

/** Contador global: cualquier mutación invalida las consultas montadas. */
let revision = 0
const subscribers = new Set<() => void>()

export function invalidate(): void {
  revision += 1
  subscribers.forEach((fn) => fn())
}

export function useQuery<T>(
  run: () => Promise<T>,
  deps: unknown[],
): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localRevision, setLocalRevision] = useState(revision)

  useEffect(() => {
    const onInvalidate = () => setLocalRevision(revision)
    subscribers.add(onInvalidate)
    return () => {
      subscribers.delete(onInvalidate)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    run()
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, localRevision])

  const reload = useCallback(() => setLocalRevision(revision + 1), [])
  return { data, loading, error, reload }
}

/** Ejecuta una mutación y refresca las pantallas montadas. */
export async function mutate(action: () => Promise<unknown>): Promise<void> {
  await action()
  invalidate()
}
