const CustomerRank = require('../models/customerRank.model');
const Customer = require('../models/customer.model');

class CustomerRankService {
  // Lấy danh sách hạng thẻ
  static async getAllRanks() {
    const ranks = await CustomerRank.find().sort({ minSpent: 1 });
    return {
      status: 200,
      success: true,
      data: ranks,
    };
  }

  // Thêm hạng thẻ mới
  static async createRank(data) {
    const existing = await CustomerRank.findOne({ name: data.name });
    if (existing) {
      return { status: 400, success: false, message: 'Tên hạng thẻ đã tồn tại' };
    }

    const newRank = await CustomerRank.create(data);
    return { status: 201, success: true, message: 'Tạo hạng thẻ thành công', data: newRank };
  }

  // Cập nhật hạng thẻ
  static async updateRank(id, data) {
    const updatedRank = await CustomerRank.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!updatedRank) {
      return { status: 404, success: false, message: 'Không tìm thấy hạng thẻ' };
    }

    // Khi hạng thẻ thay đổi mức chi tiêu (minSpent), 
    // bạn có thể trigger một background job để cập nhật lại toàn bộ Customer nếu cần.
    // Tuy nhiên để tối ưu, chúng ta có thể cập nhật hạng thẻ khi khách hàng phát sinh điểm,
    // hoặc quét định kỳ. Tạm thời chỉ cập nhật bản thân hạng thẻ.

    return { status: 200, success: true, message: 'Cập nhật thành công', data: updatedRank };
  }

  // Xóa hạng thẻ
  static async deleteRank(id) {
    const rank = await CustomerRank.findById(id);
    if (!rank) {
      return { status: 404, success: false, message: 'Không tìm thấy hạng thẻ' };
    }

    // Cập nhật các khách hàng đang ở hạng này về hạng thấp nhất
    // hoặc tính toán lại hạng (chạy logic auto rank). 
    // Tạm thời, reset về 'ĐỒNG' hoặc tự động update
    await CustomerRank.findByIdAndDelete(id);

    // Tính toán lại hạng cho toàn bộ khách hàng đang sở hữu hạng này
    const customersToUpdate = await Customer.find({ tier: rank.name });
    
    // Tìm các rank còn lại
    const remainingRanks = await CustomerRank.find().sort({ minSpent: -1 });

    for (let customer of customersToUpdate) {
      if (remainingRanks.length > 0) {
        const matchedRank = remainingRanks.find((r) => customer.totalSpent >= r.minSpent);
        customer.tier = matchedRank ? matchedRank.name : remainingRanks[remainingRanks.length - 1].name;
      } else {
        customer.tier = 'ĐỒNG';
      }
      await customer.save();
    }

    return { status: 200, success: true, message: 'Xóa hạng thẻ thành công và đã cập nhật lại hạng cho khách hàng' };
  }
}

module.exports = CustomerRankService;
