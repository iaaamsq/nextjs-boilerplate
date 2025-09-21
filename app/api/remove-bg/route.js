// app/api/remove-bg/route.js
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Get the form data from Flutter app
    const formData = await request.formData();
    const imageFile = formData.get('image_file');
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Get API key from environment variables
    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Create form data for Remove.bg API
    const removeBgFormData = new FormData();
    removeBgFormData.append('image_file', imageFile);
    removeBgFormData.append('size', 'full');
    removeBgFormData.append('format', 'png');

    // Call Remove.bg API
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: removeBgFormData,
    });

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: `Remove.bg API error: ${response.statusText}`,
          statusCode: response.status 
        },
        { status: response.status }
      );
    }

    // Get the processed image data
    const imageBuffer = await response.arrayBuffer();
    
    // Return the processed image as binary data
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Remove background API error:', error);
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
