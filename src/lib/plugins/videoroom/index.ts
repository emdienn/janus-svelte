import prepareAttach from '$lib/attach'

import { makePublish } from './publish'
import { makeSubscribe } from './subscribe'

import type { JanusJS } from 'janus-gateway-ts'
import type { Readable } from 'svelte/store'

import type { PublishSpec } from './publish/factory'
import type { PluginHandle, Handle } from '$lib/attach'
import type { Peers } from './subscribe'

export const VIDEO_ROOM = 'janus.plugin.videoroom'

export type RoomId = number
export type DisplayName = string | undefined
export type RoomPin = string | undefined

/**
 * The properties exposed when the component attached
 */
export type AttachEvent = {
  publish: InitPublish
  peers: Readable<Peers>
}

/**
 * Our parameters for how to join a room. Both username and pin are optional
 */
export type RoomOptions = {
  room: number
  pin?: string
  username?: string
}

/**
 * This is the type we receive in the `publishers` payload of a join response
 */
export type Publisher = {
  id: number
  display?: string
  talking?: boolean
  video_codec?: string
  audio_codec?: string
}

/**
 * The structure of messages received from VideoRoom
 */
export type Message = {
  videoroom: string
  id?: string
  description?: string
  private_id?: string
  publishers?: Publisher[]
  room?: number
  unpublished?: number
  leaving?: number
  error?: string
  error_code?: number
}

/**
 * The signature of the function to initialise a publish handle
 */
export type InitPublish = (opaqueId: string) => Promise<PluginHandle<PublishSpec>>

/**
 * The signature of the function to initialise a subscribe handle
 */
export type InitSubscribe = (opaqueId: string, feedId: number) => Promise<PluginHandle<{ room: number }>>

/**
 * Composite type of the two functions above
 */
export type HandleFactory = {
  publish: InitPublish
  subscribe: InitSubscribe
}

/**
 * When joining a room, you can join either as a publisher or subsriber.
 * If subscriber, the feed identifier to which you're subscribing must be given.
 */
export type JoinOptions =
  | {
      ptype: 'publisher'
    }
  | {
      ptype: 'subscriber'
      feed: number
    }

/**
 * Generic function signature for attaching a new handle
 */
export type MakeHandle = <T>(
  opaqueId: string,
  options: JoinOptions,
  makePlugin: (handle: Handle, msg: Message, jsep: JanusJS.JSEP) => T,
) => Promise<PluginHandle<T>>

/**
 * Factory function for generating a HandleFactory function. A factory factory, if you will.
 */
export default function (janus: JanusJS.Janus, { room, pin, username }: RoomOptions): HandleFactory {
  // we prepare and cache this for all future requests, since these details won't change
  const joinRequest: JanusJS.PluginMessage['message'] = {
    request: 'join',
    room: parseInt(`${room}`),
  }

  if (pin) {
    joinRequest.pin = pin
  }

  if (username) {
    joinRequest.display = username
  }

  // generate our attach function for this plugin
  const attach = prepareAttach(janus, VIDEO_ROOM)

  // prepare our handle-make function
  const make: MakeHandle = async (opaqueId, options, makePlugin) =>
    new Promise((resolve, reject) => {
      let resolved = false

      // request a new Janus handle: this will throw an error if it fails
      attach(opaqueId)
        .then(handle => {
          handle.on('message', (_, message: Message, jsep) => {
            if (resolved) {
              return
            }
            resolved = true

            if ('error' in message) {
              reject({ message: message.error, code: message.error_code })
            } else {
              resolve({ handle, plugin: makePlugin(handle, message, jsep) })
            }
          })

          // on attach, send our join request
          handle.send({
            message: {
              ...options,
              ...joinRequest,
              data: true,
              offer_data: true,
            },
          })
        })
        .catch(reject)
    })

  // factory our specific types of handles
  const publish = makePublish(make)
  const subscribe = makeSubscribe(make)

  return { subscribe, publish }
}

// utils

export * as Pub from './publish'
export * as Sub from './subscribe'

// components

export { default as VideoRoom } from './index.svelte'
export { Publish } from './publish'
export { Peer } from './subscribe'
