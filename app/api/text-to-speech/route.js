// app/api/text-to-speech/route.js
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Get JSON data from Flutter app
    const { text, voiceName = 'Zephyr' } = await request.json();
    
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Get API key from environment variables
    const apiKey = process.env.GEMINI_TTS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'TTS API key not configured' },
        { status: 500 }
      );
    }

    // Style the text as in Flutter code
    const styledText = `Speak in a confident, relaxed, and uplifting tone with medium pace and clear emphasis on each word: ${text}`;
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: styledText
        }]
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName
            }
          }
        }
      }
    };

    // Call Gemini TTS API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini TTS API error:', errorText);
      return NextResponse.json(
        { 
          error: `TTS API error: ${response.statusText}`,
          statusCode: response.status 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('TTS API Response:', JSON.stringify(data, null, 2));

    // Extract audio data from response
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'No audio generated' },
        { status: 500 }
      );
    }

    const content = candidates[0].content;
    if (!content || !content.parts || content.parts.length === 0) {
      return NextResponse.json(
        { error: 'Invalid response format' },
        { status: 500 }
      );
    }

    const inlineData = content.parts[0].inlineData;
    if (!inlineData || !inlineData.data) {
      return NextResponse.json(
        { error: 'No audio data found' },
        { status: 500 }
      );
    }

    const audioContent = inlineData.data;

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioContent, 'base64');
    
    // Add WAV header (PCM to WAV conversion)
    const wavBuffer = addWavHeader(audioBuffer, 24000, 1, 16);
    
    // Return the audio file
    return new NextResponse(wavBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': wavBuffer.length.toString(),
        'Content-Disposition': 'attachment; filename="speech.wav"',
      },
    });

  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to add WAV header to PCM data
function addWavHeader(pcmData, sampleRate, channels, bitsPerSample) {
  const header = Buffer.alloc(44);
  let offset = 0;

  // RIFF header
  header.write('RIFF', offset); offset += 4;
  header.writeUInt32LE(36 + pcmData.length, offset); offset += 4;
  header.write('WAVE', offset); offset += 4;

  // fmt chunk
  header.write('fmt ', offset); offset += 4;
  header.writeUInt32LE(16, offset); offset += 4; // chunk size
  header.writeUInt16LE(1, offset); offset += 2; // audio format (PCM)
  header.writeUInt16LE(channels, offset); offset += 2;
  header.writeUInt32LE(sampleRate, offset); offset += 4;
  header.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, offset); offset += 4; // byte rate
  header.writeUInt16LE(channels * bitsPerSample / 8, offset); offset += 2; // block align
  header.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  header.write('data', offset); offset += 4;
  header.writeUInt32LE(pcmData.length, offset);

  return Buffer.concat([header, pcmData]);
}

// Helper function to convert integer to bytes (little endian)
function intToBytes(value, bytes) {
  const result = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i++) {
    result[i] = (value >> (8 * i)) & 0xFF;
  }
  return result;
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
