import Janus from 'janus-gateway-ts'

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
type ListDeviceConfig = { audio?: boolean, video?: boolean }

/**
 * Signature for Janus' listDevices function (missing from library TS)
 */
type ListDevices = (callback: (devices: MediaDeviceInfo[]) => void, config?: ListDeviceConfig) => void

/**
 * The return structure of the ListDevices function
 */
export type SelectedDevices = { audio?: Id, video?: Id }

/**
 * Index devices as lists according to their kind
 */
export type Devices = Record<'videoinput' | 'audioinput', MediaDeviceInfo[]>

/**
 * For sanity's sake, explicitly declare this trivial type
 */
export type Id = string

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
  let listDevices: ListDevices = (Janus as any).listDevices

  return new Promise(resolve => listDevices(devices => {
    // for each 'videoinput' or 'audioinput' device found, push them onto their respective list
    devices.forEach(d => {
      if (d.kind in inputs) {
        inputs[d.kind].push(d)
      }
    })

    // resolve our inputs now we've enumerated them
    resolve(inputs)
  }))
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
const getDeviceId = (tracks: MediaStreamTrack[]) => tracks && tracks.length
  ? tracks[0].getSettings().deviceId
  : null

