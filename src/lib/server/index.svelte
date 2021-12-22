<script lang="ts">
  import { init } from './index'
  import { createEventDispatcher, onMount } from 'svelte'

  import type { JanusJS } from 'janus-gateway-ts'

  const dispatch = createEventDispatcher()

  export let server: JanusJS.ConstructorOptions['server']
  export let apisecret: JanusJS.ConstructorOptions['apisecret'] = undefined
  export let withCredentials: JanusJS.ConstructorOptions['withCredentials'] = undefined
  export let token: JanusJS.ConstructorOptions['token'] = undefined
  export let iceServers: JanusJS.ConstructorOptions['iceServers'] = undefined
  export let ipv6: JanusJS.ConstructorOptions['ipv6'] = undefined
  export let maxPollEvents: JanusJS.ConstructorOptions['max_poll_events'] = undefined
  export let debug: JanusJS.InitOptions['debug'] = undefined
  export let dependencies: JanusJS.InitOptions['dependencies'] = undefined

  let janus: JanusJS.Janus
  let error: Error

  // once the component mounts, attempt a connection to Janus with the configuration provided
  // on success, the slot will render and sub-components can mount
  onMount(async () => {
    try {
      janus = await init({ server, debug, dependencies, apisecret, iceServers, ipv6, maxPollEvents, token, withCredentials })
      dispatch('connect', janus)
    } catch (e) {
      // render our slot and dispatch our message
      error = e
      dispatch('error', e)
    }
  })

</script>

{#if janus}
  <slot {janus} />
{:else if error}
  <slot name="error" {error} />
{/if}
