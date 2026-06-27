const Product = require('../models/product.model');
const ProductVariant = require('../models/productVariant.model');
const Category = require('../models/category.model');
const cloudinary = require('../config/cloudinary');
const exceljs = require('exceljs');

// funcion for list product
exports.getAll = async (req, res) => {
  try {
    const products = await Product.find({}).populate('category', 'name');
    const data = products.map(p => {
      const obj = p.toObject();
      obj.status = obj.isActive;
      return obj;
    });
    res.json({
      success: true,
      count: products.length,
      data,
      message: 'Lấy danh sách sản phẩm thành công',
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message || 'Lỗi server hệ thống!' });
  }
};

// funcion for single product info
exports.getById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    if (!product) {
      return res.json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }
    const variants = await ProductVariant.find({ product: product._id });
    res.json({
      success: true,
      data: {
        ...product.toObject(),
        status: product.isActive,
        variants,
      },
      message: 'Lấy chi tiết sản phẩm thành công',
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message || 'Lỗi server hệ thống!' });
  }
};

// funcion for add product
exports.create = async (req, res) => {
  try {
    const { name, description, price, category, stock, isActive, status, variants } = req.body;

    // Lấy toàn bộ mảng các file đã được multer upload (bất kể tên key là gì)
    const allImages = req.files || [];

    // Upload toàn bộ lên Cloudinary
    let uploadedUrls = await Promise.all(
      allImages.map(async (item) => {
        let result = await cloudinary.uploader.upload(item.path, {
          resource_type: 'image',
          folder: 'products',
        });
        return result.secure_url;
      }),
    );

    const productData = {
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock) || 0,
      isActive: isActive || status || 'active',
      // Ảnh chính là ảnh đầu tiên, danh sách ảnh phụ là tất cả các ảnh
      image: uploadedUrls.length > 0 ? uploadedUrls[0] : '',
      images: uploadedUrls,
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
          variantType: variant.variantType,
          name: variant.name,
          priceAdjustment: Number(variant.priceAdjustment) || 0,
          isActive: variant.isActive !== undefined ? variant.isActive : 'active',
        }));
        createdVariants = await ProductVariant.insertMany(variantsData);
      }
    }

    res.json({
      success: true,
      message: 'Đã thêm sản phẩm thành công',
      data: {
        ...product.toObject(),
        status: product.isActive,
        variants: createdVariants,
      },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message || 'Lỗi server hệ thống!' });
  }
};

// funcion for update product
exports.update = async (req, res) => {
  try {
    const { name, description, price, category, stock, isActive, status, variants } = req.body;

    const productData = {
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock) || 0,
      isActive: isActive || status || 'active',
    };

    // Lấy toàn bộ file ảnh mới tải lên (bất kể tên trường)
    const allImages = req.files || [];
    
    if (allImages.length > 0) {
      const imagesUrls = await Promise.all(
        allImages.map(async (item) => {
          const result = await cloudinary.uploader.upload(item.path, {
            resource_type: 'image',
            folder: 'products',
          });
          return result.secure_url;
        }),
      );
      
      // Nếu có ảnh, ảnh đầu tiên làm ảnh chính, còn lại lưu vào images
      productData.image = imagesUrls[0];
      productData.images = imagesUrls;
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, productData, {
      new: true,
    });

    if (!updatedProduct) {
      return res.json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    let updatedVariants = [];
    if (variants !== undefined) {
      let parsedVariants = [];
      try {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      } catch (e) {
        console.log('Failed to parse variants:', e);
      }

      if (Array.isArray(parsedVariants)) {
        // Xóa hết các biến thể cũ
        await ProductVariant.deleteMany({ product: req.params.id });
        // Thêm các biến thể mới nếu có
        if (parsedVariants.length > 0) {
          const variantsData = parsedVariants.map(variant => ({
            product: req.params.id,
            variantType: variant.variantType,
            name: variant.name,
            priceAdjustment: Number(variant.priceAdjustment) || 0,
            isActive: variant.isActive !== undefined ? variant.isActive : 'active',
          }));
          updatedVariants = await ProductVariant.insertMany(variantsData);
        }
      }
    } else {
      // Nếu không gửi lên variants mới, lấy các biến thể hiện tại
      updatedVariants = await ProductVariant.find({ product: req.params.id });
    }

    res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: {
        ...updatedProduct.toObject(),
        status: updatedProduct.isActive,
        variants: updatedVariants,
      },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message || 'Lỗi server hệ thống!' });
  }
};

// funcion for removing product
exports.remove = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }
    // Xóa tất cả các biến thể đi kèm sản phẩm
    await ProductVariant.deleteMany({ product: req.params.id });
    res.json({
      success: true,
      message: 'Đã xóa sản phẩm thành công',
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message || 'Lỗi server hệ thống!' });
  }
};

// function for importing products from Excel
exports.importExcel = async (req, res) => {
  try {
    const file = req.files && req.files.length > 0 ? req.files[0] : null;
    if (!file) {
      return res.json({ success: false, message: 'Vui lòng tải lên file Excel' });
    }

    const workbook = new exceljs.Workbook();
    if (file.path) {
      await workbook.xlsx.readFile(file.path);
    } else if (file.buffer) {
      await workbook.xlsx.load(file.buffer);
    } else {
      return res.json({ success: false, message: 'Định dạng file không được hỗ trợ' });
    }

    const worksheet = workbook.worksheets[0];
    const productsToInsert = [];
    const errors = [];
    const categoriesCache = {};

    // Lấy tất cả danh mục trước để tra cứu nhanh, tránh query async trong vòng lặp đồng bộ
    const categories = await Category.find({});
    categories.forEach(cat => {
      categoriesCache[cat.name.toLowerCase().trim()] = cat._id;
    });

    worksheet.eachRow((row, rowNumber) => {
      // Bỏ qua dòng tiêu đề
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

      // Xử lý imageUrl nếu excel format dưới dạng link
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

    res.json({
      success: true,
      message: `Đã import xong. Thành công: ${productsToInsert.length}, Lỗi: ${errors.length}`,
      data: {
        successCount: productsToInsert.length,
        errorCount: errors.length,
        errors
      }
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message || 'Lỗi xử lý file Excel' });
  }
};
