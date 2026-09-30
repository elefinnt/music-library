const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'])

export function isYouTubeHost(host: string): boolean {
  return HOSTS.has(host.toLowerCase())
}

export function isYouTubePlaylist(url: URL): boolean {
  if (url.pathname === '/playlist' || url.pathname.startsWith('/playlist/')) return true
  return url.searchParams.has('list') && !url.searchParams.has('v') && url.hostname.toLowerCase() !== 'youtu.be'
}
