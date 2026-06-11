'use strict';

{
    let descriptionCache = {}

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

        try {
            let descUrl = currentPath
            if (!descUrl.endsWith('/')) {
                descUrl += '/'
            }
            descUrl += 'DESCRIPT.ION'
            
            const response = await fetch(descUrl)
            
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
    }

    function getTagPrefix(tag) {
        if (!tag) return ''
        const match = tag.match(/^(.+?)(\d*)$/)
        return match ? match[1] : tag
    }

    let currentTags = {}

    async function refreshTags() {
        descriptionCache = {}
        
        // 只有開啟 commentOrder 時才讀取 DESCRIPT.ION
        if (isCommentOrderEnabled()) {
            currentTags = await loadDescriptionTags()
        } else {
            currentTags = {}
        }
    }

    HFS.watchState('uri', refreshTags, true)
    HFS.onEvent('newListEntries', refreshTags)
    
    if (typeof window !== 'undefined') {
        window.addEventListener('popstate', () => {
            setTimeout(refreshTags, 100)
        })
        
        const originalPushState = history.pushState
        history.pushState = function() {
            originalPushState.apply(this, arguments)
            setTimeout(refreshTags, 100)
        }
    }

    HFS.onEvent('sortCompare', ({ a, b }) => {
        if (!shouldHandle()) return 0

        // 1. FOLDER FIRST
        if (a.isFolder && !b.isFolder) return -1
        if (!a.isFolder && b.isFolder) return 1

        // 2. DESCRIPT.ION TAG ORDER（只有開啟時才生效）
        if (isCommentOrderEnabled()) {
            const tagPatterns = getPatternsFromConfig('commentOrder')

            if (tagPatterns.length > 0) {
                const aTag = currentTags[a.name] || ''
                const bTag = currentTags[b.name] || ''

                const aTagPrefix = getTagPrefix(aTag)
                const bTagPrefix = getTagPrefix(bTag)

                const aTagIndex = getFirstMatchingIndex(aTagPrefix, tagPatterns)
                const bTagIndex = getFirstMatchingIndex(bTagPrefix, tagPatterns)

                const aHasTag = aTagIndex !== -1
                const bHasTag = bTagIndex !== -1

                // 有 tag 的排在沒 tag 的前面
                if (aHasTag && !bHasTag) return -1
                if (!aHasTag && bHasTag) return 1

                // 兩個都有 tag，按 tag 類型排序
                if (aHasTag && bHasTag) {
                    if (aTagIndex !== bTagIndex) {
                        return aTagIndex - bTagIndex
                    }
                    // 同一 tag 類型，交由 HFS 原生排序
                    return 0
                }
            }
        }

        // 3. FOLDER ORDER / FILE ORDER
        const orderConfigKey = a.isFolder ? 'fixedOrder' : 'fileOrder'
        const orderPatterns = getPatternsFromConfig(orderConfigKey)

        if (orderPatterns.length > 0) {
            const aIndex = getFirstMatchingIndex(a.name, orderPatterns)
            const bIndex = getFirstMatchingIndex(b.name, orderPatterns)

            const aInOrder = aIndex !== -1
            const bInOrder = bIndex !== -1

            if (aInOrder && !bInOrder) return -1
            if (!aInOrder && bInOrder) return 1
            if (aInOrder && bInOrder) return aIndex - bIndex
        }

        return 0
    })
}