<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { mountSubscription, PeerModel } from '.'

  // the peer model we're using for this feed
  export let peer: PeerModel

  const dispatch = createEventDispatcher()

  // the remote-feed media stream we will expose
  let stream: MediaStream

  // if our subscribe fails, capture the output here
  let error

  // extract these elements so we can push them to the slot
  let { meta, ended } = peer

  async function mount() {
    // create our subscriber handle
    const subscription = await mountSubscription(peer)

    // when we receive the remote stream, capture it
    subscription.handle.on('remotestream', (_, s) => {
      peer.stream = s
      stream = s
      dispatch('remotestream', { peer })
    })
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

{#if stream}
  <slot {stream} meta={$meta} {ended} />
{:else if error}
  <slot name="error" {error} />
{/if}
