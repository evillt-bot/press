#!/usr/bin/env node

const consola = require('consola')
const { NuxtCommand } = require('@nuxt/cli')
const cli = require('../dist/nuxt-press-cli')

NuxtCommand.run(cli)
