'use strict';

{
    let descriptionCache = {}
    let refreshTimer = null
    let pendingRefresh = null
    let isFirstLoad = true
    const DEBOUNCE_DELAY = 300

    function getConfig() {
        return HFS.getPluginConfig()
    }

    function wildcardToRegex(pattern) {
        const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
        return new RegExp('^' + escaped.replace(/\*/g, '.*') + '$', 'i')
    }

    function getPatternsFromConfig(configKey) {
        const cfg = getConfig()
        return String(cfg[configKey] || '')
            .split(/\r?\n/)
            .map(x => x.trim())
            .filter(Boolean)
            .map(pattern => ({
                pattern,
                regex: wildcardToRegex(pattern)
            }))
    }

    function getFirstMatchingIndex(name, patterns) {
        for (let i = 0; i < patterns.length; i++) {
            if (patterns[i].regex.test(name))
                return i
        }
        return -1
    }

    function shouldHandle() {
        const cfg = getConfig()
        if (cfg.scope === 'global') return true
        return (HFS.state.uri || '/') === '/'
    }

    function isCommentOrderEnabled() {
        const cfg = getConfig()
        return cfg.commentOrderEnabled === true
    }

    function getCurrentPath() {
        let path = '/'
        
        if (typeof window !== 'undefined' && window.location) {
            path = window.location.pathname || '/'
        }
        
        if (!path || path === '/') {
            path = HFS.state.uri || '/'
        }
        
        if (!path.startsWith('/')) {
            path = '/' + path
        }
        
        return path
    }

    async function loadDescriptionTags() {
        const currentPath = getCurrentPath()
        
        if (descriptionCache[currentPath]) {
            return descriptionCache[currentPath]
        }

        if (pendingRefresh && pendingRefresh.path === currentPath) {
            return pendingRefresh.promise
        }

        const promise = (async () => {
            try {
                let descUrl = currentPath
                if (!descUrl.endsWith('/')) {
                    descUrl += '/'
                }
                descUrl += 'DESCRIPT.ION'
                
                const response = await fetch(descUrl, {
                    signal: AbortSignal.timeout(5000)
                })
                
                if (!response.ok) {
                    descriptionCache[currentPath] = {}
                    return {}
                }
                
                const content = await response.text()
                const result = {}
                const lines = content.split(/\r?\n/)
                
                for (const line of lines) {
                    if (!line.trim()) continue
                    
                    const m =
                        line.match(/^"([^"]+)"\s+(.+)$/) ||
                        line.match(/^(\S[^\r\n]*?)\s+(.+)$/)

                    if (!m) continue

                    const filename = m[1].trim()
                    const comment = m[2].trim()
                    const tag = comment.split(/\s+/)[0]

                    if (tag) {
                        result[filename] = tag
                    }
                }
                
                descriptionCache[currentPath] = result
                return result
            }
            catch (err) {
                descriptionCache[currentPath] = {}
                return {}
            }
            finally {
                if (pendingRefresh && pendingRefresh.path === currentPath) {
                    pendingRefresh = null
                }
            }
        })()

        pendingRefresh = {
            path: currentPath,
            promise: promise
        }

        return promise
    }

    function getTagPrefix(tag) {
        if (!tag) return ''
        const match = tag.match(/^(.+?)(\d*)$/)
        return match ? match[1] : tag
    }

    let currentTags = {}

    async function refreshTags(immediate = false) {
        if (refreshTimer) {
            clearTimeout(refreshTimer)
            refreshTimer = null
        }

        if (isFirstLoad || immediate) {
            isFirstLoad = false
            if (isCommentOrderEnabled()) {
                currentTags = await loadDescriptionTags()
            } else {
                currentTags = {}
                descriptionCache = {}
            }
            return
        }

        return new Promise((resolve) => {
            refreshTimer = setTimeout(async () => {
                if (isCommentOrderEnabled()) {
                    currentTags = await loadDescriptionTags()
                } else {
                    currentTags = {}
                    descriptionCache = {}
                }
                resolve()
            }, DEBOUNCE_DELAY)
        })
    }

    HFS.watchState('uri', (uri) => {
        isFirstLoad = true
        refreshTags(true)
    }, true)
    
    HFS.onEvent('newListEntries', () => {
        refreshTags()
    })
    
    if (typeof window !== 'undefined') {
        window.addEventListener('popstate', () => {
            isFirstLoad = true
            setTimeout(() => refreshTags(true), 100)
        })
        
        const originalPushState = history.pushState
        history.pushState = function() {
            originalPushState.apply(this, arguments)
            isFirstLoad = true
            setTimeout(() => refreshTags(true), 100)
        }
    }

    HFS.onEvent('sortCompare', ({ a, b }) => {
        if (!shouldHandle()) return 0

        const nameA = a.n || a.name || ''
        const nameB = b.n || b.name || ''

        const isFolderA = !!(a.isFolder || a.p === 'd')
        const isFolderB = !!(b.isFolder || b.p === 'd')

        // 1. FOLDER FIRST
        if (isFolderA && !isFolderB) return -1
        if (!isFolderA && isFolderB) return 1

        // 2. DESCRIPT.ION TAG ORDER
        if (isCommentOrderEnabled()) {
            const tagPatterns = getPatternsFromConfig('commentOrder')

            if (tagPatterns.length > 0) {
                const aTag = currentTags[nameA] || ''
                const bTag = currentTags[nameB] || ''

                const aTagPrefix = getTagPrefix(aTag)
                const bTagPrefix = getTagPrefix(bTag)

                const aTagIndex = getFirstMatchingIndex(aTagPrefix, tagPatterns)
                const bTagIndex = getFirstMatchingIndex(bTagPrefix, tagPatterns)

                const aHasTag = aTagIndex !== -1
                const bHasTag = bTagIndex !== -1

                if (aHasTag && !bHasTag) return -1
                if (!aHasTag && bHasTag) return 1

                if (aHasTag && bHasTag) {
                    if (aTagIndex !== bTagIndex) {
                        return aTagIndex - bTagIndex
                    }
                    return 0
                }
            }
        }

        // 3. FOLDER ORDER / FILE ORDER
        const orderConfigKey = isFolderA ? 'fixedOrder' : 'fileOrder'
        const orderPatterns = getPatternsFromConfig(orderConfigKey)

        if (orderPatterns.length > 0) {
            const aIndex = getFirstMatchingIndex(nameA, orderPatterns)
            const bIndex = getFirstMatchingIndex(nameB, orderPatterns)

            const aInOrder = aIndex !== -1
            const bInOrder = bIndex !== -1

            if (aInOrder && !bInOrder) return -1
            if (!aInOrder && bInOrder) return 1
            if (aInOrder && bInOrder) return aIndex - bIndex
        }

        return 0
    })
}