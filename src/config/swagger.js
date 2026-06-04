const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Node.js Express API Documentation (JavaScript)',
      version: '1.0.0',
      description: 'Tài liệu API đã được chuyển đổi sang JS và bổ sung JWT Auth',
    },
    servers: [
      {
        url: '/',
        description: 'Default Server (Dynamic)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/docs/*.yaml'],
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  const uiOptions = {
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js'
    ]
  };
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, uiOptions));
  
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

};

module.exports = setupSwagger;
