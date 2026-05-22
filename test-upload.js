const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    const form = new FormData();
    form.append('name', 'coffee terminal test');
    form.append('description', 'abcabc');
    form.append('price', '100000');
    form.append('category', '6a1013eca72ac68778a96ccb'); // Giả định ID
    form.append('stock', '100');
    form.append('isActive', '1');
    
    // Tạo 1 file giả
    fs.writeFileSync('test.jpg', 'fake image content');
    form.append('image', fs.createReadStream('test.jpg'));

    const response = await axios.post('http://localhost:5000/api/v1/products', form, {
      headers: {
        ...form.getHeaders()
      }
    });

    console.log("SUCCESS:", response.data);
  } catch (error) {
    console.log("ERROR:", error.response ? error.response.data : error.message);
  } finally {
    if (fs.existsSync('test.jpg')) fs.unlinkSync('test.jpg');
  }
}

testUpload();
