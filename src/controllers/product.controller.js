const Product = require('../models/product.model');
const cloudinary = require('../config/cloudinary');

// funcion for list product
exports.getAll = async (req, res) => {
  try {
    const products = await Product.find({}).populate('category', 'name');
    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// funcion for single product info
exports.getById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// funcion for add product
exports.create = async (req, res) => {
  try {
    const { name, description, price, category, stock, isActive } = req.body;

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
      isActive: Number(isActive) || 1,
      // Ảnh chính là ảnh đầu tiên, danh sách ảnh phụ là tất cả các ảnh
      image: uploadedUrls.length > 0 ? uploadedUrls[0] : '',
      images: uploadedUrls,
    };

    const product = new Product(productData);
    await product.save();

    res.json({
      success: true,
      message: 'Product Added',
      data: product,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// funcion for update product
exports.update = async (req, res) => {
  try {
    const { name, description, price, category, stock, isActive } = req.body;

    const productData = {
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock) || 0,
      isActive: Number(isActive) || 1,
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

    res.json({
      success: true,
      message: 'Product Updated',
      data: updatedProduct,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// funcion for removing product
exports.remove = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Product Removed',
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
