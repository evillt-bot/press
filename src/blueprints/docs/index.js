import Markdown from '@nuxt/markdown'
import { resolve, exists, join, readdirSync, readJsonSync, slugify, writeJson } from '../../utils'
import data from './data'

export default {
  // Include data loader
  data,
  enabled(options) {
    // Enable docs blueprint if srcDir/*.md files exists
    // or if the srcDir/docs/ folder exists
    return (
      readdirSync(this.options.srcDir).find(p => /\.md$/.test(p)) ||
      exists(this.options.srcDir, options.dir)
    )
  },
  templates: {
    'plugin': 'plugin.js',
    'layout': 'layout.vue',
    'toc': 'components/toc.vue',
    'index': 'pages/index.vue',
    'topic': 'pages/topic.vue'
  },
  routes(templates) {
    return [
      {
        name: 'docs_index',
        path: this.$press.docs.prefix,
        component: templates.index
      }
    ]
  },
  generateRoutes(data, prefix, staticRoot) {
    return [
      {
        route: prefix('index'),
        payload: require(`${staticRoot}/sources/docs/topics/index.json`)
      },
      ...Object.keys(data.sources).map(route => ({
        route,
        payload: require(`${staticRoot}/sources${route}`)
      }))
    ]
  },
  serverMiddleware({ options, rootId, id }) {
    const { index } = options.docs.api.call(this, { rootId, id })
    return [
      (req, res, next) => {
        if (req.url.startsWith('/api/docs/index')) {
          index(req, res, next)
        } else {
          next()
        }
      }
    ]
  },
  build: {
    before() {
      this.options.css.push(resolve('blueprints/docs/theme.css'))
    },
    async compile({ data }) {
      const pressJson = {
        toc: Object.keys(data.topLevel.index)
      }
      const pressJsonPath = join(this.options.srcDir, 'nuxt.press.json')
      if (!exists(pressJsonPath)) {
        await writeJson(pressJsonPath, pressJson, { spaces: 2 })
      }
    },
    done({ options }) {
      this.options.watch.push('~/*.md')
      this.options.watch.push(`~/${options.docs.dir}/*.md`)
    }
  },
  options: {
    dir: 'docs',
    prefix: '/docs',
    meta: {
      title: 'Documentation suite',
      github: 'https://github.com/...'
    },
    api({ rootId, id }) {
      const cache = {}
      const rootDir = join(this.options.buildDir, rootId, 'static')
      return {
        index: (req, res, next) => {
          if (this.options.dev || !cache.index) {
            cache.index = readJsonSync(rootDir, 'docs', 'index.json')
          }
          res.json(cache.index)
        }
      }
    },
    source: {
      markdown(source) {
        const md = new Markdown(source, {
          sanitize: false
        })
        return md.getTocAndMarkup()
      },
      path(fileName, { title, published }) {
        if (['index', 'README'].includes(fileName)) {
          return '/topics/index'
        }
        const slug = title.replace(/\s+/g, '-')
        return `/topics/${slugify(slug).toLowerCase()}`
      },
      title(fileName, body) {
        if (['index', 'README'].includes(fileName)) {
          return 'Intro'
        }
        return body.substr(body.indexOf('#')).match(/^#\s+(.*)/)[1]
      }
    }
  }
}
