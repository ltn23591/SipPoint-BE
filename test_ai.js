const axios = require('axios');
axios.post('http://localhost:5000/api/v1/ai/chat', { message: 'hello', sessionId: 'test-123' })
  .then(res => console.log('SUCCESS:', res.data))
  .catch(err => {
     if (err.response) {
       console.log('RES DATA:', err.response.data);
     } else {
       console.log('NO RES:', err);
     }
  });
