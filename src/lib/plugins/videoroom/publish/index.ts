import Janus from 'janus-gateway-ts'

import type { PluginHandle } from 'janus-svelte/plugins/attach'
import type { InitPublish, Message } from '..'
import type { PublishSpec } from './factory'

/**
 * Initialise a new publisher with the given publish() init function
 */
export async function mountPublisher(publish: InitPublish): Promise<PluginHandle<PublishSpec>> {

  const opaqueId = Janus.randomString(12)

  // attach our new handle
  const publisher = await publish(opaqueId)

  return new Promise(resolve => {
    publisher.handle.on('message', (handle, message: Message, jsep) => {

      // only trigger promise resolution if we receive a "joined" message - it
      // will only happen once... it *should* only happen once?
      if (message.videoroom === 'joined') {
        publisher.plugin.id = parseInt(message.id)
        publisher.plugin.privateId = parseInt(message.private_id)

        // async exploding my mind rn: we only want to actually resolve our publisher once we've
        // confirmed that we've joined the room (not only established a connection)
        resolve(publisher)
      }

      // always reciprocate this handshake if it's present
      if (jsep) {
        publisher.handle.handleRemoteJsep({ jsep })
      }
    })
  })
}


// utils

export { default as makePublish } from './factory'

export type { VideoOffer, AudioOffer } from './factory'

// components

export { default as Publish } from './index.svelte'
