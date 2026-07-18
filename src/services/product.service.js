const Product = require('../models/product.model');
const ProductVariant = require('../models/productVariant.model');
const Category = require('../models/category.model');
const cloudinary = require('../config/cloudinary');
const exceljs = require('exceljs');

class ProductService {
  /**
   * Lấy danh sách sản phẩm
   */
  static async getAll() {
    const products = await Product.find({}).sort({ createdAt: -1 }).populate('category', 'name').lean();
    return products.map(p => {
      p.status = p.isActive;
      return p;
    });
  }

  /**
   * Lấy chi tiết một sản phẩm
   */
  static async getById(id) {
    const product = await Product.findById(id).populate('category', 'name').lean();
    if (!product) return null;

    const variants = await ProductVariant.find({ product: product._id }).lean();
    return {
      ...product,
      status: product.isActive,
      variants,
    };
  }

  /**
   * Tạo sản phẩm mới
   */
  static async create(body, files) {
    const { name, description, price, category, stock, isActive, status, variants, image, images } = body;

    const allImages = files || [];
    const uploadedUrls = await Promise.all(
      allImages.map(async (item) => {
        const result = await cloudinary.uploader.upload(item.path, {
          resource_type: 'image',
          folder: 'products',
        });
        return result.secure_url;
      })
    );

    const finalImage = uploadedUrls.length > 0 ? uploadedUrls[0] : (image || '');
    const finalImages = uploadedUrls.length > 0 ? uploadedUrls : (images || (image ? [image] : []));

    const productData = {
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock) || 0,
      isActive: isActive || status || 'active',
      image: finalImage,
      images: finalImages,
    };

    const product = new Product(productData);
    await product.save();

    let createdVariants = [];
    if (variants) {
      let parsedVariants = [];
      try {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      } catch (e) {
        console.log('Failed to parse variants:', e);
      }

      if (Array.isArray(parsedVariants) && parsedVariants.length > 0) {
        const variantsData = parsedVariants.map(variant => ({
          product: product._id,
          name: variant.name,
          priceAdjustment: Number(variant.priceAdjustment) || 0,
          isActive: variant.isActive !== undefined ? variant.isActive : 'active',
        }));
        createdVariants = await ProductVariant.insertMany(variantsData);
      }
    }

    return {
      ...product.toObject(),
      status: product.isActive,
      variants: createdVariants,
    };
  }

  /**
   * Cập nhật sản phẩm
   */
  static async update(id, body, files) {
    const { name, description, price, category, stock, isActive, status, variants, image, images } = body;

    const productData = {
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock) || 0,
      isActive: isActive || status || 'active',
    };
    
    if (image) {
      productData.image = image;
      productData.images = images || [image];
    }

    const allImages = files || [];
    if (allImages.length > 0) {
      const imagesUrls = await Promise.all(
        allImages.map(async (item) => {
          const result = await cloudinary.uploader.upload(item.path, {
            resource_type: 'image',
            folder: 'products',
          });
          return result.secure_url;
        })
      );
      productData.image = imagesUrls[0];
      productData.images = imagesUrls;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, productData, { new: true });
    if (!updatedProduct) return null;

    let updatedVariants = [];
    if (variants !== undefined) {
      let parsedVariants = [];
      try {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      } catch (e) {
        console.log('Failed to parse variants:', e);
      }

      if (Array.isArray(parsedVariants)) {
        await ProductVariant.deleteMany({ product: id });
        if (parsedVariants.length > 0) {
          const variantsData = parsedVariants.map(variant => ({
            product: id,
            name: variant.name,
            priceAdjustment: Number(variant.priceAdjustment) || 0,
            isActive: variant.isActive !== undefined ? variant.isActive : 'active',
          }));
          updatedVariants = await ProductVariant.insertMany(variantsData);
        }
      }
    } else {
      updatedVariants = await ProductVariant.find({ product: id }).lean();
    }

    return {
      ...updatedProduct.toObject(),
      status: updatedProduct.isActive,
      variants: updatedVariants,
    };
  }

  /**
   * Xóa sản phẩm
   */
  static async delete(id) {
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (deletedProduct) {
      await ProductVariant.deleteMany({ product: id });
    }
    return deletedProduct;
  }

  /**
   * Import sản phẩm từ file Excel
   */
  static async importExcel(file) {
    if (!file) throw new Error('Vui lòng tải lên file Excel');

    const workbook = new exceljs.Workbook();
    if (file.path) {
      await workbook.xlsx.readFile(file.path);
    } else if (file.buffer) {
      await workbook.xlsx.load(file.buffer);
    } else {
      throw new Error('Định dạng file không được hỗ trợ');
    }

    const worksheet = workbook.worksheets[0];
    const productsToInsert = [];
    const errors = [];
    const categoriesCache = {};

    const categories = await Category.find({}).lean();
    categories.forEach(cat => {
      categoriesCache[cat.name.toLowerCase().trim()] = cat._id;
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const name = row.getCell(1).value;
      const description = row.getCell(2).value;
      const price = row.getCell(3).value;
      const categoryName = row.getCell(4).value;
      let imageUrl = row.getCell(5).value;
      const stock = row.getCell(6).value;

      if (!name || price == null || !categoryName) {
        errors.push({ row: rowNumber, message: 'Thiếu thông tin bắt buộc (Tên, Giá hoặc Tên Danh Mục)' });
        return;
      }

      if (imageUrl && typeof imageUrl === 'object') {
        imageUrl = imageUrl.hyperlink || imageUrl.text;
      }

      const catNameStr = categoryName.toString().toLowerCase().trim();
      const categoryId = categoriesCache[catNameStr];

      if (!categoryId) {
        errors.push({ row: rowNumber, message: `Không tìm thấy danh mục: ${categoryName}` });
        return;
      }

      productsToInsert.push({
        name: name.toString().trim(),
        description: description ? description.toString().trim() : '',
        price: Number(price),
        category: categoryId,
        image: imageUrl ? imageUrl.toString().trim() : '',
        images: imageUrl ? [imageUrl.toString().trim()] : [],
        stock: Number(stock) || 0,
        isActive: 'active'
      });
    });

    if (productsToInsert.length > 0) {
      await Product.insertMany(productsToInsert);
    }

    return {
      successCount: productsToInsert.length,
      errorCount: errors.length,
      errors
    };
  }
}

module.exports = ProductService;
