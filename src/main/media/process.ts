import { spawn, type ChildProcess } from 'child_process'

export interface SpawnResult {
  stdout: string
  stderr: string
}

function killTree(child: ChildProcess): void {
  if (!child.pid) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, shell: false })
    return
  }
  child.kill()
}

function attach(stream: NodeJS.ReadableStream | null, collect: string[], onLine?: (line: string) => void): void {
  if (!stream) return
  let pending = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    collect.push(chunk)
    pending += chunk
    const parts = pending.split(/\r?\n/)
    pending = parts.pop() ?? ''
    if (!onLine) return
    for (const line of parts) onLine(line)
  })
}

function trimError(stderr: string, fallback: string): string {
  const text = stderr.trim() || fallback
  return text.length > 700 ? text.slice(-700) : text
}

export function runProcess(options: {
  bin: string
  args: string[]
  onLine?: (line: string) => void
  signal?: AbortSignal
}): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new Error('Cancelled.'))
      return
    }
    const child = spawn(options.bin, options.args, {
      windowsHide: true,
      shell: false,
      env: { ...process.env, YTDLP_NO_UPDATE: '1' }
    })
    const stdout: string[] = []
    const stderr: string[] = []
    const kill = () => killTree(child)
    options.signal?.addEventListener('abort', kill, { once: true })
    attach(child.stdout, stdout, options.onLine)
    attach(child.stderr, stderr, options.onLine)
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        reject(new Error(`Could not find ${options.bin}. Set the path in Settings, or run pnpm fetch-sidecars.`))
        return
      }
      reject(error)
    })
    child.on('close', (code) => {
      if (options.signal?.aborted) {
        reject(new Error('Cancelled.'))
        return
      }
      if (code === 0) {
        resolve({ stdout: stdout.join(''), stderr: stderr.join('') })
        return
      }
      reject(new Error(trimError(stderr.join(''), `The tool exited with code ${code ?? 'unknown'}.`)))
    })
  })
}
