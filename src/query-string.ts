
export function setURLQuery(value: string) {
  const currentURL = new URL(window.location.href);
  currentURL.searchParams.set('query', value);
  window.history.pushState(value, '', currentURL.href)
}

export function getURLQuery() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("query");
  return query;
}

