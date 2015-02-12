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
	Collection = require('../'),
	testEntity = require('./entities/01_test_entity'),
	differentPrimaryEntity = require('./entities/01_different_primary'),
	entityCollection = new Collection(testEntity.collection, 'test_entity'),
	differentPrimaryCollection = new Collection(differentPrimaryEntity.collection, 'different_primary'),
	relationalCollection,
	testEntity = [],
	relationalEntities = {},
	invalid_test_entity_id = "54dcb4cc4933211b2dd4aa9d";

process.basyt.collections['test_entity'] = entityCollection;
process.basyt.collections['different_primary'] = differentPrimaryCollection;

describe('Create Instances', function () {

	it('clear entity tables', function(done) {
		entityCollection.drop().then(function() {
			differentPrimaryCollection.drop().then(function(){
				done();
			});
		});

	});

	it('Create test entity instances', function(done) {
		entityCollection.create({
			name: "test",
			email: "test@test.com",
			url: "http://hop.co",
			telephone: "65243433"
		}).then(function(doc) {
			testEntity[0] = doc.id.toString();
			return entityCollection.create({
				name: "test",
				email: "test@test2.com",
				url: "http://hop.co",
				telephone: "65243433"
			})			
		}).then(function(doc2) {
				testEntity[1] = doc2.id.toString();
				done();
			});;
	});

	it('Create different primary entity instances', function(done) {
		differentPrimaryCollection.create({
			name: "test C12",
			code: "12C"
		}).then(function(doc) {
			return differentPrimaryCollection.create({
				name: "test B15",
				code: "15B"
			})			
		}).then(function(doc2) {
				done();
			});;
	});


	it('Initialize relational entity', function(done) {
		var relationalEntity = require('./entities/02_relational_entity');
		relationalCollection = new Collection(relationalEntity.collection, 'relational_entity');
		process.basyt.collections['relational_entity'] = relationalCollection;
		relationalCollection.drop().then(function(){
			done();
		})
	});
});

describe("Create one-to-one relations entities", function() {
	it('Create entity join on default _id field', function(done){
		relationalCollection.create({
			name: "type1",
			test_entity_id: testEntity[0]
		}).then(function(doc){
			relationalEntities['type1'] = doc.id.toString();
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
		relationalCollection.create({
			name: "type2",
			dp_id: "12C"
		}).then(function(doc){
			relationalEntities['type2'] = doc.id.toString();
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
		relationalCollection.create({
			name: "type3",
			test_entity_email: "test@test.com"
		}).then(function(doc){
			relationalEntities['type3'] = doc.id.toString();
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
		relationalCollection.create({
			name: "type4",
			test_entity_ids: testEntity
		}).then(function(doc){
			relationalEntities['type4'] = doc.id.toString();
			done();
		});
	});

	it('Reject to create entity with invalid relation _id field', function(done){
		relationalCollection.create({
			name: "type4",
			test_entity_ids: [testEntity[1], invalid_test_entity_id]
		}).catch(function(){
			done();
		});
	});

	it('Create entity join on different primary key field', function(done){
		relationalCollection.create({
			name: "type5",
			primary_ids: ["12C", "15B"]
		}).then(function(doc){
			relationalEntities['type5'] = doc.id.toString();
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
		relationalCollection.create({
			name: "type6",
			primary_names: ["test C12", "test B15"]
		}).then(function(doc){
			relationalEntities['type6'] = doc.id.toString();
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
		relationalCollection.create({
			name: "type7",
			test_entity_id: testEntity[0],
			test_entity_ids: testEntity,
			test_entity_email: "test@test2.com"
		}).then(function(doc){
			relationalEntities['type7'] = doc.id.toString();
			done();
		});
	});

	it('Create mixed relations from same entity', function(done){
		relationalCollection.create({
			name: "type8",
			test_entity_id: testEntity[0],
			primary_names: ["test C12", "test B15"],
			test_entity_email: "test@test.com",
			primary_ids: ["12C", "15B"]
		}).then(function(doc){
			relationalEntities['type8'] = doc.id.toString();
			done();
		});
	});
});