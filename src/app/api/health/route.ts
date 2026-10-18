import { NextResponse } from 'next/server';
import { checkOllamaHealth } from '@/lib/ollama';

export async function GET() {
  try {
    const health = await checkOllamaHealth();
    return NextResponse.json(
      {
        ollama_running: health.ollama_running,
        model_available: health.model_available,
        model_name: health.model_name,
        error: health.error,
        running: health.ollama_running,
        modelAvailable: health.model_available,
        model: health.model_name,
        status: health.ollama_running
          ? health.model_available
            ? 'ready'
            : 'no_model'
          : 'offline',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ollama_running: false,
        model_available: false,
        model_name: '',
        error: error instanceof Error ? error.message : 'Failed to check Ollama health',
        running: false,
        modelAvailable: false,
        model: '',
        status: 'offline',
      },
      { status: 200 }
    );
  }
}
