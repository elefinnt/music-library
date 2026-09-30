/// <reference types="vite/client" />

import type { MusicBridge } from '@shared/bridge'

declare global {
  interface Window {
    music: MusicBridge
  }
}

export {}
