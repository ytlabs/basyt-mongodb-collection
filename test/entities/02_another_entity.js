module.exports = {
	collection: {
        name: "another_entity",
        attributes: {
            name: {type: "string", required: true},
            relation_ref: {
                type: "relation",
                entity: "another_rel_entity",
                foreign: "relation_id",                
                owner: "another_rel_entity",
                role: "relations"
            },
            relation_ref_list: {
                type: "array",
                local: "id",
                foreign: "relation_ids",
                entity: "another_array_rel_entity",
                owner: "another_array_rel_entity",
                role: "relation_list"
            }
        }
    }
}