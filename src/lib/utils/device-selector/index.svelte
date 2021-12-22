<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'

  import { listDevices, getDeviceIdsFromLocalStream, SelectedDevices } from '.'

  import type { Devices } from '.'

  /**
 .* The local media stream, against which we will match for 'selected' devices.
   * Inherently, this means this component has a 1:1 relationship with a <Publish/> component
   */
  export let stream: MediaStream

  /**
   * Our local cache of devices found
   */
  let devices: Devices = {
    videoinput: [],
    audioinput: [],
  }

  /**
   * Our local cache of selected devices: one per type
   */
  let selected: SelectedDevices = {}

  // export this function, so the application can call refresh() if and when it wants to
  // I suppose this operates slightly differently to the other components which would dispatch an event onMount instead
  export const refresh = async () => {
    devices = await listDevices()
    selected = getDeviceIdsFromLocalStream(stream)
  }

  const dispatch = createEventDispatcher()

  onMount(refresh)

  // reactively dispatch any changes that occur in our selected sources
  $: if (selected.audio) { dispatch('changeAudioSource', selected.audio) }
  $: if (selected.video) { dispatch('changeVideoSource', selected.video) }
</script>

<slot {devices} {selected} {refresh} />
