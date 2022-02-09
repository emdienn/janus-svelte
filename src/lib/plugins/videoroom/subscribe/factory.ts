import type { JanusJS } from 'janus-gateway-ts'
import type { PluginHandle } from '$lib/attach'
import type { MakeHandle } from '..'

export type SubscribePluginHandle = PluginHandle<{ room: number }>

type MakeSubscriber = (opaqueId: string, feedId: number) => Promise<SubscribePluginHandle>

/**
 * Attach a new subscriber handle
 */
export default function (make: MakeHandle): MakeSubscriber {
  return async function (opaqueId: string, feedId: number): Promise<SubscribePluginHandle> {
    return await make(opaqueId, { ptype: 'subscriber', feed: feedId }, (handle, { room }, jsep) => {
      if (jsep) {
        // reciprocate the handshake with a "yes please"
        handle.createAnswer({
          jsep,
          media: { audioSend: false, videoSend: false, data: true },

          // TODO: customizeSdp here

          success: (jsep: JanusJS.JSEP) => {
            // request that Janus start sending us the remote stream
            handle.send({
              jsep,
              message: {
                request: 'start',
                room,
              },
            })
          },
        })
      }

      return { room }
    })
  }
}
