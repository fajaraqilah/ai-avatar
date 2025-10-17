const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAvatar() {
  try {
    const response = await fetch('http://localhost:3007/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello, how are you?' })
    });

    const data = await response.json();
    console.log('Response:', data);
    
    // Check if we have base64 audio data
    if (data.audio && typeof data.audio === 'string') {
      console.log('Audio data length:', data.audio.length);
      console.log('Audio data preview:', data.audio.substring(0, 50) + '...');
    } else {
      console.log('No audio data found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAvatar();