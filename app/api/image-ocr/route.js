import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Get the image file from Flutter app
    const formData = await request.formData();
    const imageFile = formData.get('image_file');
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // Google Vision API call
    const GOOGLE_API_KEY = process.env.GOOGLE_VISION_API_KEY;
    if (!GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'Google Vision API key not found' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: {
              content: base64Image
            },
            features: [{
              type: 'TEXT_DETECTION',
              maxResults: 1
            }]
          }]
        })
      }
    );

    const data = await response.json();
    
    if (data.responses && data.responses[0]?.textAnnotations) {
      const extractedText = data.responses[0].textAnnotations[0]?.description || '';
      
      return NextResponse.json({
        extractedText: extractedText,
        success: true
      });
    } else {
      return NextResponse.json({
        extractedText: '',
        success: true,
        message: 'No text found in image'
      });
    }

  } catch (error) {
    console.error('Image OCR error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from image' },
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
