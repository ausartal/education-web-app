export function navigationPath(href: string): string {
  return href.split('?')[0].replace(/\/$/, '') || '/';
}

export function getActiveNavigationPath(pathname: string, hrefs: string[]): string | null {
  const matches = hrefs
    .map(navigationPath)
    .filter((path, index, paths) => paths.indexOf(path) === index)
    .filter(path => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length);

  return matches[0] ?? null;
}
