# janus-svelte

A [Svelte](https://svelte.dev) wrapper to interact with [MeetEcho's Janus Gateway](https://janus.conf.meetecho.com).

Fully typescript-compatible.

## Installation

Available now at an npm near you:

```
npm i janus-svelte
```
or
```
yarn add janus-svelte
```
or
```
git clone git@github.com:emdienn/janus-svelte.git
```

## Motivation

The javascript SDK for Janus, while comprehensive and powerful, can be very indimiating at first blush. This package
seeks to _svelte-ify_ and simplify the DX of interacting with Janus, hopefully without sacrificing too much flexibility
and power in the process. Out of the gate it won't be feature-complete with all of Janus' plugins, but they'll hopefully
get covered over time if there's interest and need.

janus-svelte is entirely unopinionated about markup and style; with exceptions of a few components like
`<J.Utils.Video />`, components are purely functional in nature and don't contribute to the DOM - it's up to your to
build your app how you want it.

## Code Structure

### Svelte Components as Wrappers

Each functional component in janus-svelte is backed by a corresponding set of helper functions in an adjacent ts/js
file. The motivation here is that if you need the flexibility to ignore the `<Component />` and just go directly for the
code, you can do that: the components are simply svelte wrappers around those functions, exposing data via nested slots
and event dispatches (as we'll see in the examples below.)

 * The `server/` directory contains the core connection component.
 * The `plugins/` directory contains a subdirectory for each implemented plugin, each containing one or more components
   depending on the plugin's complexity.
 * The `utils/` directory contains components and scripts that are common to all components.

### One-Stop Import

For ease of use, all components are exposed at the top level of the package, so you can just import everything from the
library to make it available like so:

```html
<script>
  import * as J from 'janus-svelte'
</script>
```

This does result in some long namespace chains, however, so for brevity, it's recommended that if you're drilling into
plugin types and/or behaviours, to alias the plugin directly:

```html
<script>
  import * as J from 'janus-svelte'
  import * as VR from 'janus-svelte/plugins/videoroom'

  // these both point to the same type
  let foo: J.Plugins.VideoRoom.Pub.VideoOffer
  let bar: VR.Pub.VideoOffer
</script>
```

The main plugin components, though, are explicitly exported at the top level:
```html
<script>
  import * as J from 'janus-svelte'
</script>

<J.VideoRoom>
  <!-- your implementation here -->
</J.VideoRoom>

```


### Slots and Events

Wherever possible, functional components expose properties both via slots and events. This enables you to handle those
variables in the way best served by your application.

```html
<script lang="ts">
  import * as J from 'janus-svelte'
  import type { JanusJS } from 'janus-gateway-ts'

  let janus: JanusJS.Janus
  let room: number
  let username: string
  let pin: string

  function handleAttach(e: CustomEvent<J.VideoRoomAttachEvent>) {
    // note how these properties here match
    // those being `let:` on the default component slot
    const { peers, publish } = e.detail
  }

  function handleError(e: CustomEvent) {
    // this error corresponds to the one exposed in the error slot
    const error = e.detail
  }

</script>

<J.VideoRoom {janus} {room} {username} {pin} let:publish let:peers
  on:attach={handleAttach} on:error={handleError}
>
  <div slot="error" let:error>
    <h1>Room Join Failed</h1>
    <pre>{JSON.stringify(error, null, 2)}</pre>
  </div>

  <h2>Joined room {room}</h2>
  <!-- you could do something with `publish` and `peers` here -->
</J.VideoRoom>
```
## Core Component Reference

These are pretty copy-paste-able: obviously fill out things like your server and your room credentials, but for the most
part this is all functional code.

### Server

```html
<script lang="ts">
  import * as J from 'janus-svelte
  import type { JanusJS } from 'janus-gateway-ts'

  // to whence are you connecting
  let server: string | string[]

  // how verbose should the console be
  let debug: boolean | "all" | JanusJS.DebugLevel[]

  function handleConnect(e: CustomEvent<JanusJS.Janus>) {
    const janus = e.detail

    // you now have code access to your janus connection,
    // if that's something you need
  }

  function handleError(e: CustomEvent) {
    console.error(e.detail)
  }

</script>

<J.Server {server} {debug} let:janus
  on:connect={handleConnect} on:error={handleError}
>
  <div slot="error" let:error>
    <h2>[ERROR {error.code}] {error.message}</h2>
  </div>

  <!-- init room components here with your `janus` variable -->
</J.Server>
```

### TextRoom

```html
<script lang="ts">
  import * as J from 'janus-svelte'

  // room ID, as known by Janus
  let room: number

  // room pin, if set in Janus
  let pin: string | undefined

  // username is NOT optional for textroom
  let username: string

  // display name, however, IS optional
  let display: string | undefined

  function handleAttach(e: CustomEvent<J.Plugins.TextRoom.AttachEvent>) {
    const { on, send, peers } = e.detail

    // peers is a Readable store of Participants
    peers.subscribe(peers => {
      console.log('peers update', peers)
    })

    // on is a listener-attach function for application functionality
    on('data', (handle, data) => {
      console.log('received data', data)
    })

    // send abstracts message sending
    // note that `to` and `tos` are mutually exclusive, and if neither
    // is specified, the message will be broadcast to the whole room
    send({
      text: 'a message to be read',
      // either use `to`...
      to: 'recipient-username',
      // ...OR `tos` - not both
      tos: [ 'recipientA', 'recipientB' ]
    })
  }

</script>

<J.Server server="my.janus.dev" debug="all" let:janus>
  <J.TextRoom {janus} {room} {username} {pin} let:on let:send let:peers
    on:attach={handleAttach}
  >
    <div slot="error" let:error>
      <h2>[ERROR {error.code}] {error.message}</h2>
    </div>

    <h2>Text Room {room} joined</h2>

    <button on:click={() => send('hello world!')}>Send to all</button>

  </J.TextRoom>
</J.Server>
```

### VideoRoom

```html
<script lang="ts">
  import * as J from 'janus-svelte'
  import * as VR from 'janus-svelte/plugins/videoroom'

  let room: number
  let username: string | undefined
  let pin: string | undefined

  let videoOffer: VR.Pub.VideoOffer
  let audioOffer: VR.Pub.AudioOffer

  async function handleRoomAttach(e: CustomEvent<VR.AttachEvent>) {
    const { peers, publish } = e.detail

    // publish is a function that accepts an opaqueId and
    // returns a promise of a PluginHandle
    const { plugin, handle } = await publish('random-string')

    // peers is a Readable store of Publishers
    peers.subscribe(peers => {
      console.log('peers update', peers)
    })
  }

  function handlePeerJoin(e: CustomEvent<VR.Publisher>) {
    // if you subscribe to the `peers` store, you don't really need this, but
    // it is included for completeness
    const publisher = e.detail
  }

  function handlePeerLeave(e: CustomEvent<number>) {
    // the ID of a departing peer - as with join, if you're subscribed to the
    // peer store you don't so much need this
    const peerId = e.detail
  }

  function handlePublishAttach(e: CustomEvent<string>) {
    // you'll want this for filtering out your own feed
    const localFeedId = e.detail
  }

  function handleLocalStream(e: CustomEvent<MediaStream>) {
    // any time the local media stream changes, this event will fire
    const localMediaStream = e.detail
  }

  function handleRemoteStream(e: CustomEvent<{ peer: VR.Sub.PeerModel }>) {
    const { peer } = e.detail
  }

</script>

<J.Server server="my.janus.dev" debug="all" let:janus>
  <J.VideoRoom {janus} {room} {username} {pin} let:publish let:peers
    on:attach={handleRoomAttach} on:error={handleError}
    on:join={handlePeerJoin} on:leave={handlePeerLeave}
  >
    <div slot="error" let:error>
      <h2>[ERROR {error.code}] {error.message}</h2>
    </div>

    <h2>Video room {room} joined</h2>

    <VR.Publish {publish} {videoOffer} {audioOffer} let:stream
      on:attach={handlePublishAttach} on:localstream={handleLocalStream}
    >
      <!-- this binds a <video /> element, you can see your face now! -->
      <J.Utils.Video {stream} />
    </VR.Publish>

    <!-- iterating and filtering $peers -->
      <!-- the Peer component will actively subscribe to the peer feed -->
      <VR.Peer peer={$peers[n]} let:stream let:meta
        on:remotestream={handleRemoteStream}
      >
        <div slot="error" let:error>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>

        <!-- view the remote feed with a video element -->
        <J.Utils.Video {stream} />
        <!-- meta is a Readable store -->

      </VR.Peer>
    <!-- /iteration -->

  </J.VideoRoom>
</J.Server>
```

## Code Walkthrough

### 0. Connect to Janus

```html
<script lang="ts">
  import * as J from 'janus-svelte'

  // tell it where to connect
  const server = 'wss://my-janus-server.com'

  // show all debug messages in console; omit this for production
  const debug = 'all'

  // janus-svelte exposes errors both as named slots and as dispatched events,
  // so you can handle the effects either in code or in JSX...or both, it's your
  // call.
  function handleError(e) {
    // display the error in the console
    console.error(e)
  }

</script>

<J.Server {server} {debug} let:janus on:error={handleError}>
  <!-- display the error on the page -->
  <div slot="error" let:error>
    <h1>Connection Failed</h1>
    <pre>{JSON.stringify(error, null, 2)}</pre>
  </div>

  <h1>Connected to {janus.getServer()}</h1>
</J.Server>
```

### 1. Join a VideoRoom

```html
<script lang="ts">
  import * as J from 'janus-svelte'

  const server = 'wss://my-janus-server.com'
  const debug = 'all'

  // we need to specify the room we're joining
  const room = 1234
  const username = 'Mateo'

  // (the default demo room has no password)
  const pin: string = undefined

  function handleError(e) {
    console.error(e)
  }

</script>

<J.Server {server} {debug} let:janus on:error={handleError}>
  <div slot="error" let:error>
    <h1>Connection Failed</h1>
    <pre>{JSON.stringify(error, null, 2)}</pre>
  </div>

  <h1>Connected to {janus.getServer()}</h1>

  <!-- The VideoRoom component will auto-join the room we specify -->
  <J.VideoRoom {janus} {room} {username} {pin} let:publish let:peers
    on:error={handleError}
  >
    <div slot="error" let:error>
      <h1>Room Join Failed</h1>
      <pre>{JSON.stringify(error, null, 2)}</pre>
    </div>

    <h2>Joined room {room}</h2>

  </J.VideoRoom>
</J.Server>
```

### 2. Publish a Feed

```html
<script lang="ts">
  import * as J from 'janus-svelte'

  const server = 'wss://my-janus-server.com'
  const debug = 'all'
  const room = 1234
  const username = 'Mateo'
  const pin: string = undefined

  // we specify that we want to send video and audio
  const videoOffer: J.VideoRoom.VideoOffer = 'stdres-16:9'
  const audioOffer: J.VideoRoom.AudioOffer = true

  // create a spot to put our local feed ID
  let localFeedId: number

  function handleError(e: CustomEvent<any>) {
    console.error(e)
  }

  // when our publisher attaches, we want to capture its feed ID
  function handlePublishAttach({ detail: feedId }: CustomEvent<number>) {
    localFeedId = feedId
  }

</script>

<J.Server {server} {debug} let:janus on:error={handleError}>
  <div slot="error" let:error>
    <h1>Connection Failed</h1>
    <pre>{JSON.stringify(error, null, 2)}</pre>
  </div>

  <h1>Connected to {janus.getServer()}</h1>


  <J.VideoRoom {janus} {room} {username} {pin} let:publish let:peers
    on:error={handleError}
  >
    <div slot="error" let:error>
      <h1>Room Join Failed</h1>
      <pre>{JSON.stringify(error, null, 2)}</pre>
    </div>

    <h2>Joined room {room}</h2>

    <J.VideoRoom.Publish {publish} {videoOffer} {audioOffer} let:stream
      on:attach={handlePublishAttach}
    >
      <p>Publish {localFeedId}</p>

      <!-- show our local stream on the page so we can see ourselves -->
      <J.Video {stream} />

    </J.VideoRoom.Publish>

  </J.VideoRoom>
</J.Server>
```

### 3. Subscribe to Peers

```html
<script lang="ts">
  import * as J from 'janus-svelte'
  import { get } from 'svelte/store'

  const server = 'wss://my-janus-server.com'
  const debug = 'all'
  const room = 1234
  const username = 'Mateo'
  const pin: string = undefined
  const videoOffer: J.VideoRoom.VideoOffer = 'stdres-16:9'
  const audioOffer: J.VideoRoom.AudioOffer = true
  let localFeedId: number

  function handleError(e: CustomEvent<any>) {
    console.error(e)
  }

  function peerFilter(peer: J.Plugins.VideoRoom.Sub.PeerModel) {
    return !peer.ended && get(peer.meta).display !== username
  }

</script>

<J.Server {server} {debug} let:janus on:error={handleError}>
  <div slot="error" let:error>
    <h1>Connection Failed</h1>
    <pre>{JSON.stringify(error, null, 2)}</pre>
  </div>

  <h1>Connected to {janus.getServer()}</h1>


  <J.VideoRoom {janus} {room} {username} {pin} let:publish let:peers
    on:error={handleError}
  >
    <div slot="error" let:error>
      <h1>Room Join Failed</h1>
      <pre>{JSON.stringify(error, null, 2)}</pre>
    </div>

    <h2>Joined room {room}</h2>

    <J.Plugins.VideoRoom.Publish {publish} {videoOffer} {audioOffer} let:stream>
      <p>Publish {localFeedId}</p>
      <J.Video {stream} />
    </J.Plugins.VideoRoom.Publish>

    <!-- filter out our own feed, otherwise we subscribe to ourselves -->
    {#each Object.entries(peers).filter(peerFilter) as peer}
      <!-- accept the connection with a Peer component -->
      <J.Plugins.VideoRoom.Peer {peer} let:stream let:meta>
        <p>Peer: {meta.display}</p>
        <!-- and show the feed on the page -->
        <J.Utils.Video {stream} />
      </J.Plugins.VideoRoom.Peer>
    {/each}

  </J.VideoRoom>
</J.Server>
```

## Bugs and Issues

Please use [Github Issues](https://github.com/emdienn/janus-svelte.git) to report any bugs or problems.

Please note that
this package depends heavily on both Janus Gateway (as the backend service) and the javascript/typescript generously
provided by [meetecho](https://github.com/meetecho/janus-gateway) and [notedit](janus-ts). Issues in those underpinning
libraries and/or general Janus usage aren't supported, so please endeavour to ensure that you're submitting an issue for
this package specifically, and not an issue in one of those.

## License

MIT