var Promise = require('bluebird'),
    MongoDB = require("./connector");

var adapterValidateField = function (update, validation) {
        valid = this.validateField(update, validation);
        if (valid === false) errors.push([validation.field, validation.name]);
        return valid;
    },
    adapterValidateArray = function (update, validation) {
        valid = true;
        _.forEach(update[validation.field], function (item, index) {
            if (validation.mutates === true) {
                valid = true;
                try {
                    update[validation.field][index] = validation.func(item, validation.param, update, validation.field);
                }
                catch (e) {
                    valid = false;
                }
            }
            else {
                valid = validation.func(item, validation.param, update, validation.field);
            }
            return valid;
        });
        if (valid === false) errors.push([validation.field, validation.name]);
        return valid;
    };

var adapter = {
    create: function (entity) {
        var that = this;
        return this.collection.insert(entity)
            .then(function (result) {
                var entity_id;
                if (that.idField === '_id') {
                    entity_id = result._id;
                    that.adapter.fixIdField(result);
                }
                else {
                    entity_id = result[that.idField];
                    delete result._id;
                } 
                _.forEach(that.eventNames, function (name) {
                    var channelName = _.template(name, result);
                    that.publisher.publish(channelName, JSON.stringify({
                        eventName: 'entity:update:' + that.name,
                        data: {action: 'create', entity_id: entity_id}
                    }));
                });
                return that.afterSave(result, entity);
            });
    },
    read: function (original_query, options) {
        var that = this, query = _.clone(original_query);
        options = options || {depth: 0};

        return this.collection.findOne(query, options.projection || this.projection)
            .then(function (result) {
                if (result === null) {
                    throw new process.basyt.ErrorDefinitions.BasytError({message: 'Not Found'}, 404);
                }
                if (that.idField === '_id') {
                    that.adapter.fixIdField(result);
                }
                else {
                    delete result._id;
                }
                if (options.depth > 0 && that.relations.length > 0) {
                    var promises = [];
                    _.forEach(that.relations, function (rel) {
                        if (rel.visible === false) return true;
                        if (_.isUndefined(result[rel.field])) return true;
                        var entity = process.basyt.collections[rel.entity], query = {},
                            queryKey = rel.foreign || entity.idField;

                        if (rel.isArray) {
                            query[queryKey] = (queryKey === entity.idField) ? {$in: _.map(result[rel.field], entity.idFunction)} : {$in: result[rel.field]};
                            promises.push(entity.query(query, {depth: options.depth - 1})
                                .catch(process.basyt.ErrorDefinitions.BasytError, function (err) {
                                    return true; //we may catch the ones with orphan link. but we dont.
                                })
                                .then(function (pRes) {
                                    result[rel.role] = pRes;
                                }));
                        }
                        else {
                            query[queryKey] = (queryKey === entity.idField) ? entity.idFunction(result[rel.field]) : result[rel.field];
                            promises.push(entity.read(query, {depth: options.depth - 1})
                                .catch(process.basyt.ErrorDefinitions.BasytError, function (err) {
                                    return true; //we may catch the ones with orphan link. but we dont.
                                })
                                .then(function (pRes) {
                                    result[rel.role] = pRes;
                                }));
                        }

                    });
                    return Promise.all(promises).then(function () {
                        return that.afterRead(result, query, options);
                    });
                }
                else {
                    return that.afterRead(result, query, options);
                }

            });
    },
    update: function (original_query, original_update, options) {
        var that = this, query = _.clone(original_query), update = _.clone(original_update);
        options = options || {upsert: false};
        if (options.multi === true) {
            return this.collection.update(query, update, options)
                .then(function (result) {
                    return that.afterSave(null, update, query, options);
                });
        }
        else {
            return this.collection.findAndModify(_.extend({}, options, {
                query: query,
                update: update,
                fields: this.projection,
                new: true
            }))
                .then(function (result) {
                    if (result === null) {
                        throw new process.basyt.ErrorDefinitions.BasytError({message: 'Not Found'}, 404);
                    }
                    var entity_id;
                    if (that.idField === '_id') {
                        entity_id = result[0]._id;
                        that.adapter.fixIdField(result[0]);
                    }
                    else {
                        entity_id = result[0][that.idField];
                        delete result[0]._id;
                    }                    
                    _.forEach(that.eventNames, function (name) {
                        that.publisher.publish(_.template(name, result[0]), JSON.stringify({
                            eventName: 'entity:update:' + that.name,
                            data: {action: 'update', entity_id: entity_id}
                        }));
                    });
                    return that.afterSave(result[0], update, query, options);
                });
        }
    },
    'delete': function (original_query, options) {
        var that = this, query = _.clone(original_query);
        options = options || {};
        return this.collection.findAndModify(_.extend({}, options, {
            query: query,
            remove: true,
            fields: this.projection
        }))
            .then(function (result) {
                if (result[0] === null) {
                    throw new process.basyt.ErrorDefinitions.BasytError({message: 'Not Found'}, 404);
                }
                var entity_id;
                if (that.idField === '_id') {
                    entity_id = result[0]._id;
                    that.adapter.fixIdField(result[0]);
                }
                else {
                    entity_id = result[0][that.idField];
                    delete result[0]._id;
                }
                _.forEach(that.eventNames, function (name) {
                    that.publisher.publish(_.template(name, result[0]), JSON.stringify({
                        eventName: 'entity:update:' + that.name,
                        data: {action: 'delete', entity_id: entity_id}
                    }));
                });
                return that.afterDelete(query, options);
            });
    },
    query: function (original_query, options) {
        var that = this, query = _.clone(original_query);
        options = options || {};
        return this.collection.find(query, this.projection)
            .skip(options.skip)
            .limit(options.limit)
            .sort(options.sort)
            .toArray()
            .then(function (result) {
                if (that.idField === '_id')
                    _.map(result, that.adapter.fixIdField);
                if (result.length > 0 && options.depth > 0 && that.relations.length > 0) {
                    var promises = [], relIdArray = {};
                    _.forEach(that.relations, function (rel) {
                        if (rel.visible === false) return true;
                        relIdArray[rel.field] = {};
                        _.forEach(result, function (item, index) {
                            if (!_.isUndefined(item[rel.field])) {
                                if (rel.isArray) {
                                    _.forEach(item[rel.field], function (elem) {
                                        if (_.isUndefined(relIdArray[rel.field][elem])) {
                                            relIdArray[rel.field][elem] = [index];
                                        }
                                        else {
                                            relIdArray[rel.field][elem].push(index);
                                        }
                                    });
                                }
                                else {
                                    if (_.isUndefined(relIdArray[rel.field][item[rel.field]])) {
                                        relIdArray[rel.field][item[rel.field]] = [index];
                                    }
                                    else {
                                        relIdArray[rel.field][item[rel.field]].push(index);
                                    }
                                }
                            }
                        });
                    });
                    _.forEach(that.relations, function (rel) {
                        if (rel.visible === false) return true;
                        var entity = process.basyt.collections[rel.entity], query = {}, queryKey = rel.foreign || entity.idField, ids = _.keys(relIdArray[rel.field]);
                        query[queryKey] = (queryKey === entity.idField) ? {$in: _.map(ids, entity.idFunction)} : {$in: ids};
                        //query [rel.foreign || entity.idField] = {$in: _.keys(relIdArray[rel.field])};
                        promises.push(entity.query(query, {depth: options.depth - 1})
                            .catch(process.basyt.ErrorDefinitions.BasytError, function (err) {
                                return true; //we may catch the ones with orphan link. but we dont.
                            })
                            .then(function (list) {
                                _.forEach(list, function (pRes) {
                                    var key = rel.foreign === entity.idField ? 'id' : rel.foreign;
                                    var values = relIdArray[rel.field][pRes[key]];
                                    _.forEach(values, function (index) {
                                        if (!rel.isArray) {
                                            result[index][rel.role] = pRes;
                                        }
                                        else {
                                            if (_.isUndefined(result[index][rel.role])) {
                                                result[index][rel.role] = [pRes];
                                            }
                                            else {
                                                result[index][rel.role].push(pRes);
                                            }
                                        }

                                    });
                                });
                                return true;
                            }));
                    });
                    return Promise.all(promises).then(function () {
                        return that.afterQuery(result, query, options);
                    });
                }
                else {
                    return that.afterQuery(result, query, options);
                }
            });
    },
    count: function (original_query) {
        var that = this, query = _.clone(original_query);
        return this.collection.count(query)
            .then(function (result) {
                return that.afterQuery(result, query);
            });
    },
    drop: function () {
        var that = this;
        _.forEach(that.eventNames, function (name) {
            that.publisher.publish(_.template(name, {}), JSON.stringify({
                eventName: 'entity:update:' + that.name,
                data: {action: 'drop'}
            }));
        });
        return this.collection.drop();
    },
    validateQuery: function (query, options) {
        var errors = [], valid = true, queryOptions = this.queryOptions, relations = this.relations;
        if (_.isUndefined(this.validations)) {
            return [query, options];
        }
        if (!_.isUndefined(queryOptions)) {
            _.forOwn(options, function (value, option) {
                if ((queryOptions[option] === null) || (!_.isUndefined(queryOptions[option]) && options[option] !== queryOptions[option])) {
                    errors.push(['option', option]);
                    valid = false;
                    return false;
                }
            });
        }
        if (valid && _.isObject(query)) {
            if (!_.isUndefined(this.validations.query)) {
                //TODO handle $and and $or conditions
                _.forEach(this.validations.query, function (validation) {
                    if (_.isUndefined(query[validation.field])) {
                        return true;
                    }
                    if (validation.mutates) {
                        try {
                            if (_.isObject(query[validation.field])) {
                                if (!_.isUndefined(query[validation.field].$in)) {
                                    _.forEach(query[validation.field].$in, function (item, index) {
                                        query[validation.field].$in[index] = validation.func(item, validation.param, query, validation.field);
                                    });
                                }
                                if (!_.isUndefined(query[validation.field].$nin)) {
                                    _.forEach(query[validation.field].$in, function (item, index) {
                                        query[validation.field].$in[index] = validation.func(item, validation.param, query, validation.field);
                                    });
                                }
                                _.forEach(['$gt', '$gte', '$lt', '$lte', '$ne'], function (op) {
                                    if (!_.isUndefined(query[validation.field][op])) {
                                        query[validation.field][op] = validation.func(query[validation.field][op], validation.param, query, validation.field);
                                    }
                                })
                            }
                            else {
                                query[validation.field] = validation.func(query[validation.field], validation.param);
                            }
                        }
                        catch (e) {
                            valid = false;
                        }
                    }
                    else {
                        if (_.isObject(query[validation.field])) {
                            if (!_.isUndefined(query[validation.field].$in)) {
                                _.forEach(query[validation.field].$in, function (val) {
                                    valid = validation.func(val);
                                    return valid;
                                })
                            }
                            if (!_.isUndefined(query[validation.field].$nin)) {
                                _.forEach(query[validation.field].$nin, function (val) {
                                    valid = validation.func(val);
                                    return valid;
                                })
                            }
                            _.forEach(['$gt', '$gte', '$lt', '$lte', '$ne'], function (op) {
                                if (!_.isUndefined(query[validation.field][op])) {
                                    valid = validation.func(query[validation.field][op]);
                                    return valid;
                                }
                            });
                        }
                        else {
                            valid = validation.func(query[validation.field]);
                        }
                    }
                    if (valid === false) errors.push(['query', validation.field]);
                    return valid;
                });
            }
        }
        if (valid) {
            if (query) {
                //handle relations for query
                _.forEach(relations, function (rel) {
                    if (_.isUndefined(query[rel.field]))
                        return true;

                    var collection = process.basyt.collections[rel.entity];
                    if (rel.foreign == collection.idField) {
                        if (_.isObject(query[rel.field])) {
                            if (!_.isUndefined(query[rel.field].$in)) {
                                query[rel.field].$in = _.map(query[rel.field].$in, collection.idFunction);
                            }
                            if (!_.isUndefined(query[rel.field].$nin)) {
                                query[rel.field].$nin = _.map(query[rel.field].$nin, collection.idFunction);
                            }
                            _.forEach(['$gt', '$gte', '$lt', '$lte', '$ne'], function (op) {
                                if (!_.isUndefined(query[rel.field][op])) {
                                    query[rel.field][op] = collection.idFunction(query[rel.field][op]);
                                }
                            })
                        }
                        else {
                            if (_.isArray(query[rel.field]) && rel.isArray) {
                                query[rel.field] = _.map(query[rel.field], collection.idFunction);
                            }
                            else {
                                query[rel.field] = collection.idFunction(query[rel.field]);
                            }
                        }
                    }
                });
            }
            return [query, options];
        }
        else {
            throw new process.basyt.ErrorDefinitions.InputError(errors);
        }
    },
    validateEntity: function (entity) {
        var errors = [], valid = true;
        if (_.isUndefined(this.validations) || _.isUndefined(this.validations.insert)) {
            return entity;
        }
        _.forEach(this.validations.insert, function (validation) {
            valid = this.validateField(entity, validation);
            if (valid === false) errors.push([validation.field, validation.name]);
            return valid;
        }, this);

        if (valid) {
            if (this.relations.length === 0) {
                return entity;
            }
            else {
                return this.adapter.verifyRelations.call(this, entity, true)
                    .then(function () {
                        return entity;
                    });
            }
        }
        else {
            throw new process.basyt.ErrorDefinitions.InputError(errors);
        }

    },
    validateUpdate: function (_query, _update, _options) {
        var validations = this.validations,
            adapter = this.adapter,
            relations = this.relations,
            update = {};
        if (_.isUndefined(validations)) {
            return [_query, _update, _options];
        }
        return Promise.resolve([_query, _options]).bind(this)
            .spread(this.adapter.validateQuery)
            .spread(function (query, options) {
                var valid = true, errors = [];
                _.forOwn(this.adapter.updateOperators, function (setup, operator) {
                    if (_.isObject(_update[operator])) {
                        if (setup === false) {
                            errors.push(['operator', operator]);
                            valid = false;
                        }
                        else {
                            update[operator] = _.clone(_update[operator]);
                            if(!_.isUndefined(validations.update[setup.opClass])) {                                
                                _.forEach(validations.update[setup.opClass], function (validation) {
                                    setup.validateFunc.call(this, update[operator], validation);
                                }, this);
                            }                
                        }        
                    }
                }, this);

                if (valid) {
                    if (relations.length === 0) {
                        return [query, update, options];
                    }
                    else if (_.isObject(update.$set) || _.isObject(update.$push) || _.isObject(update.$addToSet) || _.isObject(update.$pull)) {
                        return Promise.all([
                            adapter.verifyRelations.call(this, update.$set),
                            adapter.verifyRelations.call(this, update.$push),
                            adapter.verifyRelations.call(this, update.$addToSet)
                        ]).then(function () {
                            return [query, update, options];
                        });
                    }
                    else {
                        return [query, update, options];
                    }
                }
                else {
                    throw new process.basyt.ErrorDefinitions.InputError(errors);
                }
            });
    },
    fixIdField: function (entity) {
        if (entity && !_.isUndefined(entity._id)) {
            entity.id = entity._id;
            delete entity._id;
        }
        return entity;
    },
    verifyRelations: function (entity, insertion) {
        if (_.isUndefined(entity)) return true;
        var promises = [];
        _.forEach(this.relations, function (rel) {
            if (!_.isUndefined(entity[rel.field])) {                
                var query = {}, collection = process.basyt.collections[rel.entity], queryKey = rel.foreign || collection.idField, length;

                if (queryKey === collection.idField) {
                    if (_.isArray(entity[rel.field]) && rel.isArray) {
                        entity[rel.field] = _.map(entity[rel.field], collection.idFunction);
                    }
                    else {
                        entity[rel.field] = collection.idFunction(entity[rel.field]);
                    }

                }


                if(_.isArray(entity[rel.field])) {
                    var uniques = _.uniq(entity[rel.field]);
                    query[queryKey] = {$in: uniques};    
                    length = uniques.length;
                }
                else {
                    query[queryKey] = entity[rel.field];
                    length = 1;
                }                

                if (insertion && _.isObject(rel.transfer)) {
                    promises.push(MongoDB.collection(rel.entity).findOne(query)
                        .then(function (res) {
                            if (_.isNull(res)) {
                                throw new process.basyt.ErrorDefinitions.InputError([[rel.field, 'invalid']])
                            }
                            _.forOwn(rel.transfer, function (field, name) {
                                entity[name] = res[field];
                            });
                            return true;
                        }));
                }
                else {
                    promises.push(MongoDB.collection(rel.entity).count(query)
                        .then(function (count) {
                            if (count != length) {
                                throw new process.basyt.ErrorDefinitions.InputError([[rel.field, 'invalid']])
                            }
                            return true;
                        }));
                }
            }
        }, this);
        return Promise.all(promises);
    },
    updateOperators: {
        '$set': {
            opClass: 'setField',
            validateFunc: adapterValidateField
        },
        '$unset': {
            opClass: 'unsetField',
            validateFunc: adapterValidateField
        },
        '$inc': {
            opClass: 'setField',
            validateFunc: adapterValidateField
        },
        '$max': {
            opClass: 'setField',
            validateFunc: adapterValidateField
        },
        '$min': {
            opClass: 'setField',
            validateFunc: adapterValidateField
        },
        '$mul': {
            opClass: 'setField',
            validateFunc: adapterValidateField
        },
        '$currentDate': {
            opClass: 'setField',
            validateFunc: adapterValidateField
        },
        '$push': {
            opClass: 'setArray',
            validateFunc: adapterValidateArray
        },
        '$pull': {
            opClass: 'unsetArray',
            validateFunc: adapterValidateArray
        },
        '$addToSet': {
            opClass: 'setArray',
            validateFunc: adapterValidateArray
        },
        //rejected operators
        '$rename': false,
        '$pullAll': false
    }
};

module.exports = adapter;
