const {
  template,
  templateSettings,
  filter,
  map, toUpper, first,
  last, camelCase, keys,
  pickBy, forEach,
  flattenDeep, values, lowerCase,
  escape, toLower
} = require('lodash');
const fs = require('fs');

templateSettings.interpolate = /{{([\s\S]+?)}}/g;

let head =
  `swagger: "2.0"
info:
  version: "0.0.1"
  title: {{title}}
schemes:
# tip: remove http to make production-grade
- http
- https
# format of the responses to the client (Accepts)
host: {{host}}
basePath: {{basePath}}
`;

let pathHeader = `
  {{path}}:
    x-swagger-router-controller: {{controllerName}}
    x-a127-apply:       
      defaultQuota: {}`;

let pathHeaderNoQuota = `
  {{path}}:
    x-swagger-router-controller: {{controllerName}}`;

let pathDefinition = `
    {{method}}:
      summary: {{summary}}
      description: {{description}}
      operationId: {{operationId}}
      consumes: 
        {{consumes}}
      produces: 
        {{produces}}
      tags: 
        - {{tag}}`;

let parametersHeader = `
      parameters:`;

let parameterBasic = `
        - in: {{location}}
          name: {{name}}
          description: {{description}}
          required: {{required}}`;

let parameterBody = `
        - in: {{requestLocation}}
          name: {{name}}
          schema:
            $ref: "#/definitions/{{modelName}}"`;

let responseDefinition = `
      responses:
        default:
          description: Default Response 
          schema:
            $ref: "#/definitions/DefaultResponse"`;

let genericResponseDefinition = `
        {{code}}:
          description: {{description}}
          schema:
            $ref: "#/definitions/{{modelName}}"`;

// templates
let docHeadTemplate = template(head);
let pathHeaderTemplate = template(pathHeader);
let pathHeaderNoQuotaTemplate = template(pathHeaderNoQuota);
let pathDefinitionTemplate = template(pathDefinition);
let parametersHeaderTemplate = template(parametersHeader);
let parameterBasicTemplate = template(parameterBasic);
let parameterBodyTemplate = template(parameterBody);
let responseDefinitionTemplate = template(responseDefinition);
let genericResponseDefinitionTemplate = template(genericResponseDefinition);

// regular expressions
let codeFileRegex = /\.(?:js|go)$/;
let regexStart = /\/\*{2}/;
let regexEnd = /\*\//;
let definitionRegex = /\@apiDefine\s{1,}(\w{1,})/;
let modelDefinitionRegex = /\@apiModel\s{1,}(\w{1,})/;
let routeRegex = /\@api\s\{(\w{1,})\}\s{1,}([\w\/\:\-]{1,})\s{1,}([\w\s]{1,}\w)/;
let paramRegex = /\@apiParam\s(\(\w{1,}\)\s)?\{([^\s]{1,})\}\s\[?([\w\.]{1,}(?:\[\])?)(?:[\d\.\{\}]{1,})?\=?\w{0,}\]?\s?([^\n]{0,})/;
let headerRegex = /\@apiHeader\s(\(\w{1,}\)\s)?\{([^\s]{1,})\}\s([\w\[\]]{1,})\=?\w{0,}\s?([^\n\*]{0,})/;
let typeRegex = /\{([#\w]{1,})((?:\[\])?)(?:\{([^}]{1,})\})?\=?(?:([^}]{1,}))?\}/;
let apiNameRegex = /\@apiName\s(\w*)/;
let apiGroupRegex = /\@apiGroup\s(\w*)/;
let apiUseRegex = /\@apiUse\s(\w*)/;
let apiBodyRegex = /\@apiBody\s([\w]*)\s([#\w]*)/;
let apiDescribeRegex = /\@apiDescribe\s([\w]*)/;
let apiDescriptionRegex = /\@apiDescription\s([#\w]*)/;
let apiConsumesRegex = /\@apiConsumes\s([\w/]*)/;
let apiProducesRegex = /\@apiProduces\s([\w/]*)/;
let apiResponseRegex = /\@apiResponse\s([\w]*)\s([#\w]*)\s([\w]*)/;

/**
 * 
 * @param {String} string 
 */
let firstUpCase = (string) => {
  return toUpper(string[0]) + string.substr(1)
}

/**
 * @param {String} data 
 */
let getRange = (data) => {
  if (data.match(/\d{0,}\.{2}\d{0,}/)) {
    let parts = data.split('..');
    let result = {};
    if (Number(parts[0]) > 0) result['minLength'] = Number(parts[0]);
    if (Number(parts[1]) > 0) result['maxLength'] = Number(parts[1]);
    return result;
  }
  if (data.match(/\d{0,}\-\d{0,}/)) {
    let parts = data.split('-');
    let result = {};
    if (Number(parts[0]) > 0) result['min'] = Number(parts[0]);
    if (Number(parts[1]) > 0) result['max'] = Number(parts[1]);
    return result;
  }
}

let getType = (data) => {
  let parts = typeRegex.exec(`{${data}}`);
  if (!parts[2] && !parts[3]) return firstUpCase(parts[1]);
  if (parts[2] && parts[2] === '[]') {
    return {
      type: 'Array',
      items: firstUpCase(parts[1])
    }
  }
  let result = {
    type: firstUpCase(parts[1])
  }
  if (parts[3]) {
    result['range'] = getRange(parts[2]);
  }
  if (parts[4]) {
    result['enum'] = parts[3].replace(/[\'\"]/g, '').split(',');
  }
  return result;
}

let getConsumes = (arr) => {
  let params = [];
  arr.forEach((line) => {
    if (apiConsumesRegex.test(line)) {
      let parts = apiConsumesRegex.exec(line);
      params.push(parts[1]);
    }
  });
  return params.length > 0 ? params : ['application/json'];
}

let getProduces = (arr) => {
  let params = [];
  arr.forEach((line) => {
    if (apiProducesRegex.test(line)) {
      let parts = apiProducesRegex.exec(line);
      params.push(parts[1]);
    }
  });
  return params.length > 0 ? params : ['application/json'];
}

let getResponses = (arr) => {
  let params = [];
  arr.forEach((line) => {
    if (apiResponseRegex.test(line)) {
      let parts = apiResponseRegex.exec(line);
      params.push({
        code: parts[1],
        modelName: parts[2].slice(1),
        description: parts[3],
      });
    }
  });
  return params;
}

let getBody = (arr) => {
  let param = [];
  arr.forEach((line) => {
    if (apiBodyRegex.test(line)) {
      let parts = apiBodyRegex.exec(line);
      param.push({
        name: parts[1],
        model: parts[2].slice(1)
      });
    }
  });
  return param;
}

let getDescription = (arr) => {
  let param = [];
  arr.forEach((line) => {
    if (apiDescriptionRegex.test(line)) {
      let parts = apiDescriptionRegex.exec(line);
      param.push(parts[1].slice(1));
    }
  });
  return param;
}

let getParams = (arr) => {
  let params = {};
  arr.forEach((line) => {
    let regex;
    const isParam = paramRegex.test(line);
    const isHeader = headerRegex.test(line);
    if (isParam) regex = paramRegex;
    if (isHeader) regex = headerRegex;
    if ((isParam || isHeader) && line.indexOf('.') < 0) {
      let parts = regex.exec(line);
      let name = parts[3];
      let optional = false;
      if (name.match(/\[\w{1,}\]/)) {
        name = name.replace(/\]|\[/g, '');
        optional = true;
      }
      if (new RegExp(`\\[\\s{0,}${name}`).test(line)) {
        optional = true;
      }
      params[name] = { optional, type: getType(parts[2]), description: parts[4], header: isHeader };
    }
  });
  return params;
}

let processDefinitions = (arr, definitions) => {
  let start = first(arr);
  let params = {};
  if (definitionRegex.test(start)) {
    let name = definitionRegex.exec(start)[1];
    params = getParams(arr.slice(1));
    definitions[name] = params;
    return true;
  }
  if (modelDefinitionRegex.test(start)) {
    let name = modelDefinitionRegex.exec(start)[1];
    params = getParams(arr.slice(1));
    definitions[name] = params;
    return true;
  }
  return false;
}

let processDescriptions = (arr, descriptions) => {
  let start = first(arr);
  if (apiDescribeRegex.test(start)) {
    let name = apiDescribeRegex.exec(start)[1];
    descriptions[name] = arr.slice(1, arr.length - 1);
    return true;
  }
  return false;
}

let getRouteName = (arr) => {
  for (let line of arr) {
    if (apiNameRegex.test(line)) {
      return apiNameRegex.exec(line)[1];
    }
  }
  return '';
}

let getRouteGroup = (arr) => {
  for (let line of arr) {
    if (apiGroupRegex.test(line)) {
      return apiGroupRegex.exec(line)[1];
    }
  }
  return '';
}

let getRouteParamList = (path) => {
  let routeParamRegex = /\:(\w{1,})/g;
  let match = path.match(routeParamRegex);
  match = match ? match : [];
  return match.map((v) => v.replace(':', ''));
}

let resolveUses = (arr, definitions) => {
  let params = {};
  for (let line of arr) {
    if (apiUseRegex.test(line)) {
      let name = apiUseRegex.exec(line)[1];
      params = { ...params, ...definitions[name] };
    }
  }
  return params;
}

let processRoutes = (arr, routes, definitions, descriptions) => {
  let start = first(arr);
  let params = {};
  if (routeRegex.test(start)) {
    let parts = routeRegex.exec(start);
    let method = parts[1];
    let path = parts[2];
    let summary = parts[3];
    let name = getRouteName(arr.slice(1));
    let group = getRouteGroup(arr.slice(1));
    let params1 = resolveUses(arr.slice(1), definitions);
    let params2 = getParams(arr.slice(1));
    let consumes = getConsumes(arr.slice(1));
    let produces = getProduces(arr.slice(1));
    let responses = getResponses(arr.slice(1));
    let body = getBody(arr.slice(1));
    let description = getDescription(arr.slice(1));
    params = { ...params1, ...params2 };
    routes[`${toLower(method)};${path}`] = {
      controller: last(arr),
      method: camelCase(name),
      tag: group,
      summary,
      description: flattenDeep(map(description, (d) => descriptions[d])),
      routeParams: getRouteParamList(path),
      params,
      body,
      consumes,
      produces,
      responses,
    }
    return true;
  }
  return false;
}

let generateDocType = (type, spacing) => {
  let result = [];
  if (typeof type === 'string') result.push(`type: ${lowerCase(type)}`);
  else {
    if (lowerCase(type.type) === 'any') {
      if (type.description) {
        result.push(JSON.stringify({
          description: `${escape(type.description)}`
        }));
      } else {
        result.push(JSON.stringify({}));
      }
    } else if (type.type.startsWith && type.type.startsWith('#')) {
      // process references
      result.push(`$ref: "#/definitions/${type.type.slice(1)}"`);
    } else {
      // process type
      if (typeof type.type === 'object') {
        result.push(`type: ${lowerCase(type.type.type)}`);
      } else {
        result.push(`type: ${lowerCase(type.type)}`);
      }
      // process enums
      if (type.enum) {
        result.push(`enum: ${JSON.stringify(type.enum)}`);
      }
      // process arrays
      if (type.items || (type.type && type.type.items)) {
        result.push('items:');
        let items;
        if (typeof type.type === 'object') {
          items = type.type.items;
        } else {
          items = type.items;
        }
        if (items.startsWith('#')) {
          result.push(`  $ref: "#/definitions/${items.slice(1)}"`);
        } else {
          result.push(`  type: ${lowerCase(items)}`);
        }
      }
      // process ranges
      if (type.range) {
        forEach(type.range, (v, k) => {
          result.push(`${k}: ${v}`);
        });
      }
      // process descriptions
      if (type.description) {
        result.push(`description: '${escape(type.description)}'`);
      }
    }
  }
  let space = new Array(spacing).fill(' ').join('');
  return `${space}${result.join('\n' + space)}`;
}

let generateDocDefinitions = (models) => {
  let result = ['definitions:'];
  forEach(models, (modelProps, modelName) => {
    result.push(`  ${modelName}:`);
    result.push(`    type: object`);
    let required = keys(pickBy(modelProps, (value) => !value.optional));
    if (required.length > 0) {
      result.push(`    required:`);
      forEach(required, (name) => {
        result.push(`      - ${name}`);
      });
    }
    result.push(`    properties:`);
    forEach(modelProps, (data, name) => {
      result.push(`      ${name}:`);
      result.push(generateDocType(data, 8));
    });
    if (last(result).match('properties:')) result.pop();
  });
  return `\n${result.join('\n')}`;
}

let createDoc = (path, method, data, pathMap, models, addQuota) => {
  const pathHeaderTmpl = addQuota ? pathHeaderTemplate : pathHeaderNoQuotaTemplate;
  if (!pathMap[path]) pathMap[path] = [pathHeaderTmpl({ path: path.replace(/\:(\w{1,})/g, '{$1}'), controllerName: data.controller })];
  pathMap[path].push(pathDefinitionTemplate({
    method,
    summary: data.summary,
    description: `|\n${map(data.description, d => `        ${d}`).join('\n')}`,
    operationId: data.method,
    tag: data.tag,
    consumes: map(data.consumes, v => `- ${v}`).join('\n'),
    produces: map(data.produces, v => `- ${v}`).join('\n'),
  }));

  let params = keys(data.params);
  if (params.length > 0) {
    pathMap[path].push(parametersHeaderTemplate({}));
    // header params
    let headerParams = pickBy(data.params, (value) => value.header);
    forEach(headerParams, (param, key) => {
      pathMap[path].push(parameterBasicTemplate({ location: 'header', name: key, description: `'${escape(param.description)}'`, required: !param.optional }));
      pathMap[path].push('\n' + generateDocType(param.type, 10));
    });
    // path params
    let pathParams = pickBy(data.params, (value, key) => data.routeParams.indexOf(key) >= 0);
    forEach(pathParams, (param, key) => {
      pathMap[path].push(parameterBasicTemplate({ location: 'path', name: key, description: `'${escape(param.description)}'`, required: true }));
      pathMap[path].push('\n' + generateDocType(param.type, 10));
    });
    // other params
    let otherParams = pickBy(data.params, (value, key) => keys(headerParams).indexOf(key) < 0 && keys(pathParams).indexOf(key) < 0);
    forEach(otherParams, (param, key) => {
      if ((/object/i).test(param.type) ||
        (/object/i).test(param.type.type) ||
        (/any/i).test(param.type) ||
        (/any/i).test(param.type.type)) return;
      pathMap[path].push(parameterBasicTemplate({ location: 'query', name: key, description: `'${escape(param.description)}'`, required: !param.optional }));
      pathMap[path].push('\n' + generateDocType(param.type, 10));
    });
    switch (method) {
      case 'post':
      case 'put':
      case 'patch':
        models[firstUpCase(data.method)] = otherParams;
        forEach(data.body, b => {
          pathMap[path].push(parameterBodyTemplate({ requestLocation: 'body', name: b.name, modelName: b.model }));
        });
        break;
    }
    if (last(pathMap[path]).match('parameters:')) pathMap[path].pop();
  }
  pathMap[path].push(responseDefinitionTemplate({}));
  forEach(data.responses, (r) => {
    pathMap[path].push(genericResponseDefinitionTemplate({
      ...r,
    }));
  });
}

let getDirectoryFiles = (root, dir) => {
  let fileList;
  let base;
  if (dir) {
    fileList = fs.readdirSync(`${root}/${dir}`);
    base = `${root}/${dir}`;
  } else {
    fileList = fs.readdirSync(`${root}`);
    base = root;
  }
  fileList = map(fileList, (file) => {
    if (fs.lstatSync(`${base}/${file}`).isDirectory()) return getDirectoryFiles(`${base}`, file);
    return `${base}/${file}`;
  });
  return fileList;
};

let task = (title, host, ctrlFolder, outputFile, addQuota) => {
  let fileList = getDirectoryFiles(ctrlFolder)

  fileList = filter(flattenDeep(fileList), f => f.match(codeFileRegex));

  let definitions = {};
  let descriptions = {};
  let routes = {};
  let comments = [];
  let config = { title, host, basePath: '/' };

  for (let file of fileList) {
    let content = fs.readFileSync(file);
    content = content.toString();

    let lines = content.split('\n');
    let currentComment = [];
    let started = false;

    for (let line of lines) {
      if (regexStart.test(line)) {
        currentComment.length = 0;
        started = true;
        continue;
      }
      if (regexEnd.test(line)) {
        started = false;
        currentComment.push(file);
        if (!processDefinitions([...currentComment], definitions)) {
          comments.push([...currentComment]);
        }
        if (!processDescriptions([...currentComment], descriptions)) {
          comments.push([...currentComment]);
        }
        continue;
      }
      if (started) {
        currentComment.push(line);
      }
    }
  }

  // console.dir(definitions, { depth: 4 });

  for (let comment of comments) {
    processRoutes(comment, routes, definitions, descriptions);
  }

  // console.dir(routes, { depth: 6 });

  let pathMap = {};
  let models = {};
  let paths = keys(routes);
  paths.forEach((path) => {
    let parts = path.split(';');
    createDoc(parts[1], parts[0], routes[path], pathMap, models, addQuota);
  });

  console.dir(definitions, { depth: 6 });
  let docDefs = generateDocDefinitions(definitions);

  fs.writeFileSync(outputFile,
    flattenDeep([docHeadTemplate(config), 'paths:']
      .concat(values(pathMap), docDefs, `\n  DefaultResponse: {}`)
    ).join('')
  );
}

module.exports = {
  task
}
