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
	Collection,
	testEntity,
	entityCollection,
	differentPrimaryCollection,
	entityQuery = {};

describe('Initialization', function () {

	it('Instantiate mongodb collection factory', function(done) {
		Collection = require('../');
		done();
	});

	it('Create test collection', function(done) {
		testEntity = require('./entities/01_test_entity');
		entityCollection = new Collection(testEntity.collection, 'test_entity');
		process.basyt.collections['test_entity'] = entityCollection;
		entityCollection.drop()
			.catch(function(){ return; })
			.then(function(){ done(); });
	});
});

describe('Basic CRUD Operations', function (){	

	var redisClient = redis.createClient(), eventActions = [];
	redisClient.subscribe('entity:test_entity');
	redisClient.on('message', function(channel, rawdata){
		var event = JSON.parse(rawdata);
		eventActions.push(event.data.action);
	});

	it('Create', function(done) {
		entityCollection.create({
			name: "test",
			email: "test@test.com",
			url: "http://hop.co",
			telephone: "65243433"
		}).then(function(doc){
			should(doc.email).be.exactly("test@test.com");
			should(doc).have.property("id");			
			entityQuery[entityCollection.idField] = doc.id;

			done();
		});
	});

	it('Read', function(done){
		entityCollection.read(entityQuery).then(function(doc){
			done();
		});
	});

	it('Update', function(done){
		entityCollection.update(entityQuery, {$set: {email: "test@test2.com"}})
		.then(function(doc){
			should(doc.email).be.exactly("test@test2.com");
			should(doc.url).be.exactly("http://hop.co");
			should(doc.id.toString()).be.exactly(entityQuery[entityCollection.idField].toString());
			done();
		});
	});	
	it('Delete', function(done){
		entityCollection.delete(entityQuery)
		.then(function(doc){
			entityCollection.read(entityQuery).catch(function(doc){			
				done();
			});
		});
	});

	it('Check entity events', function(done){
		setTimeout(function(){
			should(eventActions).have.length(4);
			should(eventActions).containEql("drop");
			should(eventActions).containEql("create");
			should(eventActions).containEql("update");
			should(eventActions).containEql("delete");
			done();
		}, 200);
	});
});

describe('Basic CRUD Operations for Different Primary Key entity', function (){
	it('Create entity collection', function(done) {
		differentPrimaryEntity = require('./entities/01_different_primary');
		differentPrimaryCollection = new Collection(differentPrimaryEntity.collection, 'different_primary');	
		process.basyt.collections['different_primary'] = differentPrimaryCollection;
		differentPrimaryCollection.drop().then(function(){
			done();
		});
	});

	var redisClient = redis.createClient(), eventActions = [];
	redisClient.subscribe('entity:different_primary');
	redisClient.on('message', function(channel, rawdata){
		var event = JSON.parse(rawdata);
		eventActions.push(event.data.action);
	});

	it('Create', function(done) {
		differentPrimaryCollection.create({
			name: "test",
			code: "12C"
		}).then(function(doc){
			should(doc.code).be.exactly("12C");
			done();
		});
	});

	it('Read', function(done){
		differentPrimaryCollection.read({code: "12C"}).then(function(doc){
			should(doc.name).be.exactly("test");
			done();
		});
	});

	it('Update', function(done){
		differentPrimaryCollection.update({code: "12C"}, {$set: {name: "test prime"}})
		.then(function(doc){
			should(doc.name).be.exactly("test prime");
			should(doc.code).be.exactly("12C");
			done();
		});
	});	


	it('Query 1', function(done){
		differentPrimaryCollection.query()
		.then(function(list){
			should(list).have.length(1);
			done();
		});
	});

	it('Delete', function(done){
		differentPrimaryCollection.delete({code: "12C"})
		.then(function(doc){
			done();
		});
	});

	it('Query 2', function(done){
		differentPrimaryCollection.query()
		.then(function(list){
			should(list).have.length(0);
			done();
		});
	});

	it('Query 3', function(done){
		differentPrimaryCollection.query({}, {limit: 10})
		.then(function(list){
			should(list).have.length(0);
			done();
		});
	});


	it('Check entity events', function(done){
		setTimeout(function(){
			should(eventActions).have.length(4);
			should(eventActions).containEql("drop");
			should(eventActions).containEql("create");
			should(eventActions).containEql("update");
			should(eventActions).containEql("delete");
			done();
		}, 200);
	});
});

describe('invalid read update delete', function(){
	it('Invalid Read', function(done){
		differentPrimaryCollection.read({code: "FALSE"}).catch(function(err){
			done();
		});
	});

	it('Invalid Update', function(done){
		differentPrimaryCollection.update({code: "FALSE"}, {$set: {name: "test prime"}})
		.catch(function(err){
			done();
		});
	});	
	it('Invalid Delete', function(done){
		differentPrimaryCollection.delete({code: "FALSE"})
		.catch(function(err){
			done();
		});
	});
})
	





