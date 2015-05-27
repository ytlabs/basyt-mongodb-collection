module.exports = {
	collection: {
        name: "another_rel_entity",
        attributes: {
            name: {type: "string", required: true},
            relation_id: {
                type: "relation",
                entity: "another_entity"
            }
        }
    }
}