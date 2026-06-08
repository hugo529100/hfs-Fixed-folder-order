exports.version = 1.2
exports.description = "Custom folder/file sorting with wildcard support. Allows fixed ordering, pinning items to top/bottom, and folder-first separation"
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
        defaultValue: "Musics\nMovies\nYoutube\nAlbums\nBooks\nTools\nCloudDisk\nMycomputer\nHFS3",
        helperText:
            "One folder/file per line. Supports wildcards (*).\nExample:\nMovie*\n*.mp4\nAnime\nMusic"
    },

    alwaysFirst: {
        type: "string",
        label: "Always First",
        multiline: true,
        frontend: true,
        defaultValue: "*.mp3\n*.mp4\n*.jpeg\n*.jpg\n*.png\n*.stl\n*.dwg",
        helperText:
            "These folders/files will always appear at the top.\nSupports wildcards (*).\nExample:\nImportant*\n*.txt\nTemp"
    },

    alwaysLast: {
        type: "string",
        label: "Always Last",
        multiline: true,
        frontend: true,
        defaultValue: "temp\ncache\nBackup",
        helperText:
            "These folders/files will always appear at the bottom.\nSupports wildcards (*).\nExample:\nArchive*\n*.log\nBackup"
    },

    forceFoldersFirst: {
        type: "boolean",
        label: "Folders before files",
        defaultValue: true,
        frontend: true
    }
}