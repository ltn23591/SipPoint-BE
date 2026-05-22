const Product = require('../models/product.model');

class ProductService {
  /**
   * Lấy danh sách sản phẩm (có phân trang, tìm kiếm, lọc theo danh mục)
   */
  static async getAll(query = {}) {
    const filter = {};
    if (query.keyword) {
      filter.name = { $regex: query.keyword, $options: 'i' };
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.isActive !== undefined) {
      filter.isActive = Number(query.isActive);
    }

    let sort = '-createdAt';
    if (query.sortBy) {
      const parts = query.sortBy.split(':');
      sort = { [parts[0]]: parts[1] === 'desc' ? -1 : 1 };
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .populate('category', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id) {
    return await Product.findById(id).populate('category', 'name');
  }

  static async create(body, files) {
    if (!body.name) throw new Error('Vui lòng nhập tên sản phẩm');
    if (!body.price) throw new Error('Vui lòng nhập giá sản phẩm');
    if (!body.category) throw new Error('Vui lòng chọn danh mục (category)');

    const productData = { ...body };

    // Xử lý file ảnh được tải lên từ multer
    if (files) {
      if (files['image'] && files['image'][0]) {
        productData.image = files['image'][0].filename;
      }
      if (files['images']) {
        productData.images = files['images'].map(file => file.filename);
      }
    }

    if (!productData.image) {
      throw new Error('Vui lòng tải lên hình ảnh (image) chính cho sản phẩm');
    }

    return await Product.create(productData);
  }

  static async update(id, body, files) {
    const productData = { ...body };

    // Xử lý file ảnh được tải lên từ multer
    if (files) {
      if (files['image'] && files['image'][0]) {
        productData.image = files['image'][0].filename;
      }
      if (files['images']) {
        productData.images = files['images'].map(file => file.filename);
      }
    }

    const item = await Product.findByIdAndUpdate(id, productData, {
      new: true,
      runValidators: true,
    });

    return item;
  }

  static async delete(id) {
    return await Product.findByIdAndDelete(id);
  }
}

module.exports = ProductService;
