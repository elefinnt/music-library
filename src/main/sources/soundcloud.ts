const HOSTS = new Set(['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'])

export function isSoundCloudHost(host: string): boolean {
  return HOSTS.has(host.toLowerCase())
}

export function isSoundCloudSet(url: URL): boolean {
  return url.pathname.toLowerCase().includes('/sets/')
}
