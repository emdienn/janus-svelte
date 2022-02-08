import Janus from 'janus-gateway-ts'
import { derived, writable } from 'svelte/store'

import type { Readable } from 'svelte/store'
import type { AudioOffer, VideoOffer } from '$lib/plugins/videoroom/publish'
import type { DeviceOffer } from '$lib/plugins/videoroom/publish/factory'

export { default as Selector } from './index.svelte'

/**
 * The payload of the attach event; exposes the refresh function to the caller
 */
export type SelectorAttachEvent = {
  refresh: () => Promise<void>
}

/**
 * The payload of a refresh event, listing the devices and those selected
 */
export type RefreshEvent = {
  devices: Devices
  selected: SelectedDevices
}

/**
 * Config option for which kinds of media to check and return
 */
type ListDeviceConfig = { audio?: boolean; video?: boolean }

/**
 * Signature for Janus' listDevices function (missing from library TS)
 */
type ListDevices = (callback: (devices: MediaDeviceInfo[]) => void, config?: ListDeviceConfig) => void

/**
 * The return structure of the ListDevices function
 */
export type SelectedDevices = { audio?: Id; video?: Id }

/**
 * Index devices as lists according to their kind
 */
export type Devices = Record<'videoinput' | 'audioinput', MediaDeviceInfo[]>

/**
 * For sanity's sake, explicitly declare this trivial type
 */
export type Id = string

export type Offer = VideoOffer | AudioOffer

export type OfferManager = {
  mute: () => void
  unmute: () => void
  setDeviceId: (deviceId: string) => void
  offer: Readable<DeviceOffer | false>
}

/**
 * Wrap up the logic for offer handling: `mute` will always set the offer to
 * false, otherwise it's a janus-compatible object structure with the deviceId
 */
export function setupOffer(initial: Offer | false): OfferManager {
  const make = ([exact, muted]: [string, boolean]): DeviceOffer | false => (muted ? false : { deviceId: { exact } })

  const id = writable<string>()
  const muted = writable<boolean>(initial === false)
  const offer = derived<[typeof id, typeof muted], DeviceOffer | false>([id, muted], make, initial as any) // eslint-disable-line

  function setDeviceId(deviceId: string) {
    id.set(deviceId)
  }

  function mute() {
    muted.set(false)
  }

  function unmute() {
    muted.set(true)
  }

  return {
    mute,
    unmute,
    setDeviceId,
    offer,
  }
}

/**
 * A promisified wrapper around Janus' listDevices() function
 */
export async function listDevices(): Promise<Devices> {
  const inputs: Devices = {
    videoinput: [],
    audioinput: [],
  }

  // this will occur if Janus hasn't been initialised - return nothing rather than panic
  if (!('listDevices' in Janus)) {
    return inputs
  }

  // typecast this, because library limitations
  const listDevices: ListDevices = (Janus as any).listDevices // eslint-disable-line

  return new Promise(resolve =>
    listDevices(devices => {
      // for each 'videoinput' or 'audioinput' device found, push them onto their respective list
      devices.forEach(d => {
        if (d.kind in inputs) {
          inputs[d.kind].push(d)
        }
      })

      // resolve our inputs now we've enumerated them
      resolve(inputs)
    }),
  )
}

/**
 * Helper function to extract the device IDs of the requested device types of the given media stream
 */
export function getDeviceIdsFromLocalStream(localStream: MediaStream, config?: ListDeviceConfig): SelectedDevices {
  const devices: SelectedDevices = {}

  if (!config) {
    config = { audio: true, video: true }
  }

  if (config.audio) {
    devices.audio = localStream ? getDeviceId(localStream.getAudioTracks()) : null
  }

  if (config.video) {
    devices.video = localStream ? getDeviceId(localStream.getVideoTracks()) : null
  }

  return devices
}

/**
 * Grab a device ID from a set of media stream tracks.
 */
const getDeviceId = (tracks: MediaStreamTrack[]) => (tracks && tracks.length ? tracks[0].getSettings().deviceId : null)
