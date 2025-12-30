export default defineAppConfig({
  ui: {
    colors: {
      primary: 'violet',
      neutral: 'neutral'
    },
    footer: {
      slots: {
        root: 'border-t border-default',
        left: 'text-sm text-muted'
      }
    }
  },
  seo: {
    siteName: 'burl'
  },
  header: {
    title: 'burl',
    to: '/',
    search: true,
    colorMode: true,
    links: [
      {
        'icon': 'i-simple-icons-github',
        'to': 'https://github.com/ZainW/burl',
        'target': '_blank',
        'aria-label': 'GitHub'
      }
    ]
  },
  footer: {
    credits: `MIT-0 License`,
    colorMode: false,
    links: [
      {
        'icon': 'i-simple-icons-github',
        'to': 'https://github.com/ZainW/burl',
        'target': '_blank',
        'aria-label': 'burl on GitHub'
      }
    ]
  },
  toc: {
    title: 'On this page',
    bottom: {
      title: 'Community',
      edit: 'https://github.com/ZainW/burl/edit/master/packages/docs/content',
      links: [
        {
          icon: 'i-lucide-star',
          label: 'Star on GitHub',
          to: 'https://github.com/ZainW/burl',
          target: '_blank'
        },
        {
          icon: 'i-lucide-bug',
          label: 'Report an issue',
          to: 'https://github.com/ZainW/burl/issues',
          target: '_blank'
        }
      ]
    }
  }
})
