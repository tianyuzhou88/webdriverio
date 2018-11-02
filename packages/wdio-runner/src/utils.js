import merge from 'deepmerge'
import logger from 'wdio-logger'
import { remote, multiremote } from 'webdriverio'
import { initialisePlugin } from 'wdio-config'

const log = logger('wdio-local-runner:utils')

const MERGE_OPTIONS = { clone: false }

/**
 * run before/after session hook
 */
export function runHook (hookName, config, caps, specs) {
    const catchFn = (e) => log.error(`Error in ${hookName}: ${e.stack}`)

    return Promise.all(config[hookName].map((hook) => {
        try {
            return hook(config, caps, specs)
        } catch (e) {
            return catchFn(e)
        }
    })).catch(catchFn)
}

/**
 * initialise services based on configuration
 * @param  {Object}    config  of running session
 * @return {Object[]}          list of service classes that got initialised
 */
export function initialiseServices (config) {
    const initialisedServices = []

    if (!Array.isArray(config.services)) {
        return initialisedServices
    }

    for (let serviceName of config.services) {
        /**
         * allow custom services that are already initialised
         */
        if (typeof serviceName === 'object') {
            log.debug(`initialise custom service "${serviceName}"`)
            initialisedServices.push(serviceName)
            continue
        }

        log.debug(`initialise wdio service "${serviceName}"`)
        const Service = initialisePlugin(serviceName, 'service')
        initialisedServices.push(new Service(config, this.caps))
    }

    return initialisedServices
}

/**
 * initialise browser instance depending whether remote or multiremote is requested
 */
export async function initialiseInstance (config, capabilities, isMultiremote) {
    if (!isMultiremote) {
        log.debug('init remote session')
        config.capabilities = capabilities
        return remote(config)
    }

    const options = {}
    log.debug('init multiremote session')
    for (let browserName of Object.keys(capabilities)) {
        options[browserName] = merge(config, capabilities[browserName], MERGE_OPTIONS)
    }

    const browser = await multiremote(options)
    for (let browserName of Object.keys(capabilities)) {
        global[browserName] = browser[browserName]
    }

    return browser
}
