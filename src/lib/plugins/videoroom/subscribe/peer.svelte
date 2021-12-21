<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { mountSubscription, PeerModel } from '.'

  // the peer model we're using for this feed
  export let peer: PeerModel

  const dispatch = createEventDispatcher()

  // the remote-feed media stream we will expose
  let stream: MediaStream

  // extract these elements so we can push them to the slot
  let { meta, ended } = peer

  onMount(async () => {
    // create our subscriber handle
    const subscription = await mountSubscription(peer)

    // when we receive the remote stream, capture it locally
    subscription.handle.on('remotestream', (handle, s) => {
      stream = s
      dispatch('remotestream', s)
    })
  })

</script>

{#if stream}
  <slot {stream} meta={$meta} {ended} />
{/if}