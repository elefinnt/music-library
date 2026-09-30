import { app, safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'
import type { SpotifyPublic } from '@shared/types'

interface StoredCredentials {
  clientId: string
  clientSecret: string
}

function secretFile(): string {
  return path.join(app.getPath('userData'), 'spotify-secret.bin')
}

function readStored(): StoredCredentials {
  const file = secretFile()
  if (!fs.existsSync(file) || !safeStorage.isEncryptionAvailable()) {
    return { clientId: '', clientSecret: '' }
  }
  try {
    const decoded = safeStorage.decryptString(fs.readFileSync(file))
    const parsed = JSON.parse(decoded) as Partial<StoredCredentials>
    return {
      clientId: parsed.clientId?.trim() || '',
      clientSecret: parsed.clientSecret?.trim() || ''
    }
  } catch {
    return { clientId: '', clientSecret: '' }
  }
}

function writeStored(value: StoredCredentials): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Windows credential storage is not available in this session.')
  }
  fs.mkdirSync(path.dirname(secretFile()), { recursive: true })
  fs.writeFileSync(secretFile(), safeStorage.encryptString(JSON.stringify(value)))
}

export function getSpotifyCredentials(): StoredCredentials {
  return readStored()
}

export function getSpotifyPublic(): SpotifyPublic {
  const stored = readStored()
  return { clientId: stored.clientId, hasSecret: Boolean(stored.clientSecret) }
}

export function setSpotifyCredentials(clientId: string, clientSecret: string): SpotifyPublic {
  const current = readStored()
  const nextId = clientId.trim()
  const nextSecret = clientSecret.trim() || current.clientSecret
  if (!nextId && !nextSecret) {
    if (fs.existsSync(secretFile())) fs.unlinkSync(secretFile())
    return { clientId: '', hasSecret: false }
  }
  writeStored({ clientId: nextId, clientSecret: nextSecret })
  return { clientId: nextId, hasSecret: Boolean(nextSecret) }
}
