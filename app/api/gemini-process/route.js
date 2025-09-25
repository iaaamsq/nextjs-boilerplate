import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { text, prompt } = await request.json();
    
    if (!text || !prompt) {
      return NextResponse.json(
        { error: 'Text and prompt are required' },
        { status: 400 }
      );
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not found' },
        { status: 500 }
      );
    }

    // Gemini API call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${prompt}\n\nText to process:\n${text}`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return NextResponse.json({
        processedText: data.candidates[0].content.parts[0].text,
        success: true
      });
    } else {
      throw new Error('No response from Gemini');
    }

  } catch (error) {
    console.error('Gemini processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process text with Gemini' },
      { status: 500 }
    );
  }
}

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
