import type { PluginHandle } from 'janus-svelte/plugins/attach'
import type { JanusJS } from 'janus-gateway-ts'
import type { MakeHandle, Publisher } from '..'

/**
 * Janus-specific resolution spec strings, for convenience.
 * Using these strings will utilise the client'sdefault video device.
 */
export type VideoResolution = 'lowres' | 'lowres-16:9' | 'stdres' | 'stdres-16:9' | 'hires' | 'hires-16:9'

/**
 * Offer an exact deviceId - applicable to both video and audio
 */
export type DeviceOffer = { deviceId: { exact: string } }

/**
 * A video offer can be false ("muted"), true ("use default"), a resolution, or an exact device ID
 */
export type VideoOffer = boolean | VideoResolution | DeviceOffer

/**
 * An audio offer can be false ("muted"), true ("use default"), or an exact device ID
 */
export type AudioOffer = boolean | DeviceOffer

/**
 * An offer can have one or both of video and audio offers
 */
export type Offer = (offer: { video?: VideoOffer; audio?: AudioOffer }) => void

/**
 * The structure of extra data / functionality attached to our Publisher PluginHandle
 */
export type PublishSpec = {
  room: number
  offer: Offer
  id?: number
  privateId?: number
  initPublishers?: Publisher[]
}

/**
 * In publisher mode, we always want data, and we never want to receive media
 */
const mediaTemplate = () => ({
  videoRecv: false,
  audioRecv: false,
  data: true,
})

/**
 * Publisher factory function
 */
export default function (make: MakeHandle) {
  /**
   * Generate a publisher
   */
  return async function (opaqueId: string): Promise<PluginHandle<PublishSpec>> {
    // we debounce offers, because if multiple come in rapid succession (ie. within the time it takes to perform a
    // round-trip to the janus server), the latter will clobber the former. By debouncing, we collate changes then send
    // them all in one packet
    let debounce: NodeJS.Timeout

    // prepare our template
    let media: Record<string, unknown> = mediaTemplate()

    // generate our publisher handle
    const publisher = await make(
      opaqueId,
      { ptype: 'publisher' },
      (_, { id, room, private_id, publishers }) =>
        ({
          id: parseInt(id),
          privateId: parseInt(private_id),
          initPublishers: publishers,
          room,
          offer: offer => {
            // clear any previous debounce pending
            if (debounce) {
              clearTimeout(debounce)
            }

            // handle audio change
            if ('audio' in offer) {
              // handle mute
              if (offer.audio === false) {
                media.removeAudio = true
                media.audioSend = false
                delete media.replaceAudio
                delete media.audio
              } else {
                // handle unmute / change source
                media.audio = offer.audio
                media.audioSend = true
                media.replaceAudio = true
                delete media.removeAudio
              }
            }

            // handle video change
            if ('video' in offer) {
              // handle mute
              if (offer.video === false) {
                media.removeVideo = true
                media.videoSend = false
                delete media.replaceVideo
                delete media.video
              } else {
                // handle unmute / change source
                media.video = offer.video
                media.videoSend = true
                media.replaceVideo = true
                delete media.removeVideo
              }
            }

            debounce = setTimeout(() => {
              // protect against janus assuming we want to send media when we actually don't
              if (!('video' in media)) {
                media.video = false
              }

              if (!('audio' in media)) {
                media.audio = false
              }

              const offer: Record<string, unknown> = { media }

              // TODO: handle simulcast options

              // if ('simulcast' in opts) {
              //   offer.simulcast = opts.simulcast
              // }

              // if ('simulcast2' in opts) {
              //   offer.simulcast2 = opts.simulcast2
              // }

              publisher.handle.createOffer({
                ...offer,
                success: (jsep: JanusJS.JSEP) => {
                  // reset our template
                  media = mediaTemplate()

                  const message: JanusJS.PluginMessage['message'] = {
                    request: 'configure',
                    data: true,
                  }

                  // if we had audio, offer audio
                  if ('audio' in offer) {
                    message.audio = offer.audio ? true : false
                  }

                  // if we had video, offer video
                  if ('video' in offer) {
                    message.video = offer.video ? true : false
                  }

                  // finalise the transaction by sending our 'configure' message
                  publisher.handle.send({ jsep, message })
                },
              })
            }, 50)
          },
        } as PublishSpec),
    )

    return publisher
  }
}
