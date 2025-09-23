// app/api/extract-pdf/route.js
import { NextRequest, NextResponse } from 'next/server';
import PDFParser from 'pdf2json';

export async function POST(request) {
  try {
    // Get the PDF file from Flutter app
    const formData = await request.formData();
    const pdfFile = formData.get('pdf_file');
    
    if (!pdfFile) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF
    const extractedText = await extractTextFromPDF(buffer);
    
    if (!extractedText || extractedText.trim() === '') {
      return NextResponse.json(
        { error: 'No text found in PDF' },
        { status: 400 }
      );
    }

    // Return extracted text
    return NextResponse.json({
      extractedText: extractedText,
      success: true
    });

  } catch (error) {
    console.error('PDF extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF' },
      { status: 500 }
    );
  }
}

// Helper function to extract text from PDF buffer
function extractTextFromPDF(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataError', errData => {
      reject(new Error(errData.parserError));
    });
    
    pdfParser.on('pdfParser_dataReady', pdfData => {
      try {
        let extractedText = '';
        
        // Extract text from all pages
        if (pdfData.Pages) {
          pdfData.Pages.forEach(page => {
            if (page.Texts) {
              page.Texts.forEach(text => {
                if (text.R) {
                  text.R.forEach(textRun => {
                    if (textRun.T) {
                      extractedText += decodeURIComponent(textRun.T) + ' ';
                    }
                  });
                }
              });
            }
            extractedText += '\n'; // New line after each page
          });
        }
        
        // Clean up text
        extractedText = extractedText
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .replace(/\n\s*\n/g, '\n') // Remove empty lines
          .trim();
          
        resolve(extractedText);
      } catch (err) {
        reject(err);
      }
    });
    
    // Parse the PDF buffer
    pdfParser.parseBuffer(buffer);
  });
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
