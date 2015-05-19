//global APP_CONFIG is required for mongodb connection settings
GLOBAL.APP_CONFIG = {
	//mongodb definition is actually passed as the first parameter 
	//to promised-mongo function
	mongodb: "mongodb://localhost/testdb"
};


process.basyt = {
	collections : {},
	ErrorDefinitions: require('./utils/ErrorDefinitions')
};


var should = require('should'),
	redis = require('redis'),
	_ = require('lodash'),	
	Collection = require('../'),
	testEntity = require('./entities/01_test_entity'),
	differentPrimaryEntity = require('./entities/01_different_primary'),
	entityCollection,
	differentPrimaryCollection,
	relationalCollection,
	relationalEntities = {},
	testEntities = [],
	invalid_test_entity_id = "54dcb4cc4933211b2dd4aa9d", MongoDB = require('../connector');



describe('Create Instances', function () {
	it('Clean database', function(done) {
		MongoDB.dropDatabase().then(function(){
			entityCollection = new Collection(testEntity.collection, 'test_entity');
			differentPrimaryCollection = new Collection(differentPrimaryEntity.collection, 'different_primary');
			process.basyt.collections['test_entity'] = entityCollection;
			process.basyt.collections['different_primary'] = differentPrimaryCollection;		
			done();
		});
	});
	it('Create test entity instances', function(done) {
		entityCollection.create({
			name: "test",
			email: "test@test.com",
			url: "http://hop.co",
			telephone: "65243433"
		}).then(function(doc) {
			testEntities[0] = doc.id.toString();
			return entityCollection.create({
				name: "test",
				email: "test@test2.com",
				url: "http://hop.co",
				telephone: "65243433"
			})			
		}).then(function(doc2) {
			testEntities[1] = doc2.id.toString();
			return entityCollection.create({
				name: "test 3",
				email: "test@test3.com",
				url: "http://hop.co",
				telephone: "65243433"
			})			
		}).then(function(doc3) {
			testEntities[2] = doc3.id.toString();
			done();
		});
	});

	it('Create different primary entity instances', function(done) {
		differentPrimaryCollection.create({
			name: "test C12",
			code: "12C",
			bodyText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
		}).then(function(doc) {
			return differentPrimaryCollection.create({
				name: "test B15",
				code: "15B",
				bodyText: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'
			})			
		}).then(function(doc) {
			return differentPrimaryCollection.create({
				name: "test E1",
				code: "1E"
			})			
		}).then(function(doc) {
				done();
			});;
	});


	it('Initialize relational entity', function(done) {
		var relationalEntity = require('./entities/02_relational_entity');
		relationalCollection = new Collection(relationalEntity.collection, 'relational_entity');
		process.basyt.collections['relational_entity'] = relationalCollection;
		relationalEntities = {
				type1: {
						name: "type1",
						test_entity_id: testEntities[0]
					},
				type2: {
						name: "type2",
						dp_id: "12C"
					},
				type3: {
						name: "type3",
						test_entity_email: "test@test.com"
					},
				type4: {
						name: "type4",
						test_entity_ids: testEntities.slice(0, 2)
					},
				type5: {
						name: "type5",
						primary_ids: ["12C", "15B"]
					},
				type6: {
						name: "type6",
						primary_names: ["test C12", "test B15"]
					},
				type7: {
						name: "type7",
						test_entity_id: testEntities[0],
						test_entity_ids: testEntities.slice(0, 2),
						test_entity_email: "test@test2.com"
					},
				type8: {
						name: "type8",
						test_entity_id: testEntities[0],
						primary_names: ["test C12", "test B15"],
						test_entity_email: "test@test.com",
						primary_ids: ["12C", "15B"]
					}

			};
		relationalCollection.drop()
			.catch(function(){ return; })
			.then(function(){ done(); });
	});

});

describe("Create one-to-one relations entities", function() {
	it('Create entity join on default _id field', function(done){
		relationalCollection.create(relationalEntities.type1).then(function(doc){
			relationalEntities.type1.id = doc.id.toString();
			done();
		});
	});

	it('Reject to create entity with invalid relation _id field', function(done){
		relationalCollection.create({
			name: "type1",
			test_entity_id: invalid_test_entity_id
		}).catch(function(){
			done();
		});
	});

	it('Create entity join on different primary key field', function(done){
		relationalCollection.create(relationalEntities.type2).then(function(doc){
			relationalEntities.type2.id = doc.id.toString();
			done();
		});
	});

	it('Reject to create entity with invalid relation primary key field', function(done){
		relationalCollection.create({
			name: "type2",
			dp_id: "8F"
		}).catch(function(){
			done();
		});
	});

	it('Create entity join on different field', function(done){
		relationalCollection.create(relationalEntities.type3).then(function(doc){
			relationalEntities.type3.id = doc.id.toString();
			done();
		});
	});

	it('Reject to create entity with invalid field', function(done){
		relationalCollection.create({
			name: "type3",
			test_entity_email: "invalid@email.com"
		}).catch(function(){
			done();
		});
	});
});

describe("Create one-to-many relations entities", function() {
	
	it('Create entity join on default _id field', function(done){
		relationalCollection.create(relationalEntities.type4).then(function(doc){
			relationalEntities.type4.id = doc.id.toString();
			done();
		});
	});

	it('Reject to create entity with invalid relation _id field', function(done){
		relationalCollection.create({
			name: "type4",
			test_entity_ids: [testEntities[1], invalid_test_entity_id]
		}).catch(function(){
			done();
		});
	});

	it('Create entity join on different primary key field', function(done){
		relationalCollection.create(relationalEntities.type5).then(function(doc){
			relationalEntities.type5.id = doc.id.toString();
			done();
		});
	});

	it('Reject to create entity with invalid relation primary key field', function(done){
		relationalCollection.create({
			name: "type5",
			dp_id: ["12C", "8F"]
		}).catch(function(){
			done();
		});
	});

	it('Create entity join on different field', function(done){
		relationalCollection.create(relationalEntities.type6).then(function(doc){
			relationalEntities.type6.id = doc.id.toString();
			done();
		});
	});

	it('Reject to create entity with invalid field', function(done){
		relationalCollection.create({
			name: "type6",
			primary_names: ["test C12", "bb"]
		}).catch(function(){
			done();
		});
	});
});

describe("Create random relations", function(){
	it('Create repeated relations from same entity', function(done){
		relationalCollection.create(relationalEntities.type7).then(function(doc){
			relationalEntities.type7.id = doc.id.toString();
			done();
		});
	});

	it('Create mixed relations from same entity', function(done){
		relationalCollection.create(relationalEntities.type8).then(function(doc){
			relationalEntities.type8.id = doc.id.toString();
			done();
		});
	});
});

describe("Read entities", function(){
	it('Shallow read and verify all created relational entities', function(doneLoop) {
		_.forOwn(relationalEntities, function(entity, name){
			var entityQuery = {};
				entityQuery[relationalCollection.idField] = entity.id;
				relationalCollection.read(entityQuery)
					.then(function(doc){
						_.forOwn(entity, function(value, field){
							if(_.isArray(value)) {
								_.forEach(doc[field], function(item){
									should(value).containEql(item.toString());
								})
							}
							else {
								should(doc[field].toString()).be.exactly(value.toString());
							}
						});
					});
		});
		setTimeout(doneLoop, 1000);
	});

	it('Deep read type1', function(done){
		var entityQuery = {};
			entityQuery[relationalCollection.idField] = relationalEntities.type1.id;
		relationalCollection.read(entityQuery, {depth: 1})
			.then(function(doc){
				should(doc).have.property('test_entity_collection');
				should(doc.test_entity_collection.id.toString()).be.exactly(relationalEntities.type1.test_entity_id);
				done();
			})
	});

	it('Deep read type2', function(done){
		var entityQuery = {};
			entityQuery[relationalCollection.idField] = relationalEntities.type2.id;
		relationalCollection.read(entityQuery, {depth: 1})
			.then(function(doc){
				should(doc).have.property('dp');
				should(doc.dp.code).be.exactly(relationalEntities.type2.dp_id);
				done();
			})
	});

	it('Deep read type3', function(done){
		var entityQuery = {};
			entityQuery[relationalCollection.idField] = relationalEntities.type3.id;
		relationalCollection.read(entityQuery, {depth: 1})
			.then(function(doc){
				should(doc).have.property('byEmail');
				should(doc.byEmail.email).be.exactly(relationalEntities.type3.test_entity_email);
				done();
			})
	});

	it('Deep read type4', function(done){
		var entityQuery = {};
			entityQuery[relationalCollection.idField] = relationalEntities.type4.id;
		relationalCollection.read(entityQuery, {depth: 1})
			.then(function(doc){
				should(doc).have.property('entities');
				should(doc.entities).have.length(2);
				should(relationalEntities.type4.test_entity_ids).containEql(doc.entities[0].id.toString());
				should(relationalEntities.type4.test_entity_ids).containEql(doc.entities[1].id.toString());
				done();
			})
	});

	it('Deep read type5', function(done){
		var entityQuery = {};
			entityQuery[relationalCollection.idField] = relationalEntities.type5.id;
		relationalCollection.read(entityQuery, {depth: 1})
			.then(function(doc){
				should(doc).have.property('primaries');
				should(doc.primaries).have.length(2);
				should(relationalEntities.type5.primary_ids).containEql(doc.primaries[0].code);
				should(relationalEntities.type5.primary_ids).containEql(doc.primaries[1].code);
				done();
			})
	});
	it('Deep read type8', function(done){
		var entityQuery = {};
			entityQuery[relationalCollection.idField] = relationalEntities.type8.id;
		relationalCollection.read(entityQuery, {depth: 1})
			.then(function(doc){
				should(doc).have.property('test_entity_collection');
				should(doc).have.property('byEmail');
				should(doc.primaries).have.length(2);
				should(relationalEntities.type8.primary_names).containEql(doc.byName[0].name);
				done();
			})
	});
});

describe("Update Relational entities", function(){
	it('Plain update for an relation field on _id', function(done){
		var entityQuery = {};
			entityQuery[relationalCollection.idField] = relationalEntities.type1.id;
		relationalCollection.update(entityQuery, {$set: {test_entity_id: testEntities[2]}})
			.then(function(doc){
				should(doc.test_entity_id).be.exactly(testEntities[2]);
				done();
			});
	});

	it('Plain update for an relation field on different primary key', function(done){
		var entityQuery = {};
			entityQuery[relationalCollection.idField] = relationalEntities.type1.id;
		relationalCollection.update(entityQuery, {$set: {dp_id: "1E"}})
			.then(function(doc){
				should(doc.test_entity_id).be.exactly(testEntities[2]);
				done();
			});
	});

	it('Add to relation list field on _id', function(done){
		var entityQuery = {};
			entityQuery[relationalCollection.idField] = relationalEntities.type4.id;
		relationalCollection.update(entityQuery, {$addToSet: {test_entity_ids: testEntities[2]}})
			.then(function(doc){
				should(doc.test_entity_ids).have.length(3);
				should(doc.test_entity_ids).containEql(testEntities[2]);
				done();
			});
	});

	it('Add to relation list field on ordinary field', function(done){
		var entityQuery = {};
			entityQuery[relationalCollection.idField] = relationalEntities.type8.id;
		relationalCollection.update(entityQuery, {$push: {primary_names: "test E1"}})
			.then(function(doc){
				should(doc.primary_names).have.length(3);
				should(doc.primary_names).containEql("test E1");
				done();
			});
	});

	it('Remove from relation list field on ordinary field', function(done){
		var entityQuery = {};
			entityQuery[relationalCollection.idField] = relationalEntities.type8.id;
		relationalCollection.update(entityQuery, {$pull: {primary_names: "test B15"}})
			.then(function(doc){
				should(doc.primary_names).have.length(2);
				should(doc.primary_names).not.containEql("test B15");
				done();
			});
	});

	it('Multiple updates for single relation field', function(done){
		relationalCollection.update({test_entity_id: testEntities[0]}, {$push: {primary_ids: "1E"}}, {multi: true})
			.then(function(doc){
				relationalCollection.query({test_entity_id: testEntities[0]}, {depth: 1})
					.then(function(list){
						should(list).have.length(2);
						_.forEach(list, function(item){
							should(item.primary_ids).containEql("1E");
							should(item).have.property('primaries');
						})
						done();
					});
			});
	});

	it('Multiple updates for multiple relation field', function(done){
		relationalCollection.update({primary_ids: "12C"}, {$push: {test_entity_ids: testEntities[2]}}, {multi: true})
			.then(function(doc){
				relationalCollection.query({primary_ids: "12C"}, {depth: 1})
					.then(function(list){
						should(list).have.length(2);
						_.forEach(list, function(item){
							should(item.test_entity_ids).containEql(testEntities[2]);
							should(item).have.property('entities');
						})
						done();
					});
			});
	});

	it('Count over pushed relations', function(done){
		relationalCollection.count({test_entity_ids: testEntities[2]})
			.then(function(count){
				should(count).be.exactly(3);
				done();
			});
	})
});