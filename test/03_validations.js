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
	_ = require('lodash'),	
	Collection = require('../'),
	validationEntity = require('./entities/03_validation_entity'),
	validationCollection,
	invalid_test_entity_id = "54dcb4cc4933211b2dd4aa9d", MongoDB = require('../connector');



var entity = {};
describe('Validations', function(){
	it('Clean database', function(done) {
		MongoDB.dropDatabase().then(function(){
			validationCollection = new Collection(validationEntity.collection, 'validation_entity');
			process.basyt.collections['validation_entity'] = validationCollection;		
			done();
		})
	})
	it('Check strict', function(done){
		validationCollection.create({
			required: "value",
			illegal: "field"
		}).catch(function(err){
			should(err.err).containEql([undefined, 'strict']);
			done();
		});
	});

	it('Check required', function(done){
		validationCollection.create({
			email: "test@test.com"
		}).catch(function(err){
			should(err.err).containEql(["required", "required"]);
			done();
		});
	});
	it('Check string', function(done){
		entity.required = "test1";
		entity.string = 12;
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["string", "invalid"]);
			done();
		});
	});
	it('Check integer', function(done){
		entity.string = "test string";
		entity.integer = "BC";
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["integer", "invalid"]);
			done();
		});
	});
	it('Check min', function(done){
		entity.integer = -25;
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["integer", "min"]);
			done();
		});
	});
	it('Check max', function(done){
		entity.integer = 25;
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["integer", "max"]);
			done();
		});
	});
	it('Check numeric', function(done){
		entity.integer = 2;
		entity.numeric = "ABC"
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["numeric", "invalid"]);
			done();
		});
	});
	it('Check minLength', function(done){
		entity.numeric = "012"
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["numeric", "minLength"]);
			done();
		});
	});
	it('Check maxLength', function(done){
		entity.numeric = "123456789012345"
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["numeric", "maxLength"]);
			done();
		});
	});
	it('Check boolean', function(done){
		entity.numeric = "123456";
		entity.boolean = "turuncu";
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["boolean", "invalid"]);
			done();
		});
	});
	it('Check email', function(done){
		entity.boolean = true;
		entity.email = "test string";
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["email", "invalid"]);
			done();
		});
	});
	it('Check url', function(done){
		entity.email = "test@test.com";
		entity.url = "test string";
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["url", "invalid"]);
			done();
		});
	});
	it('Check datetime', function(done){
		entity.url = "http://google.com";
		entity.datetime = "abc";
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["datetime", "invalid"]);
			done();
		});
	});
	it('Check after', function(done){
		entity.datetime = new Date('2014/12/01');
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["datetime", "after"]);
			done();
		});
	});
	it('Check before', function(done){
		entity.datetime = new Date('2015/12/01');
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["datetime", "before"]);
			done();
		});
	});
	it('Check array', function(done){
		entity.array = 12;
		delete entity.datetime;
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["array", "invalid"]);
			done();
		});
	});
	it('Check array element', function(done){
		entity.array = ["test string"];
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["array", "invalid"]);
			done();
		});
	});
	it('Check object', function(done){
		entity.array = [12, 14];
		entity.object = "test string";
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["object", "invalid"]);
			done();
		});
	});
	it('Check json', function(done){
		entity.object = {string: "test string"};
		entity.json = "test string";
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["json", "invalid"]);
			done();
		});
	});
	it('Check contains', function(done){
		entity.json = JSON.stringify({integer: 12});
		entity.contains = "test test";
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["contains", "contains"]);
			done();
		});
	});
	it('Check notContains', function(done){
		entity.contains = "example sample";
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["contains", "notContains"]);
			done();
		});
	});
	it('Check in', function(done){
		entity.contains = "test sample";
		entity.set = 12;
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["set", "in"]);
			done();
		});
	});
	it('Check notIn', function(done){
		entity.set = 302;
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["set", "notIn"]);
			done();
		});
	});
	it('Check notNull', function(done){
		entity.set = 30;
		entity.notNull = null;
		validationCollection.create(entity).catch(function(err){
			should(err.err).containEql(["notNull", "invalid"]);
			done();
		});
	});
	it('Create entity', function(done){
		entity.notNull = "no-update";
		validationCollection.create(entity)
		.then(function(doc){
			var date = new Date("2015/02/01");
			should(doc.datetime.toString()).be.exactly(date.toString());
			//should(doc).not.have.property("set");
			entity.id = doc.id;
			done();
		})
		.catch(function(err){
			console.log(err);
			done();
		})
	});
	it('Try to update not writable', function(done){
		validationCollection.update({_id: entity.id}, {$set: {notNull: "some-update"}})
		.catch(function(err){
			should(err.err).containEql(["notNull", "reject"]);
			done();
		})
	});
})