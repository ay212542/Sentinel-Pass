async function test() {
  console.log('🚀 Testing Register...');
  try {
    const regRes = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test' + Math.floor(Math.random() * 1000000) + '@example.com',
        password: 'SecurePass123!A1'
      })
    });
    const regData = await regRes.json();
    console.log('Register Response:', JSON.stringify(regData, null, 2));

    if (regData.success) {
      console.log('\n🔐 Testing Login...');
      const loginRes = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regData.user.email,
          password: 'SecurePass123!A1'
        })
      });
      const loginData = await loginRes.json();
      const status = loginRes.status;
      console.log(`Login Status: ${status}`);
      console.log('Login Response:', JSON.stringify(loginData, null, 2));
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\nTip: Make sure your server is running on port 3000.');
  }
}

test();
