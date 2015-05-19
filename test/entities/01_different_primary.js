module.exports = {
	collection: {
        name: "different_primary",
        attributes: {
            name: {type: "string", required: true},
            code: {type: "string", index: true, primary: true},
            bodyText: {
            	type: "string", 
            	search: 2
            }
        }
    }
}