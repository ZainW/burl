export default defineNuxtConfig({
  modules: [
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/content',
    'nuxt-og-image'
  ],

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  content: {
    database: {
      type: 'sqlite',
      filename: '.data/content.db'
    },
    build: {
      markdown: {
        toc: { searchDepth: 3 }
      }
    }
  },

  experimental: {
    asyncContext: true
  },

  compatibilityDate: '2024-12-29',

  nitro: {
    prerender: {
      routes: ['/'],
      crawlLinks: true,
      autoSubfolderIndex: false
    }
  },

  icon: {
    provider: 'iconify'
  },

  site: {
    url: 'https://burl.wania.app'
  },

  ogImage: {
    defaults: {
      component: 'OgImageDocs'
    }
  }
})
