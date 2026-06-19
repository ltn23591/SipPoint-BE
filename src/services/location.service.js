class LocationService {
  static getProvinces() {
    return [
      { id: '01', name: 'Thành phố Hà Nội' },
      { id: '79', name: 'Thành phố Hồ Chí Minh' },
      { id: '48', name: 'Thành phố Đà Nẵng' },
    ];
  }

  static getDistricts(provinceId) {
    const districts = {
      '01': [
        { id: '001', name: 'Quận Ba Đình', provinceId: '01' },
        { id: '002', name: 'Quận Hoàn Kiếm', provinceId: '01' },
        { id: '003', name: 'Quận Tây Hồ', provinceId: '01' },
        { id: '004', name: 'Quận Cầu Giấy', provinceId: '01' },
      ],
      '79': [
        { id: '760', name: 'Quận 1', provinceId: '79' },
        { id: '761', name: 'Quận 12', provinceId: '79' },
        { id: '764', name: 'Quận Gò Vấp', provinceId: '79' },
        { id: '769', name: 'Quận 2 (TP. Thủ Đức)', provinceId: '79' },
      ],
      '48': [
        { id: '490', name: 'Quận Hải Châu', provinceId: '48' },
        { id: '491', name: 'Quận Thanh Khê', provinceId: '48' },
        { id: '492', name: 'Quận Sơn Trà', provinceId: '48' },
      ],
    };
    return districts[provinceId] || [];
  }

  static getWards(districtId) {
    const wards = {
      // Ba Đình
      '001': [
        { id: '00001', name: 'Phường Phúc Xá', districtId: '001' },
        { id: '00004', name: 'Phường Trúc Bạch', districtId: '001' },
      ],
      // Hoàn Kiếm
      '002': [
        { id: '00037', name: 'Phường Đồng Xuân', districtId: '002' },
        { id: '00040', name: 'Phường Hàng Mã', districtId: '002' },
      ],
      // Quận 1
      '760': [
        { id: '26734', name: 'Phường Bến Nghé', districtId: '760' },
        { id: '26737', name: 'Phường Bến Thành', districtId: '760' },
        { id: '26740', name: 'Phường Cô Giang', districtId: '760' },
      ],
      // Hải Châu
      '490': [
        { id: '20209', name: 'Phường Thạch Thang', districtId: '490' },
        { id: '20212', name: 'Phường Thanh Bình', districtId: '490' },
      ]
    };
    return wards[districtId] || [];
  }
}

module.exports = LocationService;
