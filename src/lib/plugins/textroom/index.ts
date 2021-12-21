import Janus from 'janus-gateway-ts'
import { writable } from 'svelte/store'

import prepareAttach from '../attach'

import type { JanusJS } from 'janus-gateway-ts'
import type { Updater, Writable } from 'svelte/store'

import type { PluginHandle } from '../attach'
import type { OneOf } from '../../utils/typing'

const TEXT_ROOM = 'janus.plugin.textroom'

export type Message = {
  textroom: string
  transaction: string
  participants?: Participant[]
  join?: string
  leave?: string
  room?: number
  from?: string
  date?: string
  text?: string
  username?: string
  display?: string
}

/**
 * The anatomy of a participant
 */
export type Participant = {
  username: string
  display: string
}

/**
 * The data we're holding regarding a participant
 */
export type PeerModelMeta = Participant & { [key: string]: any }

/**
 * What do we know about our neighbours, really?
 */
export type PeerModel = {
  meta: Writable<PeerModelMeta>
  ended?: true
}

/**
 * Peers get indexed by their username
 */
export type Peers = Record<string, PeerModel>

/**
 * Our payload must contain a text string, and then either one or neither of `to` or `tos`,
 * which are the username or usernames of recipients, respectively.
 */
export type Payload = {
  text: string
} & Partial<OneOf<[{ to: string }, { tos: string[] }]>>

/**
 * The signature of sending a data message
 */
export type Send = (payload: Payload) => void

/**
 * For a given opaqueId, generate a new plugin handle conforming to the TextRoom spec
 */
export type InitTextRoom = (opaqueId: string) => Promise<PluginHandle<{
  room: number
  send: Send
  initParticipants?: Participant[]
}>>

// this never changes, so why declare it into memory repeatedly?
const media = { video: false, audio: false, data: true }

export default function (janus: JanusJS.Janus, { room, pin = undefined, username }): InitTextRoom {

  // prepare our attach function for this plugin
  const attach = prepareAttach(janus, TEXT_ROOM)

  return (opaqueId: string) => new Promise(async (resolve, reject) => {

    // keep track of whether we've resolved our joining of the room or not
    let resolved = false

    // we need to match up our transaction ID from our join request when
    // validating the response
    let joinTxId: string

    // make a new Janus handle: this will throw an error if it fails
    const handle = await attach(opaqueId)

    // prepare a convenience send() function
    const send: Send = payload => {
      handle.data({
        text: JSON.stringify({
          ...payload,
          textroom: 'message',
          room: parseInt(room),
          transaction: Janus.randomString(12),
        })
      })
    }

    // always handle our JSEP handshakes
    handle.on('message', (_, __, jsep) => {
      if (jsep) {
        handle.createAnswer({
          jsep,
          media,
          success: (jsep: JanusJS.JSEP) => {
            // acknowledge the JSEP we just received
            handle.send({ message: { request: 'ack' }, jsep })
          }
        })
      }
    })

    handle.on('data', (_, data) => {

      // if we receive a successful response from our join request, resolve
      if (!resolved && data.textroom === 'success' && data.transaction == joinTxId) {
        resolved = true
        resolve({
          handle,
          plugin: { room, send, initParticipants: data.participants },
        })
      }
    })

    // once the data channel opens, request to join the room proper
    handle.on('dataopen', () => {

      // set the transaction ID for our join request
      joinTxId = Janus.randomString(12)

      // build the payload
      const join: any = {
        textroom: 'join',
        transaction: joinTxId,
        room: parseInt(room),
        username,
        display: username
      }

      // set password if there is one
      if (pin) {
        join.pin = pin
      }

      handle.data({
        text: JSON.stringify(join),
        // if something goes wrong, abort mission
        error: reject,
      })
    })

    // fire off an init request
    handle.send({
      message: {
        request: 'setup',
      },
    })
  })
}

/**
 * Helper function for updating a store of Peers, inserting the given participants into the store
 */
export function putPeers(participants: Participant[]): Updater<Peers> {
  return function (peers: Peers) {
    participants.forEach(p => peers[p.username] = {
      meta: writable<PeerModelMeta>({
        username: p.username,
        display: p.display,
      })
    })
    return peers
  }
}

/**
 * Helper function for updating a store of Peers, removing a particular peer because they have 'ended'.
 *
 * This behaviour is distinctly different from VideoRoom - here, we can simply delete the participant.
 */
export function markAsEnded(username: string): Updater<Peers> {
  return function (peers: Peers) {
    if (username in peers) {
      delete peers[username]
    }
    return peers
  }
}



// components

export { default as TextRoom } from './index.svelte'

