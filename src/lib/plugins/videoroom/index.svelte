<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import { writable } from 'svelte/store'
  import Janus from 'janus-gateway-ts'

  import makeMakeHandle from '.'
  import { markAsEnded, putPeers } from './subscribe'

  import type { JanusJS } from 'janus-gateway-ts'
  import type { Readable } from 'svelte/store'

  import type { Message, Publisher } from '.'
  import type { Peers } from './subscribe'
  import type { PluginHandle } from '../../plugins/attach'
  import type { PublishSpec } from './publish/factory'

  // the janus connection we're using
  export let janus: JanusJS.Janus

  // the room connection details
  export let username: string = undefined
  export let room: number
  export let pin: string = undefined

  // generate publish and subscribe helpers
  const { publish, subscribe } = makeMakeHandle(janus, { room, pin, username })

  const dispatch = createEventDispatcher()

  // our core handle is the one that's going to maintain a watch out for consumer connections, and will mutate our list
  // of available feeds accordingly. It uses the 'publisher' ptype, but it doesn't actually utilise it. The actual
  // publish will be left to the Publish component.
  let core: PluginHandle<PublishSpec>

  // if something goes wrong in init, drop the output here
  let error: any

  // our store of peers
  const peerStore = writable<Peers>({})

  // a Readable-only version of our peer store that we can push to the slot
  const peers: Readable<Peers> = {
    subscribe: peerStore.subscribe
  }

  /**
   * Utility function for updating our peers list
   */
  function updatePeers(publishers: Publisher[]) {
    if (publishers && publishers.length) {
      peerStore.update(putPeers(subscribe, publishers))
      publishers.forEach(p => dispatch('join', p))
    }
  }

  async function mount() {
    // generate our core (manager) plugin handle
    core = await publish(Janus.randomString(12))

    // handle any publishers already in the room
    updatePeers(core.plugin.initPublishers)
    delete core.plugin.initPublishers


    core.handle.on('message', (_, message: Message) => {
      // if we're notified of publishers, update accordingly
      if ('publishers' in message) {
        updatePeers(message.publishers)
      }

      // if we're notified of a publisher hangup, mark them as ended

      if ('unpublished' in message) {
        peerStore.update(markAsEnded(message.unpublished))
        dispatch('leave', message.unpublished)
      }
      if ('leaving' in message) {
        peerStore.update(markAsEnded(message.leaving))
        dispatch('leave', message.leaving)
      }
    })

    dispatch('attach', { publish, peers })
  }

  onMount(async () => {
    try {
      await mount()
    } catch (e) {
      error = e
      dispatch('error', e)
    }
  })

</script>

{#if core}
  <slot {publish} peers={$peers} />
{:else if error}
  <slot name="error" {error} />
{/if}