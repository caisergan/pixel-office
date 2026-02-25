declare function acquireVsCodeApi(): { postMessage(msg: unknown): void }

export function isVsCodeApiAvailable(): boolean {
  return typeof acquireVsCodeApi === 'function'
}

let vscodeApi: { postMessage(msg: unknown): void } | null = null

export const vscode = {
  postMessage(msg: unknown) {
    if (isVsCodeApiAvailable()) {
      if (!vscodeApi) {
        vscodeApi = acquireVsCodeApi()
      }
      vscodeApi.postMessage(msg)
    } else {
      // In standalone mode, fallback to wsClient. It needs to be dynamically imported or
      // injected to avoid circular dependencies, but we'll import it directly.
      import('./wsClient.js').then(({ wsClient }) => {
        wsClient.send(msg)
      })
    }
  }
}
