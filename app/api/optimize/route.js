import { optimizedSolution } from '../../../utils/gemini';
import { NextResponse } from 'next/server';

// Maximum code size in characters to prevent abuse (100KB)
const MAX_CODE_SIZE = 100 * 1024;

// Timeout promise wrapper for API calls
const withTimeout = (promise, timeoutMs = 8000) => {
  let timeoutId;
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {
    clearTimeout(timeoutId);
  });
};

export async function POST(request) {
  try {
    // Check request content length header if available
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_CODE_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { 
          status: 413,
          headers: {
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    const body = await request.json();
    const { code, language } = body;
    
    // Input validation
    if (!code || !language) {
      return NextResponse.json(
        { error: 'Code and language are required' },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    // Check code size after parsing
    if (code.length > MAX_CODE_SIZE) {
      return NextResponse.json(
        { error: 'Code size exceeds maximum allowed' },
        { 
          status: 413,
          headers: {
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    // Only allow specific languages
    const allowedLanguages = ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'ruby', 'rust', 'php'];
    if (!allowedLanguages.includes(language.toLowerCase())) {
      return NextResponse.json(
        { error: 'Unsupported programming language' },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    // Execute API call with timeout
    const optimizedCode = await withTimeout(
      optimizedSolution(code, language),
      9000 // Just under Vercel's 10s serverless function timeout
    );
    
    // Return successful response with appropriate cache headers
    // Using stale-while-revalidate to improve performance while keeping content fresh
    return NextResponse.json(
      { result: optimizedCode },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    // Differentiate between different types of errors
    if (error.message && error.message.includes('timed out')) {
      console.error('API timeout error:', error);
      return NextResponse.json(
        { error: 'Request timed out. Your code may be too complex to process quickly.' },
        { 
          status: 408,
          headers: {
            'Cache-Control': 'no-store'
          }
        }
      );
    }
    
    // Log detailed error for monitoring
    console.error('API route error:', {
      message: error.message,
      stack: error.stack,
      time: new Date().toISOString()
    });
    
    return NextResponse.json(
      { error: 'Failed to optimize code. Please try again with simplified code.' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}
