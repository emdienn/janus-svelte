<script lang="ts">
  import Janus from 'janus-gateway-ts'

  // the media stream we're going to show
  export let stream: MediaStream

  // binding for our video element
  let video: HTMLVideoElement

  // flag for whether we're going to listen to the next window click
  let needClick = false

  /**
   * Gracefully handle a failure to auto-play. If it fails, the window click
   * listener will attempt again on the first interaction.
   */
  async function play() {
    if (!video) {
      return
    }
    try {
      await video.play()
      needClick = false
    } catch (e) {
      needClick = true
    }
  }

  $: if (stream && video) {
    // attach our media stream to the video element
    Janus.attachMediaStream(video, stream)
    // attempt an auto-play
    play()
  }
</script>

<svelte:window on:click={() => needClick && play()} />

<video on:click={() => video.play()} bind:this={video}>
  <track kind="captions" />
</video>
