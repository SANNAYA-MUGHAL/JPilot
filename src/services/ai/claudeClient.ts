import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

export interface ClaudeCompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export class ClaudeClient {
  private client: Anthropic | null = null;
  private hasApiKey: boolean = false;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && apiKey.trim().length > 0 && !apiKey.includes('placeholder')) {
      this.client = new Anthropic({ apiKey });
      this.hasApiKey = true;
    }
  }

  public isAvailable(): boolean {
    return this.hasApiKey;
  }

  public async complete(options: ClaudeCompletionOptions): Promise<string> {
    if (!this.client || !this.hasApiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not configured or invalid. Please configure your Anthropic API key in .env'
      );
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens ?? 3000,
        temperature: options.temperature ?? 0.2,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: options.userPrompt }],
      });

      const textBlock = response.content.find((c) => c.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('Claude response contained no text content');
      }

      return textBlock.text;
    } catch (error: any) {
      throw new Error(`Claude API call failed: ${error.message || error}`);
    }
  }

  public async completeJson<T>(options: ClaudeCompletionOptions): Promise<T> {
    const rawResponse = await this.complete(options);
    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, rawResponse];
    const cleanJson = jsonMatch[1] ? jsonMatch[1].trim() : rawResponse.trim();

    try {
      return JSON.parse(cleanJson) as T;
    } catch (err: any) {
      throw new Error(`Failed to parse Claude JSON response: ${err.message}\nRaw: ${rawResponse}`);
    }
  }
}
