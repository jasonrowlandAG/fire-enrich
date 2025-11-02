import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { FieldGenerationResponse } from '@/lib/types/field-generation';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Model selection: primary model can be set via OPENAI_MODEL.
    // OPENAI_FALLBACK_MODELS can be a comma-separated list of models to try on failure.
    const primaryModel = process.env.OPENAI_MODEL || 'gpt-5';
    const fallbackModels = (process.env.OPENAI_FALLBACK_MODELS || 'gpt-4o-mini,gpt-3.5-turbo').split(',').map(m => m.trim()).filter(Boolean);

    // Helper to call OpenAI with a model and return parsed result, or throw.
    const callWithModel = async (model: string) => {
      const completion = await openai.chat.completions.create({
        model,
      messages: [
        {
          role: 'system',
          content: `You are an expert at understanding data enrichment needs and converting natural language requests into structured field definitions.
          
          When the user describes what data they want to collect about companies, extract each distinct piece of information as a separate field.
          
          Guidelines:
          - Use clear, professional field names (e.g., "Company Size" not "size")
          - Provide helpful descriptions that explain what data should be found
          - Choose appropriate data types:
            - string: for text, URLs, descriptions
            - number: for counts, amounts, years
            - boolean: for yes/no questions
            - array: for lists of items
          - Include example values when helpful
          - Common fields include: Company Name, Description, Industry, Employee Count, Founded Year, Headquarters Location, Website, Funding Amount, etc.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'field_generation',
          strict: true,
          schema: zodResponseFormat(FieldGenerationResponse, 'field_generation').json_schema.schema
        }
      }
      });

      const message = completion.choices?.[0]?.message;
      if (!message?.content) throw new Error('No response content');
      const parsed = JSON.parse(message.content) as z.infer<typeof FieldGenerationResponse>;
      return parsed;
    };

    // Try primary model first, then fallbacks on quota/429 errors
    const modelsToTry = [primaryModel, ...fallbackModels];
    let lastErr: any = null;
    for (const model of modelsToTry) {
      try {
        const parsed = await callWithModel(model);
        // success
        return NextResponse.json({ success: true, data: parsed });
      } catch (err: any) {
        console.error(`generate-fields: model=${model} failed:`, err?.message ?? err);
        lastErr = err;
        // if it's not a rate/quota related error, stop trying further models
        const status = err?.status ?? null;
        const code = err?.code ?? null;
        if (status && status !== 429 && status !== 503 && code !== 'insufficient_quota') {
          break;
        }
        // otherwise continue to next fallback model
      }
    }

    // If we reach here, all models failed
    throw lastErr ?? new Error('All models failed');
  } catch (error: any) {
    // Log full error server-side for debugging
    console.error('Field generation error:', error);

    // Try to extract status/code/message from OpenAI SDK errors
    const status = error?.status ?? (error?.code === 'insufficient_quota' ? 429 : 500);
    const code = error?.code ?? null;
    const message = error?.message ?? 'Failed to generate fields';

    // Return useful details to the frontend (kept intentionally lightweight)
    return NextResponse.json(
      { error: message, code, details: error?.error ?? null },
      { status }
    );
  }
}