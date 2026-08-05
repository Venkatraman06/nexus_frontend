const axios = require('axios');
(async () => {
  try {
    const res = await axios.post('http://127.0.0.1:8000/pmt/api/v1/auth/token/', {
      username: 'HIT-001',
      password: 'password'
    });
    const token = res.data.access;
    console.log("Token acquired.");
    
    // Now make the PATCH request exactly like the frontend
    const patchRes = await axios.patch('http://127.0.0.1:8000/pmt/api/v1/todos/5e775424-010b-4e37-8df7-8da3371da8c2/', {
      comments: "Dharshini S (22 Jul 2026, 06:30 PM):\nhi"
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Patch Response Data:", patchRes.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
})();
