const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
  try {
    const form = new FormData();
    form.append('name', 'coffee terminal test 2');
    form.append('description', 'abcabc');
    form.append('price', '100000');
    form.append('category', '6a1013eca72ac68778a96ccb'); // Giả định ID
    form.append('stock', '100');
    form.append('isActive', '1');
    
    // Copy a real image to upload (use an image from public/images if available, or create a small valid image)
    const buf = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
    fs.writeFileSync('test2.png', buf);
    form.append('image', fs.createReadStream('test2.png'));

    const response = await axios.post('http://localhost:5000/api/v1/products', form, {
      headers: {
        ...form.getHeaders()
      }
    });

    console.log("SUCCESS:", response.data);
  } catch (error) {
    console.log("ERROR:", error.response ? error.response.data : error.message);
  } finally {
    if (fs.existsSync('test2.png')) fs.unlinkSync('test2.png');
  }
}

testUpload();
