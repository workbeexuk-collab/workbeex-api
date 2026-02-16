const API_KEY = 'AIzaSyA1CmtTZydG6dZLUs0QZT53kPvINoJqDgE';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

async function testComplexSchema() {
  console.log('Testing with complex schema (similar to backend)...\n');

  // Simplified version of the backend schema
  const responseSchema = {
    type: 'object',
    properties: {
      authState: {
        type: 'object',
        properties: {
          isLoggedIn: { type: 'boolean' },
          requiresAuth: { type: 'boolean' },
        },
        required: ['isLoggedIn', 'requiresAuth'],
      },
      userType: { type: 'string', nullable: true },
      intent: { type: 'string', nullable: true },
      category: { type: 'string', nullable: true },
      serviceType: { type: 'string', nullable: true },
      serviceKey: { type: 'string', nullable: true },
      location: {
        type: 'object',
        nullable: true,
        properties: {
          area: { type: 'string', nullable: true },
          postcode: { type: 'string', nullable: true },
        },
      },
      quickReplies: {
        type: 'object',
        nullable: true,
        properties: {
          type: { type: 'string' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
              },
              required: ['label', 'value'],
            },
          },
        },
      },
      progress: {
        type: 'object',
        properties: {
          collectedFields: { type: 'array', items: { type: 'string' } },
          missingFields: { type: 'array', items: { type: 'string' } },
          completionPercent: { type: 'number' },
          currentPhase: { type: 'string' },
        },
        required: ['collectedFields', 'missingFields', 'completionPercent', 'currentPhase'],
      },
      understood: { type: 'boolean' },
      needsMoreInfo: { type: 'boolean' },
      readyToAction: { type: 'boolean' },
      aiResponse: { type: 'string' },
      nextQuestion: { type: 'string', nullable: true },
    },
    required: ['authState', 'progress', 'understood', 'needsMoreInfo', 'readyToAction', 'aiResponse'],
  };

  const systemPrompt = `You are NextBee AI Assistant. Help users find services, jobs, or post listings.
User types: customer (looking for services), provider (professional looking for work), employer (business hiring workers).
Services: cleaning, plumbing, electrical, painting, carpentry.
Respond in JSON format matching the schema.`;

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'temizlik istiyorum' }] }],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema,
        },
      }),
    });

    console.log('Status:', response.status);
    const data = await response.json();

    if (data.error) {
      console.log('ERROR:', JSON.stringify(data.error, null, 2));
    } else {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log('Response text:', text);

      if (text) {
        try {
          const parsed = JSON.parse(text);
          console.log('\nParsed response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('Failed to parse JSON:', e.message);
        }
      }
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testComplexSchema();
