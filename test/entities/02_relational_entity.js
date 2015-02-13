module.exports = {
	collection: {
        name: "relational_entity",
        attributes: {
            name: {type: "string", required: true},
            dp_id: {
            	type: "relation",
            	entity: "different_primary",
            	role: "dp"
            },
            test_entity_id: {
            	type: "relation",
            	entity: "test_entity"
            },
            test_entity_email: {
            	type: "relation",
            	entity: "test_entity",
            	foreign: "email",
            	role: "byEmail",
                transfer: {"rel_transfer": "name"}
            },
            test_entity_ids: {
            	type: "array",
            	entity: "test_entity",
            	role: "entities"
            },
            primary_ids: {
            	type: "array",
            	entity: "different_primary",
                element: "string",
            	role: "primaries"
            },
            primary_names: {
            	type: "array",
            	entity: "different_primary",
            	role: "byName",
            	foreign: "name"
            }
        }
    }
};