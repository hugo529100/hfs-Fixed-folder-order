exports.version = 1.4
exports.description = "Folders always first with wildcard support. Separate custom ordering for folders and files, with case-insensitive matching."
exports.apiRequired = 8.87
exports.repo = "Hug3O/Fixed-folder-order"
exports.frontend_js = "main.js"
exports.config = {
    scope: {
        type: "select",
        label: "Sorting Scope",
        defaultValue: "root",
        frontend: true,
        options: {
            "Root directory only": "root",
            "Global (all folders)": "global"
        }
    },

    fixedOrder: {
        type: "string",
        label: "Folder Order",
        multiline: true,
        frontend: true,
        defaultValue: "Musics\nMovies\nYoutube\nAlbums\nBooks\nTools",
        helperText:
            "Controls the order of FOLDERS.\nOne folder per line. Supports wildcards (*).\nFolders matching these patterns will be sorted by this list order.\nNon-matching folders will be sorted by HFS default order.\n\nExample:\nMovie*\nMusic\nAnime"
    },

    fileOrder: {
        type: "string",
        label: "File Order",
        multiline: true,
        frontend: true,
        defaultValue: "*.mp4\n*.mp3\n*.jpeg\n*.jpg\n*.png\n*.pdf\n*.stl\n*.dwg\n*.txt\n*.htm\n*.html",
        helperText:
            "Controls the order of FILES.\nOne file pattern per line. Supports wildcards (*).\nFiles matching these patterns will be sorted by this list order.\nNon-matching files will be sorted by HFS default order.\n\nExample:\n*.mp4\n*.mp3\n*.jpg\n*.txt"
    }
}