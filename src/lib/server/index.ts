import Janus from 'janus-gateway-ts'
import adapter from 'webrtc-adapter'

import type { JanusJS } from 'janus-gateway-ts'

// incorporate the webrtc adapter into our dependencies by default
const deps = (dependencies: JanusJS.Dependencies) => Janus.useDefaultDependencies({ adapter, ...dependencies })

export type InitOptions = {
  server: JanusJS.ConstructorOptions['server']
  apisecret?: JanusJS.ConstructorOptions['apisecret']
  withCredentials?: JanusJS.ConstructorOptions['withCredentials']
  token?: JanusJS.ConstructorOptions['token']
  iceServers?: JanusJS.ConstructorOptions['iceServers']
  ipv6?: JanusJS.ConstructorOptions['ipv6']
  maxPollEvents?: JanusJS.ConstructorOptions['max_poll_events']

  debug?: JanusJS.InitOptions['debug']
  dependencies?: JanusJS.InitOptions['dependencies']
}

type Init = (options: InitOptions) => Promise<Janus>

/**
 * Promise to initialise a new connection to Janus
 */
export const init: Init = ({ debug, server, dependencies }) =>
  new Promise((resolve, reject) =>
    Janus.init({
      debug,
      dependencies: deps(dependencies),
      callback: () => {
        const janus = new Janus({
          server,
          destroyed: () => Janus.log('Janus be destroy'),
          error: e => reject(e),
          success: () => resolve(janus),
        })
      },
    }),
  )

// components

export { default as Server } from './index.svelte'
