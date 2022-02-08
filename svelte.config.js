import adapter from '@sveltejs/adapter-auto'
import path from 'path'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess(),

  kit: {
    adapter: adapter(),

    package: {
      exports: file => file === 'index.ts',
    },
    vite: {
      resolve: {
        alias: {
          'janus-svelte': path.resolve('src/lib'),
        },
      },
    },

    // hydrate the <div id="svelte"> element in src/app.html
    target: '#svelte',
  },
}

export default config
