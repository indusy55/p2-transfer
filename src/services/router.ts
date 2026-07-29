export type Route =
  | { page: 'home' }
  | { page: 'create' }
  | { page: 'join'; code?: string };

type RouteChangeCallback = (route: Route) => void;

let handler: (() => void) | null = null;

function parseHash(): Route {
  const hash = window.location.hash.slice(1) || '/';

  if (hash === '/create') return { page: 'create' };

  const joinMatch = hash.match(/^\/join(?:\/([0-9]{6}))?$/);
  if (joinMatch) return { page: 'join', code: joinMatch[1] };

  return { page: 'home' };
}

export function currentRoute(): Route {
  return parseHash();
}

export function navigate(route: Route) {
  switch (route.page) {
    case 'home':
      window.location.hash = '/';
      break;
    case 'create':
      window.location.hash = '/create';
      break;
    case 'join':
      window.location.hash = route.code ? `/join/${route.code}` : '/join';
      break;
  }
}

export function onRouteChange(callback: RouteChangeCallback) {
  if (handler) window.removeEventListener('hashchange', handler);
  handler = () => callback(parseHash());
  window.addEventListener('hashchange', handler);
  callback(parseHash());
}

export function stopRouteListener() {
  if (handler) {
    window.removeEventListener('hashchange', handler);
    handler = null;
  }
}
