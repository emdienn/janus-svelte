import Janus from 'janus-gateway-ts'
import { writable } from 'svelte/store'

import type { Writable, Updater } from 'svelte/store'
import type { PluginHandle } from '../../../plugins/attach'
import type { InitSubscribe, Message, Publisher } from '..'
import type { SubscribePluginHandle } from './factory'


/**
 * When we attach a subscriber, this is the structure into which we put its data
 */
export type PeerModel = {
  subscribe: () => Promise<SubscribePluginHandle>
  stream?: MediaStream
  meta: Writable<{
    display: string
    [key: string]: any
  }>
  codec?: {
    audio?: string
    video?: string
  }
  ended?: true
}

/**
 * Peers get indexed by their ID
 */
export type Peers = Record<number, PeerModel>


/**
 * Prepare a PeerModel for a given publisher, but don't actually perform the subscription: the application will decide
 * whether it wants to attach or not.
 */
function makePeer(initSub: InitSubscribe, { id, display, audio_codec, video_codec }: Publisher): PeerModel {

  const opaqueId = Janus.randomString(12)

  return {
    subscribe: () => initSub(opaqueId, id),
    meta: writable({
      display,
    }),
    codec: {
      video: video_codec,
      audio: audio_codec,
    }
  }
}

/**
 * Helper function for updating a store of Peers, inserting the given publishers into the store
 */
export function putPeers(initSub: InitSubscribe, publishers: Publisher[]): Updater<Peers> {
  return function (peers: Peers) {
    publishers.forEach(p => peers[p.id] = makePeer(initSub, p))
    return peers
  }
}

/**
 * Helper function for updating a store of Peers, marking a particular peer as 'ended' (which happens when that
 * publisher hangs up).
 *
 * In previous versions, we just deleted the publisher from the index, but this led to strange behaviour in svelte,
 * so instead we make the peer as ended, which can be used as a filter in the UI.
 */
export function markAsEnded(unpublished: number): Updater<Peers> {
  return function (peers: Peers) {
    if (unpublished in peers) {
      delete peers[unpublished].codec
      peers[unpublished].ended = true
    }
    return peers
  }
}

/**
 * For a given peer, actually perform the subscription to that peer.
 */
export async function mountSubscription(peer: PeerModel): Promise<PluginHandle<{ room: number }>> {

  // scope this so we have access to it as messages come in
  let remoteStream: MediaStream

  // attach a new handle for this subscriber
  const subscription = await peer.subscribe()

  /**
   * Analyse the remote stream for track info and update our meta accordingly
   */
  function updateMeta() {
    const video = remoteStream.getVideoTracks()
    const audio = remoteStream.getAudioTracks()

    peer.meta.update(meta => {
      meta.hasVideo = video && video.length && video[0].muted === false
      meta.hasAudio = audio && audio.length && audio[0].muted === false

      return meta
    })
  }

  // each time we get a remote stream event, refresh the meta
  subscription.handle.on('remotestream', (_, stream) => {
    remoteStream = stream
    peer.stream = stream
    updateMeta()
  })

  subscription.handle.on('message', (_, message: Message) => {
    switch (message.videoroom) {

      // we have successfully attached to the remote peer
      case 'attached':
        peer.meta.update(meta => {
          meta.attached = true
          return meta
        })
        break

      // "something" happened - in this case we're just interested in the 'configured' event,
      // as a trigger to refresh our meta
      case 'event':
        if ('configured' in message) {
          updateMeta()
        }
        break
    }

  })

  return subscription
}


export * as Factory from './factory'

// utils

export { default as makeSubscribe } from './factory'


// components

export { default as Peer } from './peer.svelte'