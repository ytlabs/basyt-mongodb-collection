module.exports = {
	collection: {
        name: "another_array_rel_entity",
        attributes: {
            name: {type: "string", required: true},
            relation_ids: {
                type: "array",
                entity: "another_entity"
            }
        }
    }
}