<script lang="ts">
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import Janus from 'janus-gateway-ts'

  import makeMakeHandle from '.'
  import { markAsEnded, putPeers } from './subscribe'

  import type { JanusJS } from 'janus-gateway-ts'
  import type { Readable } from 'svelte/store'

  import type { Message } from '.'
  import type { Peers } from './subscribe'
  import type { PluginHandle } from 'janus-svelte/plugins/attach'

  // the janus connection we're using
  export let janus: JanusJS.Janus

  // the room connection details
  export let username: string
  export let room: number
  export let pin: string = undefined

  // generate publish and subscribe helpers
  const { publish, subscribe } = makeMakeHandle(janus, { room, pin, username })


  // our core handle is the one that's going to maintain a watch out for consumer connections, and will mutate our list
  // of available feeds accordingly. It uses the 'publisher' ptype, but it doesn't actually utilise it. The actual
  // publish will be left to the Publish component.
  let core: PluginHandle<{ room: number }>

  // our store of peers
  const peerStore = writable<Peers>({})

  // a Readable-only version of our peer store that we can push to the slot
  const peers: Readable<Peers> = {
    subscribe: peerStore.subscribe
  }

  onMount(async () => {
    // generate our core (manager) plugin handle
    core = await publish(Janus.randomString(12))

    core.handle.on('message', (handle, message: Message, jsep) => {
      // if we're notified of publishers, update accordingly
      if ('publishers' in message && message.publishers.length) {
        peerStore.update(putPeers(subscribe, message.publishers))
      }

      // if we're notified of a publisher hangup, mark them as ended

      if ('unpublished' in message) {
        peerStore.update(markAsEnded(message.unpublished))
      }
      if ('leaving' in message) {
        peerStore.update(markAsEnded(message.leaving))
      }
    })
  })

</script>

{#if core}
  <slot {publish} {peers} />
{/if}