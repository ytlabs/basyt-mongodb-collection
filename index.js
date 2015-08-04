var _ = require('lodash');

var util = require("util"),
    MongoDB = require("./connector"),
    adapter = require('./adapter'),
    BasytBaseCollection = require('basyt-base-collection');

module.exports = MongoDBCollection;

function MongoDBCollection(config, fileName) {
    this.name = config.name || fileName;
    this.storage = "mongodb";
    this.collection = MongoDB.collection(config.name);
    var storageDefaultIdField = '_id',
        idField = storageDefaultIdField,
        idFunction = MongoDB.ObjectId,
        textFields = [];

    _.forOwn(config.attributes, function (properties, field) {
        if (_.isString(properties)) return true;
        //setup search

        if (!_.isUndefined(properties.search)) {
            textFields.push([field, properties.search])
        }
        //setup index
        if (properties.index === true || properties.index === -1) {

            var dumpSet = {};
            dumpSet[field] = properties.index === -1 ? -1 : 1;
            MongoDB.collection(config.name).createIndex(dumpSet, properties.indexProps);

            if (properties.primary === true) {
                if (idField !== storageDefaultIdField) {
                    GLOBAL.logger.warn(config.name + ' multiple primary key ' + field + ' ignored');
                }
                else {
                    idField = field;
                    idFunction = properties.idFunction || function (id) {
                        return id
                    };
                }
            }
        }
    });

    if(textFields.length > 0) {
        var index = {}, weights = {};
        _.forEach(textFields, function(field) {
            index[field[0]] = 'text';
            if(_.isNumber(field[1])) {
                weights[field[0]] = field[1];
            }
        });
        if(_.isEmpty(weights)){
            MongoDB.collection(config.name).createIndex(index, {name: "TextIndex"});
        }
        else {
            MongoDB.collection(config.name).createIndex(index, {weights: weights, name: "TextIndex"});
        }
    };

    this.storageDefaultIdField = storageDefaultIdField;
    
    this.idField = idField;
    this.idFunction = idFunction;
    this.searchAvailable = textFields.length > 0;
    BasytBaseCollection.call(this, config);
    _.forOwn(config.methods, function (collectionMethods, name) {
        this[name] = collectionMethods;
    }, this);
}

util.inherits(MongoDBCollection, BasytBaseCollection);
MongoDBCollection.prototype.adapter = _.extend({}, BasytBaseCollection.adapter, adapter);