const LocationService = require('../services/location.service');

exports.filterProvince = async (req, res, next) => {
  try {
    const list = LocationService.getProvinces();
    res.status(200).json({
      success: true,
      data: list,
      message: 'Lấy danh sách tỉnh/thành phố thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.filterDistrict = async (req, res, next) => {
  try {
    const { provinceId } = req.body;
    if (!provinceId) {
      res.status(400);
      throw new Error('Thiếu provinceId');
    }
    const list = LocationService.getDistricts(provinceId);
    res.status(200).json({
      success: true,
      data: list,
      message: 'Lấy danh sách quận/huyện thành công'
    });
  } catch (error) {
    next(error);
  }
};

exports.filterWard = async (req, res, next) => {
  try {
    const { districtId } = req.body;
    if (!districtId) {
      res.status(400);
      throw new Error('Thiếu districtId');
    }
    const list = LocationService.getWards(districtId);
    res.status(200).json({
      success: true,
      data: list,
      message: 'Lấy danh sách phường/xã thành công'
    });
  } catch (error) {
    next(error);
  }
};
