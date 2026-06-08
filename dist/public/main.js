'use strict';

{
    function getConfig() {
        return HFS.getPluginConfig()
    }

    function wildcardToRegex(pattern) {
        // 转义特殊字符，然后将 * 转换为正则表达式
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

    function matchesAnyPattern(name, patterns) {
        return patterns.some(p => p.regex.test(name))
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

    // 默认排序比较（让HFS自己处理默认排序逻辑）
    function defaultCompare(a, b) {
        // 返回0让HFS使用默认排序
        return 0
    }

    HFS.onEvent('sortCompare', ({ a, b }) => {
        if (!shouldHandle())
            return 0

        const cfg = getConfig()

        // 获取通配符模式列表
        const alwaysFirstPatterns = getPatternsFromConfig('alwaysFirst')
        const alwaysLastPatterns = getPatternsFromConfig('alwaysLast')
        const fixedOrderPatterns = getPatternsFromConfig('fixedOrder')

        const aAlwaysFirst = matchesAnyPattern(a.name, alwaysFirstPatterns)
        const bAlwaysFirst = matchesAnyPattern(b.name, alwaysFirstPatterns)
        const aAlwaysLast = matchesAnyPattern(a.name, alwaysLastPatterns)
        const bAlwaysLast = matchesAnyPattern(b.name, alwaysLastPatterns)

        // 检查是否在固定顺序列表中
        const aFixedIndex = getFirstMatchingIndex(a.name, fixedOrderPatterns)
        const bFixedIndex = getFirstMatchingIndex(b.name, fixedOrderPatterns)
        const aInFixed = aFixedIndex !== -1
        const bInFixed = bFixedIndex !== -1

        // 最高优先级：文件夹优先
        if (cfg.forceFoldersFirst) {
            if (a.isFolder && !b.isFolder)
                return -1
            if (!a.isFolder && b.isFolder)
                return 1
        }

        // 第二优先级：Always First vs 其他
        // Always First 的项目永远在其他项目前面（除了文件夹优先已经处理的情况）
        if (aAlwaysFirst && !bAlwaysFirst) {
            // a在Always First，b不在，但如果是相同类型，a应该在前面
            return -1
        }
        if (!aAlwaysFirst && bAlwaysFirst) {
            return 1
        }

        // 第三优先级：Always Last vs 其他
        if (aAlwaysLast && !bAlwaysLast) {
            return 1
        }
        if (!aAlwaysLast && bAlwaysLast) {
            return -1
        }

        // 第四优先级：Fixed Order
        // 只有两个都在Fixed Order中时才按fixed顺序排序
        if (aInFixed && bInFixed) {
            return aFixedIndex - bFixedIndex
        }

        // 如果一个在Fixed Order中，一个不在（且都不在Always First/Last中）
        if (aInFixed && !bInFixed) {
            return -1
        }
        if (!aInFixed && bInFixed) {
            return 1
        }

        // 两个都在Always First组内
        if (aAlwaysFirst && bAlwaysFirst) {
            // 先检查fixed order
            if (aInFixed && bInFixed) {
                return aFixedIndex - bFixedIndex
            }
            // 让HFS按默认排序（时间、名字等）
            return 0
        }

        // 两个都在Always Last组内
        if (aAlwaysLast && bAlwaysLast) {
            // 先检查fixed order
            if (aInFixed && bInFixed) {
                return aFixedIndex - bFixedIndex
            }
            // 让HFS按默认排序（时间、名字等）
            return 0
        }

        // 两个都在固定顺序外，且都不在Always First/Last中
        // 让HFS按默认排序（时间、名字等）
        return 0
    })
}