### installation
```
npm i -g code-swagger-generator
```

### usage
```shell
code-swagger-generator [project-name] [base-url] [project-folder-path] [output-file-path]
```

use [apidocjs](http://apidocjs.com) for route documentation formats, and automatically have your docs converted to swagger

### model examples
```js
/**
 * @apiDefine ListQueryParams
 * Handles querying on a particular collection
 * @apiParam {Number} [_limit] limit response length
 * @apiParam {Number} [_skip] skip the given amount of data
 * @apiParam {String} [_sort] sort by data eg "createdAt:1" in ASC, "createdAt:-1" in DESC
 * @apiParam {String} [_populate] populate dependencies eg 'user'
 * @apiParam {Boolean} [_count] if specified, returns the number count of query result
 * @apiParam {String} [_select] select only specified properties eg 'username,email' exclude '-email,-password'
 */

/**
* @apiDefine PopulateQueryParam
* @apiParam {String} [_populate] populate dependencies eg 'user'
* @apiParam {String} [_select] select only specified properties eg 'username,email' exclude '-email,-password'
*/

/**
 * @apiDefine Authentication
 * Handles requests that require authentication
 * @apiHeader {String} [authorization] jwt authorization token
 * @apiHeaderExample {json} Authorization-Example:
 *     {
 *       "Authorization": "Bearer {jwt token}"
 *     }
 */

/**
* @apiDefine OtherModelParams
* @apiParam {String} [createdAt] date of creation
* @apiParam {String} [updatedAt] date of last update
*/

/**
 * @apiModel ModelCreateDestinationAccountManager
 * @apiParam {String="CRYPTO,FIAT"} [type] type property
 * @apiParam {String} account account property
 * @apiParam {String} accountReservation accountReservation property
 * @apiParam {String} refId refId property
 * @apiParam {Any} [data] data(Mixed) property
 * @apiParam {String} [currentPayment] currentPayment(ObjectId) property
 * @apiParam {Boolean} [acquired] acquired property
 */

/**
 * @apiModel ModelUpdateDestinationAccountManager
 * @apiParam {String="CRYPTO,FIAT"} [type] type property
 * @apiParam {String} [account] account property
 * @apiParam {String} [accountReservation] accountReservation property
 * @apiParam {String} [refId] refId property
 * @apiParam {#ModelDestinationAccountManager} [data] data(Mixed) property
 * @apiParam {String} [currentPayment] currentPayment(ObjectId) property
 * @apiParam {Boolean} [acquired] acquired property
 */

/**
 * @apiDefine ModelDestinationAccountManager
 * @apiSuccess {String="CRYPTO,FIAT"} type type property
 * @apiSuccess {String} account account property
 * @apiSuccess {String} accountReservation accountReservation property
 * @apiSuccess {String} refId refId property
 * @apiSuccess {Any} data data(Mixed) property
 * @apiSuccess {String} currentPayment currentPayment(ObjectId) property
 * @apiSuccess {Boolean} acquired acquired property
 */

```

### route description format (github Markdown)
```js
/**
* @apiDescribe Description
# Header1
This is a multi line md description
# Header2
It would be used in the docs as md
*/
```

### route examples
```js
/**
 * @api {get} /crypto-pay/destinationAccountManagers/:id Get destinationAccountManager by id
 * @apiName GetDestinationAccountManager
 * @apiGroup DestinationAccountManager
 *
 * @apiUse Authentication
 * @apiParam {String} id id of destinationAccountManager to retrieve
 * @apiParam {String} [populate] populate dependencies eg "user,..."
 * @apiParam {String} name name of destinationAccountManager to retrieve
 * @apiParam {String} age age of destinationAccountManager to retrieve
 * @apiUse PopulateQueryParam 
 * @apiResponse 200 #ModelDestinationAccountManager success response
 * @apiResponse 404 #ModelCreateDestinationAccountManager error response
 */

 /**
 * @api {put} /crypto-pay/destinationAccountManagers/:id Update destinationAccountManager by id
 * @apiName UpdateDestinationAccountManager
 * @apiDescription #Description
 * @apiGroup DestinationAccountManager
 *
 * @apiUse Authentication
 * @apiParam {String} id id of destinationAccountManager to retrieve
 * @apiParam {String} name name of destinationAccountManager to retrieve
 * @apiParam {String} age age of destinationAccountManager to retrieve
 * @apiBody default #ModelCreateDestinationAccountManager
 * @apiConsumes application/json
 * @apiProduces application/json
 * @apiResponse 200 #ModelDestinationAccountManager success response
 * @apiResponse 404 #ModelCreateDestinationAccountManager error response
 */
```

### disclaimer
this tool is still under development, user's descretion is adviced
