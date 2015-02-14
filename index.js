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
    var storageDefaultIdField = '_id', idField = storageDefaultIdField, idFunction = MongoDB.ObjectId;

    _.forOwn(config.attributes, function (properties, field) {
        if (_.isString(properties)) return true;
        //setup index
        if (properties.index === true || properties.index === -1) {

            var dumpSet = {};
            dumpSet[field] = properties.index === -1 ? -1 : 1;
            if (!_.isUndefined(properties.indexProps)) {
                MongoDB.collection(config.name).ensureIndex(dumpSet, properties.indexProps);
            }
            else {
                MongoDB.collection(config.name).ensureIndex(dumpSet);
            }
            if (properties.primary === true) {
                if (idField !== storageDefaultIdField) {
                    console.log(config.name + ' multiple primary key ' + field + ' ignored');
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

    this.storageDefaultIdField = storageDefaultIdField;
    this.idField = idField;
    this.idFunction = idFunction;
    BasytBaseCollection.call(this, config);
    _.forOwn(config.methods, function (collectionMethods, name) {
        this[name] = collectionMethods;
    }, this);
}

util.inherits(MongoDBCollection, BasytBaseCollection);
MongoDBCollection.prototype.adapter = _.extend({}, BasytBaseCollection.adapter, adapter);


