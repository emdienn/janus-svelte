import type { PluginHandle } from 'janus-svelte/plugins/attach'
import type { MakeHandle } from '..'

export type SubscribePluginHandle = PluginHandle<{ room: number }>

type MakeSubscriber = (opaqueId: string, feedId: number) => Promise<SubscribePluginHandle>

/**
 * Attach a new subscriber handle
 */
export default function (make: MakeHandle, room: number): MakeSubscriber {
  return async function (opaqueId: string, feedId: number): Promise<SubscribePluginHandle> {
    return await make(opaqueId, { ptype: 'subscriber', feed: feedId }, { room })
  }
}
