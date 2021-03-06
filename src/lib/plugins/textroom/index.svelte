<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import Janus from 'janus-gateway-ts'

  import { connect, markAsEnded, putPeers } from '.'

  import type { JanusJS } from 'janus-gateway-ts'
  import type { Readable } from 'svelte/store'

  import type { Send, Peers, Message } from '.'
  import type { Event } from '$lib/attach'

  // the janus connection we're using
  export let janus: JanusJS.Janus

  // the room connection details
  export let room: number
  export let username: string
  export let display: string = undefined
  export let pin: string = undefined

  let on: Event
  let send: Send

  // if we fail to connect, capture the outcome
  let error

  const dispatch = createEventDispatcher()

  const makePluginHandle = connect(janus, { room, pin, username, display })

  // our store of peers
  const peerStore = writable<Peers>({})

  // a Readable-only version of our peer store that we can push into the slot
  const peers: Readable<Peers> = {
    subscribe: peerStore.subscribe,
  }

  async function mount() {
    const { handle, plugin } = await makePluginHandle(Janus.randomString(12))

    on = handle.on
    send = plugin.send

    // register our initial participants
    peerStore.update(putPeers(plugin.initParticipants))
    delete plugin.initParticipants

    handle.on('data', (_, data: Message) => {
      // if we're notified of participants, update accordingly
      if ('participants' in data && data.participants.length) {
        peerStore.update(putPeers(data.participants))
        data.participants.forEach(p => {
          dispatch('join', p)
        })
      }

      // if we're notified of a peer hangup, mark them as ended
      if (data.textroom === 'leave') {
        peerStore.update(markAsEnded(data.username))
        dispatch('leave', data.username)
      }

      // if we're notified of a peer join, add them to the index
      if (data.textroom === 'join') {
        const { username, display } = data
        peerStore.update(putPeers([{ username, display }]))
        dispatch('join', { username, display })
      }
    })

    dispatch('attach', { on, send, peers })
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

{#if on}
  <slot {on} {send} {peers} />
{:else if error}
  <slot name="error" {error} />
{/if}
