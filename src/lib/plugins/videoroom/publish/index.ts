import Janus from 'janus-gateway-ts'

import type { PluginHandle } from 'janus-svelte/plugins/attach'
import type { InitPublish, Message } from '..'
import type { PublishSpec } from './factory'

/**
 * Initialise a new publisher with the given publish() init function
 */
export async function mountPublisher(publish: InitPublish): Promise<PluginHandle<PublishSpec>> {

  // let resolved = false

  const opaqueId = Janus.randomString(12)

  // attach our new handle
  const publisher = await publish(opaqueId)

  publisher.handle.on('message', (_, message, jsep) => {
    // always reciprocate this handshake if it's present
    if (jsep) {
      publisher.handle.handleRemoteJsep({ jsep })
    }
  })

  return publisher
}


// utils

export { default as makePublish } from './factory'

export type { VideoOffer, AudioOffer } from './factory'

// components

export { default as Publish } from './index.svelte'
