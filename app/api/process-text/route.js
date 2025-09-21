// app/api/process-text/route.js
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Get JSON data from Flutter app
    const { text } = await request.json();
    
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'No text provided for processing' },
        { status: 400 }
      );
    }

    // Get API key from environment variables
    const apiKey = process.env.GEMINI_GEMMA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Text processing API key not configured' },
        { status: 500 }
      );
    }

    // Same prompt as in Flutter code
    const prompt = `
    Your only job is to act as a text cleaner and formatter.
    Do NOT summarize, shorten, or change the original meaning of the text.
    The following text was extracted from a document and might have formatting errors (like extra spaces, unnecessary line breaks, or jumbled sentences).
    Your task is to correct these formatting errors and present the FULL, original text in a clean, well-structured, and readable format.
    Your output must only be the cleaned text, without any added introductions or comments.

    Here is the text to be cleaned:
    "${text}"
    `;

    const url = `https://generativelanguage.googleapis.com/v1/models/gemma-2-27b-it:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    console.log('Calling Gemini text processing API...');

    // Call Gemini API for text processing
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini text processing API error:', errorText);
      return NextResponse.json(
        { 
          error: `Text processing API error: ${response.statusText}`,
          statusCode: response.status 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Text processing API response received');

    // Extract processed text from response
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: 'No processed text generated' },
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

    const processedText = content.parts[0].text;
    if (!processedText) {
      return NextResponse.json(
        { error: 'No processed text found' },
        { status: 500 }
      );
    }

    // Return the cleaned/processed text
    return NextResponse.json({
      processedText: processedText,
      success: true
    });

  } catch (error) {
    console.error('Text processing API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
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
