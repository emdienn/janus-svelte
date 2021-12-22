// export the server namespace, avoiding collision with the export below
export * as Srv from './server'

// export all utils under the utils namespace
export * as Utils from './utils'

// export everything exported from all plugins, in its own namespace
export * as Plugins from './plugins'

// export the server and top level plugin components directly
export { Server } from './server'
export { VideoRoom } from './plugins/videoroom'
export { TextRoom } from './plugins/textroom'
