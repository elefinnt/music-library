export function artworkSrc(filePath: string | null): string | null {
  if (!filePath) return null
  return `media://image/?path=${encodeURIComponent(filePath)}`
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return ''
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  const remain = total % 60
  return `${minutes}:${remain.toString().padStart(2, '0')}`
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    queued: 'Queued',
    running: 'Downloading',
    done: 'Saved',
    failed: 'Failed',
    cancelled: 'Cancelled',
    duplicate: 'Already saved',
    skipped: 'Skipped'
  }
  return labels[status] ?? status
}
