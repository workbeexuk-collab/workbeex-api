const API_KEY = 'AIzaSyA1CmtTZydG6dZLUs0QZT53kPvINoJqDgE';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

async function testSimple() {
  console.log('Testing simple Gemini call...');

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say hello in Turkish' }] }],
      }),
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 1000));
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testWithSchema() {
  console.log('\nTesting with JSON schema...');

  const responseSchema = {
    type: 'object',
    properties: {
      understood: { type: 'boolean' },
      serviceType: { type: 'string', nullable: true },
      aiResponse: { type: 'string' },
    },
    required: ['understood', 'aiResponse'],
  };

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'I need cleaning service' }] }],
        systemInstruction: {
          parts: [{ text: 'You are a helpful assistant. Respond in JSON format.' }],
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          responseSchema,
        },
      }),
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 1500));
  } catch (error) {
    console.error('Error:', error);
  }
}

testSimple().then(() => testWithSchema());
