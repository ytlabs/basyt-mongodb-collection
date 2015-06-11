module.exports = {
	collection: {
        name: "test_entity",
        attributes: {
            name: {type: "string", required: true},
            email: "email",
            url: "url",
            telephone: {
                type: "numeric",
                minLength: 7,
                maxLength: 11
            },
            hidden: {type: "string", readable: false}
        }
    }
}