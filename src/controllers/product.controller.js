const Product = require('../models/product.model');
const ProductVariant = require('../models/productVariant.model');
const cloudinary = require('../config/cloudinary');

// funcion for list product
exports.getAll = async (req, res) => {
  try {
    const products = await Product.find({}).populate('category', 'name');
    res.json({
      success: true,
      count: products.length,
      data: products,
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
    const { name, description, price, category, stock, isActive, variants } = req.body;

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
      isActive: isActive || 'active',
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
    const { name, description, price, category, stock, isActive, variants } = req.body;

    const productData = {
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock) || 0,
      isActive: isActive || 'active',
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
