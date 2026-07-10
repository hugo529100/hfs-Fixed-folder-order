'use strict';

{
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

    function getTagPrefix(tag) {
        if (!tag) return ''
        const match = tag.match(/^(.+?)(\d*)$/)
        return match ? match[1] : tag
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
                // 直接使用 HFS 原生提供的 comment 屬性
                const aTag = a.comment || ''
                const bTag = b.comment || ''

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