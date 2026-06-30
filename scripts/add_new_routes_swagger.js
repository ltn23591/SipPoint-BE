const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const yamlPath = path.join(__dirname, '../src/docs/swagger.yaml');
const fileContent = fs.readFileSync(yamlPath, 'utf8');
const spec = YAML.parse(fileContent);

// Helper to construct "How to test" descriptions
const getInstruction = (method, p, _summary) => {
  const isAuthRequired = true; // All new routes require token authentication

  let steps = [];
  steps.push(`### Cách kiểm thử (How to test):`);

  if (isAuthRequired) {
    steps.push(`1. **Yêu cầu Token**: Hãy chắc chắn bạn đã đăng nhập và dán Token vào nút **Authorize** màu xanh ở góc trên bên phải.`);
  }

  steps.push(`${isAuthRequired ? '2' : '1'}. Nhấp chọn nút **Try it out** ở góc phải của API.`);

  let stepIdx = isAuthRequired ? 3 : 2;

  // Path parameters
  const pathParams = p.match(/\{([^}]+)\}/g);
  if (pathParams) {
    const paramNames = pathParams.map(param => param.replace(/[{}]/g, ''));
    steps.push(`${stepIdx++}. Điền giá trị cho tham số trong URL path (${paramNames.join(', ')}).`);
  }

  // Request Body
  if (method === 'post' || method === 'put' || method === 'patch') {
    steps.push(`${stepIdx++}. Kiểm tra hoặc nhập dữ liệu đầu vào phù hợp trong phần **Request Body**.`);
  }

  steps.push(`${stepIdx++}. Nhấp **Execute** để gửi yêu cầu và nhận kết quả trả về phía dưới.`);

  return steps.join('\n\n');
};

// Define new endpoints
const newPaths = {
  '/api/v1/auth/change-password': {
    put: {
      summary: 'Đổi mật khẩu tài khoản đang đăng nhập',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['currentPassword', 'newPassword'],
              properties: {
                currentPassword: {
                  type: 'string',
                  description: 'Mật khẩu hiện tại'
                },
                newPassword: {
                  type: 'string',
                  minLength: 6,
                  description: 'Mật khẩu mới (tối thiểu 6 ký tự)'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': { description: 'Đổi mật khẩu thành công' },
        '400': { description: 'Sai mật khẩu cũ hoặc lỗi mật khẩu không hợp lệ' },
        '401': { description: 'Chưa đăng nhập (Không có token)' }
      }
    }
  },
  '/api/v1/orders/confirm/{id}': {
    patch: {
      summary: 'Xác nhận đơn hàng (Chuyển sang CONFIRMED)',
      tags: ['Order'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          schema: { type: 'string' },
          required: true,
          description: 'ID đơn hàng cần xác nhận'
        }
      ],
      responses: {
        '200': { description: 'Xác nhận đơn hàng thành công' },
        '404': { description: 'Không tìm thấy đơn hàng' }
      }
    }
  },

  '/api/v1/orders/complete/{id}': {
    patch: {
      summary: 'Hoàn tất đơn hàng (Chuyển sang COMPLETED)',
      tags: ['Order'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          schema: { type: 'string' },
          required: true,
          description: 'ID đơn hàng cần hoàn tất'
        }
      ],
      responses: {
        '200': { description: 'Hoàn tất đơn hàng thành công' },
        '404': { description: 'Không tìm thấy đơn hàng' }
      }
    }
  },

  '/api/v1/orders/cancel/{id}': {
    patch: {
      summary: 'Hủy đơn hàng kèm lý do',
      tags: ['Order'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          schema: { type: 'string' },
          required: true,
          description: 'ID đơn hàng cần hủy'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: {
                reason: {
                  type: 'string',
                  description: 'Lý do hủy đơn hàng'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': { description: 'Hủy đơn hàng thành công' },
        '404': { description: 'Không tìm thấy đơn hàng' }
      }
    }
  },

  '/api/v1/orders/update-status': {
    patch: {
      summary: 'Cập nhật trạng thái đơn hàng',
      tags: ['Order'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                id: {
                  type: 'string',
                  description: 'ID đơn hàng (Tùy chọn)'
                },
                orderId: {
                  type: 'string',
                  description: 'ID đơn hàng (Tùy chọn thay thế)'
                },
                status: {
                  type: 'string',
                  description: 'Trạng thái mới: PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': { description: 'Cập nhật trạng thái đơn hàng thành công' },
        '404': { description: 'Không tìm thấy đơn hàng' }
      }
    }
  }
};

// Add new paths and generate test instructions
Object.keys(newPaths).forEach(p => {
  spec.paths[p] = newPaths[p];
  Object.keys(spec.paths[p]).forEach(method => {
    const op = spec.paths[p][method];
    op.description = getInstruction(method, p, op.summary);
  });
});

// Stringify back with formatting settings
const updatedYaml = YAML.stringify(spec, { indent: 2, lineWidth: 0 });
fs.writeFileSync(yamlPath, updatedYaml, 'utf8');
console.log('Successfully updated swagger.yaml with all new endpoints and instructions!');
