/** The ASP.NET Core host, not Vite's build mode, owns indexing policy. */
export function runtimeIndexingDisabled(): boolean {
  return document.head
    .querySelector<HTMLMetaElement>('meta[name="robots"]')
    ?.dataset.runtimeIndexing === 'disabled';
}
