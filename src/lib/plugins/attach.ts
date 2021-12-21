import type { JanusJS } from 'janus-gateway-ts'

interface Events {
  consentdialog: (visible: boolean) => void
  detached: () => void
  icestate: (state: 'connected' | 'failed') => void
  mediastate: (on: boolean, type: 'audio' | 'video') => void
  cleanup: () => void
  data: (data: any) => void
  dataopen: () => void
  localstream: (stream: MediaStream) => void
  message: (message: any, jsep: JanusJS.JSEP) => void
  remotestream: (stream: MediaStream) => void
  slowlink: (uplink: boolean) => void
  webrtcstate: (isConnected: boolean) => void
  error: (error: any) => void
}

export type Event = <K extends keyof Events>(event: K, callback: (handle: JanusJS.PluginHandle, ...args: Parameters<Events[K]>) => ReturnType<Events[K]>) => void

export type Handle = {
  on: Event
} & JanusJS.PluginHandle

export type PluginHandle<T> = {
  handle: Handle
  plugin: T
}

/**
 * For a given connection and plugin name, create a factory function for attaching a new handle.
 */
export default function (janus: JanusJS.Janus, plugin: string) {

  return (opaqueId: string): Promise<Handle> => new Promise((resolve, reject) => {

    // this variable is populated by the success() callback beflow, and scoped
    // here so the callbacks have access to it
    let handle: JanusJS.PluginHandle

    // a simple callback container
    const cbs: Record<string, Function[]> = {}

    const on: Handle['on'] = (event, callback) => {
      if (!(event in cbs)) {
        cbs[event] = []
      }
      cbs[event].push(callback)
    }

    function dispatch<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) {
      if (event in cbs) {
        cbs[event].forEach(c => c.apply(janus, [ handle, ...args ]))
      }
    }

    // request a new plugin handle
    janus.attach({
      plugin,
      opaqueId,
      error: (error) => {
        // if we've already initialised, dispatch an error; if we haven't
        // initialised, reject the promise with the error
        if (handle) {
          dispatch('error', error)
        } else {
          reject(error)
        }
      },

      // this was originally more complex, checking messages and dispatching
      // particular events based on what was happening, but it proved simpler
      // to allow each plugin to handle its own initialisation
      consentDialog: (visible) => dispatch('consentdialog', visible),
      detached: () => dispatch('detached'),
      iceState: (state) => dispatch('icestate', state),
      mediaState: ({ on, type }) => dispatch('mediastate', on, type),
      oncleanup: () => dispatch('cleanup'),
      ondata: (data: any) => dispatch('data', data),
      ondataopen: () => dispatch('dataopen'),
      onlocalstream: (stream) => dispatch('localstream', stream),
      onmessage: (message, jsep) => dispatch('message', message, jsep),
      onremotestream: (stream) => dispatch('remotestream', stream),
      slowLink: ({ uplink }) => dispatch('slowlink', uplink),
      webrtcState: (isConnected) => dispatch('webrtcstate', isConnected),

      success: pluginHandle => {
        // store handle in our closure so our callbacks have access
        handle = pluginHandle

        // resolve our augmented plugin handle
        resolve({ on, ...pluginHandle })
      },
    })
  })
}
