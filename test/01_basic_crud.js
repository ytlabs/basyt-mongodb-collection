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
	differentPrimaryEntity,
	entityCollection,
	differentPrimaryCollection,
	entityQuery = {}, MongoDB = require('../connector');

describe('Initialization', function () {
	it('Clean database', function(done) {
		MongoDB.dropDatabase().then(function(){
			done();
		}).catch(function(err){
			console.log(err);
			done();
		})
	});
	it('Instantiate mongodb collection factory', function(done) {
		Collection = require('../');
		done();
	});
	it('Create test collection', function(done) {
		testEntity = require('./entities/01_test_entity');
		entityCollection = new Collection(testEntity.collection, 'test_entity');
		process.basyt.collections['test_entity'] = entityCollection;
		done();
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
			telephone: "65243433",
			hidden: "this is hidden"
		}).then(function(doc){
			should(doc.email).be.exactly("test@test.com");
			should(doc).have.property("id");
			entityQuery[entityCollection.idField] = doc.id;

			done();
		});
	});

	it('Read', function(done){
		entityCollection.read(entityQuery, {projection: {name: 1, email: 1, hidden: 1}}).then(function(doc){
			should(doc).not.have.property("hidden"); //even projection requests hidden field, it should not be read
			should(doc).not.have.property("url");
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

	it('Search should be rejected', function(done){
		entityCollection.query({}, {search_text : 'dolor sit amet'})
			.catch(function(err){
				console.log(err);
				should(err.err).containEql(["query", "search_not_available"]);
				done();
			})
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
			should(eventActions).have.length(3);
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
		done();
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
			code: "12C",
			bodyText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
		}).then(function(doc){
			should(doc.code).be.exactly("12C");
			should(doc).have.property("bodyText");
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
		differentPrimaryCollection.update({code: "12C"}, {$set: {name: "test prime"}}, {projection: {name: 1, code: 1}})
		.then(function(doc){
			should(doc.name).be.exactly("test prime");
			should(doc.code).be.exactly("12C");
			should(doc).not.have.property("bodyText");
			done();
		});
	});	


	it('Query 1', function(done){
		differentPrimaryCollection.query({}, {projection: {name: 1}})
		.then(function(list){
			should(list).have.length(1);
			should(list[0]).not.have.property("bodyText");
			done();
		});
	});

	it('Search', function(done){
		differentPrimaryCollection.query({}, {search_text : 'dolor sit amet'})
		.then(function(list){
			should(list).have.length(1);
			done();
		});
	});

	it('Count with search', function(done){
		differentPrimaryCollection.count({}, {search_text : 'dolor sit amet'})
		.then(function(result){
			should(result).be.exactly(1);
			done();
		});
	});

	it('Delete', function(done){
		differentPrimaryCollection.delete({code: "12C"})
		.then(function(doc){
			done();
		});
	});

	it('Count', function(done){
		differentPrimaryCollection.count()
		.then(function(result){
			should(result).be.exactly(0);
			done();
		});
	});

	it('Query 2', function(done){
		differentPrimaryCollection.query({}, {limit: 10})
		.then(function(list){
			should(list).have.length(0);
			done();
		});
	});

	it('Drop collection to see drop event', function(done){
		differentPrimaryCollection.drop().then(function(){
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
	





