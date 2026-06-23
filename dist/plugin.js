exports.version = 1.6
exports.description = "Folders first + DESCRIPT.ION comment tag ordering"
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
        defaultValue:
`Musics
Movies
Youtube
Albums
Books
Tools`
    },

    fileOrder: {
        type: "string",
        label: "File Order",
        multiline: true,
        frontend: true,
        defaultValue:
`*.mp4
*.mp3
*.jpeg
*.jpg
*.png
*.pdf`
    },

    commentOrderEnabled: {
        type: "boolean",
        label: "Enable DESCRIPT.ION Comment Sorting",
        defaultValue: false,
        frontend: true
    },

    commentOrder: {
        type: "string",
        label: "Comment Tags Order",
        multiline: true,
        frontend: true,
        defaultValue:
`top
featured
important`,
        helperText:
            "Sort entries according to tags found in DESCRIPT.ION comments."
    }
}