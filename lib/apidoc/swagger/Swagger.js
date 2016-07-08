'use strict';

var _ = require('lodash'),
	stripTags = require('./../helpers/stripTags'),
	pathToRegexp = require('path-to-regexp');

function Swagger(projectJson) {
	this.config = {
		swagger: '2.0',
		info: {
			title: projectJson.title || projectJson.name,
			version: projectJson.version,
			description: projectJson.description,
			contact: {
				email: projectJson.author
			}
		},
		schemes: '',
		host: '',
		basePath: '',
		tags: [],
		paths: {},
		definitions: {}
	};
}

Swagger.prototype.parse = function (apidocJson) {
	this.config.paths = this.extractPaths(apidocJson);
	return this.config;
};

/**
 * Extracts paths provided in json format
 * post, patch, put request parameters are extracted in body
 * get and delete are extracted to path parameters
 * @param apidocJson
 * @returns {{}}
 */
Swagger.prototype.extractPaths = function (apidocJson) {
	var apiPaths = groupByUrl(apidocJson),
			paths = {};

	for (var i = 0; i < apiPaths.length; i++) {
		var verbs = apiPaths[i].verbs,
				url = apiPaths[i].url;

		paths[url] = this.createPaths(verbs);
	}
	return paths;
};

Swagger.prototype.createPaths = function (verbs) {
	var pathItemObject = {}, n = verbs.length;
	for(var i = 0; i < n; ++i) {
		var verb = verbs[i];
		pathItemObject[verb.type] = {
			tags: [verb.group],
			summary: verb.description,
			operationId: verb.name,
			consumes: [
				//TODO figure out how to
			],
			produces: [
				"application/json"
			],
			parameters: this.createParameters(verb),
			responses: this.createResponses(verb)
		};
	}
	return pathItemObject;
};

Swagger.prototype.createParameters = function (verb) {
	var parameters = {};

	return parameters;
};

Swagger.prototype.createResponses = function (verb) {
	var responses = {};
	_(['error', 'success']).forEach(function (operation) {
		var fields = _.get(verb, operation+'.fields', {}); // fields are grouped
		_(fields).forEach(function (field) {
			var n = field.length | 0;
			for(var i = 0; i < n; ++i) {
				var type = field[i],
						schema = {},
						responseCode = Number(type.field);
				
				if(isNaN(responseCode)) {
					responseCode = 200;
					schema = {
						type: _.lowerCase(type.type),
						items: {
							'$ref': '#/definitions/'+type.group
						}
					};
				}

				responses[responseCode] = _.omit({
					description: type.description,
					schema: schema
				}, _.isEmpty);
			}
		});
	});
	return responses;
};

/**
 * Generate get, delete method output
 * @param verbs
 * @param definitions
 *
 * @returns {{}}
 */
Swagger.prototype.createGetDeleteOutput = function(verbs) {
	var pathItemObject = {}, definitions = this.config.definitions;

	verbs.type = verbs.type === 'del' ? 'delete' : verbs.type;

	var verbDefinitionResult = createVerbDefinitions(verbs, definitions);
	pathItemObject[verbs.type] = {
		tags: [verbs.group],
		summary: stripTags(verbs.description),
		consumes: [
			'application/json'
		],
		produces: [
			'application/json'
		],
		parameters: createPathParameters(verbs)
	};

	if (verbDefinitionResult.topLevelSuccessRef) {
		pathItemObject[verbs.type].responses = {
			'200': {
				'description': 'successful operation',
				'schema': {
					'type': verbDefinitionResult.topLevelSuccessRefType,
					'items': {
						'$ref': '#/definitions/' + verbDefinitionResult.topLevelSuccessRef
					}
				}
			}
		};
	}
	return pathItemObject;
};

Swagger.prototype.createPostPushPutOutput = function (verbs, pathKeys) {
	var pathItemObject = {}, definitions = this.config.definitions;

	var verbDefinitionResult = createVerbDefinitions(verbs, definitions);

	var params = [];
	var pathParams = createPathParameters(verbs, pathKeys);
	pathParams = _.filter(pathParams, function (param) {
		var hasKey = pathKeys.indexOf(param.name) !== -1;
		return !(param.in === 'path' && !hasKey);
	});

	params = params.concat(pathParams);
	var required = verbs.parameter && verbs.parameter.fields && verbs.parameter.fields.Parameter.length > 0;

	params.push({
		'in': 'body',
		'name': 'body',
		'description': stripTags(verbs.description),
		'required': required,
		'schema': {
			'$ref': '#/definitions/' + verbDefinitionResult.topLevelParametersRef
		}
	});

	pathItemObject[verbs.type] = {
		tags: [verbs.group],
		summary: stripTags(verbs.description),
		consumes: [
			'application/json'
		],
		produces: [
			'application/json'
		],
		parameters: params
	};

	if (verbDefinitionResult.topLevelSuccessRef) {
		pathItemObject[verbs.type].responses = {
			'200': {
				'description': 'successful operation',
				'schema': {
					'type': verbDefinitionResult.topLevelSuccessRefType,
					'items': {
						'$ref': '#/definitions/' + verbDefinitionResult.topLevelSuccessRef
					}
				}
			}
		};
	}

	return pathItemObject;
};

function createVerbDefinitions(verbs, definitions) {
	var result = {
		topLevelParametersRef: null,
		topLevelSuccessRef: null,
		topLevelSuccessRefType: null
	};
	var defaultObjectName = verbs.name;

	var fieldArrayResult = {};
	if (verbs && verbs.parameter && verbs.parameter.fields) {
		fieldArrayResult = createFieldArrayDefinitions(verbs.parameter.fields.Parameter, definitions, verbs.name, defaultObjectName);
		result.topLevelParametersRef = fieldArrayResult.topLevelRef;
	}

	if (verbs && verbs.success && verbs.success.fields) {
		fieldArrayResult = createFieldArrayDefinitions(verbs.success.fields['Success 200'], definitions, verbs.name, defaultObjectName);
		result.topLevelSuccessRef = fieldArrayResult.topLevelRef;
		result.topLevelSuccessRefType = fieldArrayResult.topLevelRefType;
	}

	return result;
}

function createFieldArrayDefinitions(fieldArray, definitions, topLevelRef, defaultObjectName) {
	var result = {
		topLevelRef: topLevelRef,
		topLevelRefType: null
	};

	if (!fieldArray) {
		return result;
	}

	for (var i = 0; i < fieldArray.length; i++) {
		var parameter = fieldArray[i];

		var nestedName = createNestedName(parameter.field);
		var objectName = nestedName.objectName;
		if (!objectName) {
			objectName = defaultObjectName;
		}
		var type = parameter.type;
		if (i === 0) {
			result.topLevelRefType = type;
			if (parameter.type === 'Object') {
				objectName = nestedName.propertyName;
				nestedName.propertyName = null;
			} else if (parameter.type === 'Array') {
				objectName = nestedName.propertyName;
				nestedName.propertyName = null;
				result.topLevelRefType = 'array';
			}
			result.topLevelRef = objectName;
		}

		definitions[objectName] = definitions[objectName] ||
			{properties: {}, required: []};

		if (nestedName.propertyName) {
			var prop = {type: (parameter.type || '').toLowerCase(), description: stripTags(parameter.description)};
			if (parameter.type === 'Object') {
				prop.$ref = '#/definitions/' + parameter.field;
			}

			var typeIndex = type.indexOf('[]');
			if (typeIndex !== -1 && typeIndex === (type.length - 2)) {
				prop.type = 'array';
				prop.items = {
					type: type.slice(0, type.length - 2)
				};
			}

			definitions[objectName].properties[nestedName.propertyName] = prop;
			if (!parameter.optional) {
				var arr = definitions[objectName].required;
				if (arr.indexOf(nestedName.propertyName) === -1) {
					arr.push(nestedName.propertyName);
				}
			}

		}
	}

	return result;
}

function createNestedName(field) {
	var propertyName = field;
	var objectName;
	var propertyNames = field.split('.');
	if (propertyNames && propertyNames.length > 1) {
		propertyName = propertyNames[propertyNames.length - 1];
		propertyNames.pop();
		objectName = propertyNames.join('.');
	}

	return {
		propertyName: propertyName,
		objectName: objectName
	};
}

/**
 * Iterate through all method parameters and create array of parameter objects which are stored as path parameters
 * @param verbs
 * @oaram pathKeys
 *
 * @returns {Array}
 */
function createPathParameters(verbs, pathKeys) {
	pathKeys = pathKeys || [];

	var pathItemObject = [];
	if (verbs.parameter) {

		for (var i = 0; i < verbs.parameter.fields.Parameter.length; i++) {
			var param = verbs.parameter.fields.Parameter[i];
			var field = param.field;
			var type = param.type;
			pathItemObject.push({
				name: field,
				in: type === 'file' ? 'formData' : 'path',
				required: !param.optional,
				type: param.type.toLowerCase(),
				description: stripTags(param.description)
			});

		}
	}
	return pathItemObject;
}

function groupByUrl(apidocJson) {
	return _(apidocJson)
		.groupBy('url')
		.toPairs()
		.map(function (element) {
			return _.zipObject(['url', 'verbs'], element);
		})
		.value();
}

module.exports = Swagger;