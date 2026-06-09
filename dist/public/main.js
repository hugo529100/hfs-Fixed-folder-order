'use strict';

{
    function getConfig() {
        return HFS.getPluginConfig()
    }

    function wildcardToRegex(pattern) {
        const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
        const regex = escaped.replace(/\*/g, '.*')
        return new RegExp('^' + regex + '$', 'i') // 'i' for case-insensitive
    }

    function getPatternsFromConfig(configKey) {
        const cfg = getConfig()
        const items = String(cfg[configKey] || '')
            .split(/\r?\n/)
            .map(x => x.trim())
            .filter(Boolean)

        return items.map(pattern => ({
            pattern: pattern,
            regex: wildcardToRegex(pattern)
        }))
    }

    function getFirstMatchingIndex(name, patterns) {
        for (let i = 0; i < patterns.length; i++) {
            if (patterns[i].regex.test(name)) {
                return i
            }
        }
        return -1
    }

    function shouldHandle() {
        const cfg = getConfig()
        if (cfg.scope === 'global')
            return true
        return (HFS.state.uri || '/') === '/'
    }

    HFS.onEvent('sortCompare', ({ a, b }) => {
        if (!shouldHandle())
            return 0

        const cfg = getConfig()

        // ==========================================
        // 第一層：資料夾永遠在最上面
        // ==========================================
        if (a.isFolder && !b.isFolder) return -1
        if (!a.isFolder && b.isFolder) return 1

        // ==========================================
        // 第二層：同類型內部排序（資料夾或檔案）
        // ==========================================
        
        // 根據類型選擇對應的排序規則
        const orderConfigKey = a.isFolder ? 'fixedOrder' : 'fileOrder'
        const orderPatterns = getPatternsFromConfig(orderConfigKey)
        
        const aIndex = getFirstMatchingIndex(a.name, orderPatterns)
        const bIndex = getFirstMatchingIndex(b.name, orderPatterns)
        const aInOrder = aIndex !== -1
        const bInOrder = bIndex !== -1

        // 如果兩個都在排序列表中，按列表順序排列
        if (aInOrder && bInOrder) {
            return aIndex - bIndex
        }

        // 如果只有一個在排序列表中，列表中的項目優先
        if (aInOrder && !bInOrder) return -1
        if (!aInOrder && bInOrder) return 1

        // 都不在排序列表中，返回 0 讓 HFS 自行排序（時間、大小、名稱等）
        return 0
    })
}