module.exports = {
	collection: {
        name: "validation_entity",
        strict: true,
        attributes: {
            "required": {required: true},
            "primary": {
                type: "integer",
                index: 1,
                primary: true
            },
            "string": "string",
            "integer": {
                type: "integer",
                min: -20,
                max: 20
            },
            "numeric": {
                type: "numeric",
                minLength: 5,
                maxLength: 10
            },
            "boolean": "boolean",
            "email": "email",
            "url": "url",
            "datetime": {
                type: "datetime",
                before: new Date("2015/03/01"),
                after: new Date("2015/01/01"),
                "default": new Date("2015/02/01")
            },
            "array": {
                type: "array",
                element: "integer"
            },
            "object": "object",
            "json": "json",
            "contains": {
                type: "string",
                contains: "sample",
                notContains: "example"
            },
            "set": {
                type: "integer",
                "in": [15, 20, 25, 30, 301, 302],
                "notIn" : [301, 302],
                readable: true
            },
            "notNull" : {
                type: "notNull",
                writeable: false
            }
        }
    }
}