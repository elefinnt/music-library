import type { Result, SchemaStatus } from '@shared/types'

export class AppRequestError extends Error {
  schema?: SchemaStatus

  constructor(message: string, schema?: SchemaStatus) {
    super(message)
    this.name = 'AppRequestError'
    this.schema = schema
  }
}

export async function unwrap<T>(result: Result<T> | Promise<Result<T>>): Promise<T> {
  const resolved = await result
  if (!resolved.ok) throw new AppRequestError(resolved.error, resolved.schema)
  return resolved.data
}
