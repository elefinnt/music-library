import { BrowserWindow } from 'electron'
import { channels } from '@shared/channels'
import type { JobRecord } from '@shared/types'

export function emitJob(job: JobRecord): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channels.jobProgress, job)
  }
}
