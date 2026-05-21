#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const name = process.argv[2];

if (!name) {
  console.error('Usage: node scripts/generate.js <resource-name>');
  console.error('Example: node scripts/generate.js product');
  process.exit(1);
}

const lower = name.toLowerCase();
const upper = lower.charAt(0).toUpperCase() + lower.slice(1);
const plural = lower.endsWith('s') ? lower : lower + 's';

const ROOT = path.join(__dirname, '..');

const files = {
  model:      path.join(ROOT, `src/models/${lower}.model.js`),
  service:    path.join(ROOT, `src/services/${lower}.service.js`),
  controller: path.join(ROOT, `src/controllers/${lower}.controller.js`),
  route:      path.join(ROOT, `src/api/routes/${lower}.route.js`),
  index:      path.join(ROOT, `src/api/index.js`),
};

['model', 'service', 'controller', 'route'].forEach((key) => {
  if (fs.existsSync(files[key])) {
    console.error(`File đã tồn tại: ${files[key]}`);
    process.exit(1);
  }
});

const modelTemplate = `const mongoose = require('mongoose');

const ${lower}Schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tên là bắt buộc'],
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('${upper}', ${lower}Schema);
`;

const serviceTemplate = `const ${upper} = require('../models/${lower}.model');

class ${upper}Service {
  static async getAll() {
    return await ${upper}.find({});
  }

  static async getById(id) {
    return await ${upper}.findById(id);
  }

  static async create(data) {
    return await ${upper}.create(data);
  }

  static async update(id, data) {
    return await ${upper}.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  static async delete(id) {
    return await ${upper}.findByIdAndDelete(id);
  }
}

module.exports = ${upper}Service;
`;

const controllerTemplate = `const ${upper}Service = require('../services/${lower}.service');

exports.getAll = async (req, res, next) => {
  try {
    const items = await ${upper}Service.getAll();
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const item = await ${upper}Service.getById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(\`Không tìm thấy ${lower} với ID: \${req.params.id}\`);
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const item = await ${upper}Service.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const item = await ${upper}Service.update(req.params.id, req.body);
    if (!item) {
      res.status(404);
      throw new Error(\`Không tìm thấy ${lower} với ID: \${req.params.id}\`);
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await ${upper}Service.delete(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error(\`Không tìm thấy ${lower} với ID: \${req.params.id}\`);
    }
    res.status(200).json({ success: true, data: {}, message: 'Đã xóa thành công' });
  } catch (error) {
    next(error);
  }
};
`;

const routeTemplate = `const express = require('express');
const ${upper}Controller = require('../../controllers/${lower}.controller');

const router = express.Router();

router.get('/search', ${upper}Controller.getAll);
router.post('/create', ${upper}Controller.create);
router.get('/:id/detail', ${upper}Controller.getById);
router.put('/:id/update', ${upper}Controller.update);
router.delete('/:id/delete', ${upper}Controller.remove);

module.exports = router;
`;

const swaggerPathsYaml = `
  /api/v1/${plural}/search:
    get:
      summary: Lấy danh sách ${lower}
      tags: [${upper}]
      responses:
        200:
          description: Danh sách ${lower}
  
  /api/v1/${plural}/create:
    post:
      summary: Tạo mới ${lower}
      tags: [${upper}]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
      responses:
        201:
          description: Tạo thành công
  
  /api/v1/${plural}/{id}/detail:
    get:
      summary: Lấy chi tiết một ${lower}
      tags: [${upper}]
      parameters:
        - in: path
          name: id
          schema:
            type: string
          required: true
          description: ID của ${lower}
      responses:
        200:
          description: Chi tiết ${lower}
        404:
          description: Không tìm thấy
  
  /api/v1/${plural}/{id}/update:
    put:
      summary: Cập nhật ${lower}
      tags: [${upper}]
      parameters:
        - in: path
          name: id
          schema:
            type: string
          required: true
          description: ID của ${lower}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        200:
          description: Cập nhật thành công
        404:
          description: Không tìm thấy
  
  /api/v1/${plural}/{id}/delete:
    delete:
      summary: Xóa ${lower}
      tags: [${upper}]
      parameters:
        - in: path
          name: id
          schema:
            type: string
          required: true
          description: ID của ${lower}
      responses:
        200:
          description: Xóa thành công
        404:
          description: Không tìm thấy
`;

const swaggerTagYaml = `  - name: ${upper}\n    description: API quản lý ${lower}\n`;

const swaggerSchemaYaml = `    ${upper}:
      type: object
      properties:
        _id:
          type: string
        name:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
`;

fs.writeFileSync(files.model, modelTemplate);
fs.writeFileSync(files.service, serviceTemplate);
fs.writeFileSync(files.controller, controllerTemplate);
fs.writeFileSync(files.route, routeTemplate);

let indexContent = fs.readFileSync(files.index, 'utf-8');
const requireLine = `const ${lower}Routes = require('./routes/${lower}.route');`;
const useLine = `router.use('/${plural}', ${lower}Routes);`;

if (!indexContent.includes(requireLine)) {
  indexContent = indexContent.replace(
    /^(const router = express\\.Router\\(\\);)/m,
    `${requireLine}\n\n$1`
  );

  indexContent = indexContent.replace(
    /^(module\\.exports = router;)/m,
    `${useLine}\n\n$1`
  );

  fs.writeFileSync(files.index, indexContent);
}

let swaggerDocsPath = path.join(ROOT, 'src/docs/swagger.yaml');
if (fs.existsSync(swaggerDocsPath)) {
  let swaggerContent = fs.readFileSync(swaggerDocsPath, 'utf8');

  const pathsInsertPoint = swaggerContent.indexOf('\ntags:');
  if (pathsInsertPoint !== -1) {
    swaggerContent = swaggerContent.slice(0, pathsInsertPoint) + swaggerPathsYaml + swaggerContent.slice(pathsInsertPoint);
  }

  const tagsInsertPoint = swaggerContent.indexOf('\ncomponents:');
  if (tagsInsertPoint !== -1) {
    swaggerContent = swaggerContent.slice(0, tagsInsertPoint) + '\n' + swaggerTagYaml + swaggerContent.slice(tagsInsertPoint);
  }

  swaggerContent = swaggerContent + swaggerSchemaYaml;

  fs.writeFileSync(swaggerDocsPath, swaggerContent, 'utf8');
}

console.log(`\nDone! Resource "${lower}" đã được tạo thành công.`);
