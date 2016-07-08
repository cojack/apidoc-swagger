/**
 * @api {get} /user/:id Request User information
 * @apiName GetUser
 * @apiGroup User
 *
 * @apiParam {Number} id Users unique ID.
 *
 * @apiSuccess {String} firstname Firstname of the User.
 * @apiSuccess {String} lastname  Lastname of the User.
 */

/**
 * @apiDefine NotFound
 * @apiError {Object} 404 Not found
 */

/**
 * @apiDefine InvalidArguments
 * @apiError {Object} 400 Invalid ID supplied
 */

/**
 * @apiDefine SuccessOk
 * @apiSuccess {Object} 200 data
 */

/**
 * @apiDefine Success204
 * @apiSuccess {Empty} 204 empty
 */

/**
 * model
 *
 * @apiDefine Feature
 * @apiGroup Feature
 * @apiDescription Everything about features
 *
 * @apiParam {String} _id
 * @apiParam {String} name
 * @apiParam {String} desc
 * @apiParam {String} code
 */


/**
 * @api {get} /features
 * @apiName GetFeature
 * @apiGroup Feature
 * 
 * @apiSuccess (Feature) {Array} data features list
 */

/**
 * @api {post} /features
 * @apiName PostFeature
 * @apiGroup Feature
 * 
 * @apiParam (Feature) {Array} data
 */

/**
 * @api {put} /features
 * @apiName PutFeature
 * @apiGroup Feature
 */

/**
 * @api {get} /features/{id}
 * @apiName GetFeature
 * @apiGroup Feature
 */

/**
 * @api {put} /features/{id}
 * @apiName PutFeature
 * @apiGroup Feature
 */

/**
 * @api {delete} /features/{id}
 * @apiName DeleteFeature
 * @apiGroup Feature
 * @apiDescription Delete feature by id
 *
 * @apiParam {String} id Feature id
 * 
 * @apiUse InvalidArguments
 * @apiUse NotFound
 * @apiUse SuccessOk
 */