const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Node.js Express API Documentation (JavaScript)',
      version: '1.0.0',
      description: |
        ### Hướng dẫn kiểm thử API trên Swagger UI:
        1. **Đăng nhập/Đăng ký để lấy Token**:
           - Sử dụng API đăng nhập nhân viên tại `/api/v1/auth/login` (hoặc `/api/v1/auth/customer/login` dành cho khách hàng).
           - Copy chuỗi `token` hoặc `accessToken` nhận được từ phản hồi thành công.
        2. **Cấu hình Authenticate**:
           - Nhấp vào nút **Authorize** màu xanh lá ở phía góc trên bên phải trang Swagger.
           - Dán trực tiếp chuỗi token vừa copy vào ô nhập liệu (không cần viết thêm từ khóa "Bearer" vì Swagger đã tự động thêm tiền tố này dựa trên cấu hình Bearer Auth).
           - Nhấp **Authorize** rồi đóng hộp thoại lại.
        3. **Tiến hành kiểm thử**:
           - Chọn API bạn muốn kiểm thử, nhấp **Try it out**, điền các tham số hoặc Request Body rồi nhấp **Execute** để xem kết quả trả về.
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
