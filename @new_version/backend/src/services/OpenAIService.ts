import { Assistant, OpenAIConfig } from '../types';

export class OpenAIService {
  private static apiKey: string | null = null;
  private static baseURL: string = 'https://api.openai.com/v1';

  /**
   * Configurar la API key de OpenAI
   */
  static setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Configurar la URL base (para usar con proxies o servicios alternativos)
   */
  static setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  /**
   * Generar respuesta usando OpenAI
   */
  static async generateResponse(
    message: string,
    assistant: Assistant,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<{
    response: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }> {
    try {
      if (!this.apiKey && !assistant.openai_api_key) {
        throw new Error('API key de OpenAI no configurada');
      }

      const apiKey = assistant.openai_api_key || this.apiKey!;
      const model = assistant.model || 'gpt-3.5-turbo';
      const maxTokens = assistant.max_tokens || 150;
      const temperature = assistant.temperature || 0.7;

      // Construir el prompt del asistente
      const systemPrompt = this.buildSystemPrompt(assistant);
      
      // Construir el historial de conversación
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory,
        { role: 'user' as const, content: message }
      ];

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new Error(`Error de OpenAI: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json() as any;

      return {
        response: data.choices[0]?.message?.content || '',
        usage: data.usage
      };
    } catch (error) {
      console.error('Error generando respuesta con OpenAI:', error);
      throw error;
    }
  }

  /**
   * Generar respuesta con streaming
   */
  static async generateResponseStream(
    message: string,
    assistant: Assistant,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      if (!this.apiKey && !assistant.openai_api_key) {
        throw new Error('API key de OpenAI no configurada');
      }

      const apiKey = assistant.openai_api_key || this.apiKey!;
      const model = assistant.model || 'gpt-3.5-turbo';
      const maxTokens = assistant.max_tokens || 150;
      const temperature = assistant.temperature || 0.7;

      const systemPrompt = this.buildSystemPrompt(assistant);
      
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory,
        { role: 'user' as const, content: message }
      ];

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new Error(`Error de OpenAI: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No se pudo obtener el stream de respuesta');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Ignorar líneas que no son JSON válido
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generando respuesta con streaming:', error);
      throw error;
    }
  }

  /**
   * Verificar si la API key es válida
   */
  static async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error validando API key:', error);
      return false;
    }
  }

  /**
   * Obtener modelos disponibles
   */
  static async getAvailableModels(apiKey?: string): Promise<string[]> {
    try {
      const key = apiKey || this.apiKey;
      if (!key) {
        throw new Error('API key no proporcionada');
      }

      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${key}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Error obteniendo modelos: ${response.status}`);
      }

      const data = await response.json() as any;
      
      // Filtrar solo modelos de chat
      return data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => model.id)
        .sort();
    } catch (error) {
      console.error('Error obteniendo modelos disponibles:', error);
      throw error;
    }
  }

  /**
   * Obtener información de uso de la API
   */
  static async getUsageInfo(apiKey?: string): Promise<{
    total_usage: number;
    total_granted: number;
    total_available: number;
  } | null> {
    try {
      const key = apiKey || this.apiKey;
      if (!key) {
        throw new Error('API key no proporcionada');
      }

      const response = await fetch(`${this.baseURL}/usage`, {
        headers: {
          'Authorization': `Bearer ${key}`,
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as any;
      return {
        total_usage: data.total_usage || 0,
        total_granted: data.total_granted || 0,
        total_available: data.total_available || 0
      };
    } catch (error) {
      console.error('Error obteniendo información de uso:', error);
      return null;
    }
  }

  /**
   * Construir el prompt del sistema para el asistente
   */
  private static buildSystemPrompt(assistant: Assistant): string {
    let prompt = `Eres un asistente de IA especializado en atención al cliente. `;
    
    if (assistant.prompt) {
      prompt += assistant.prompt;
    } else {
      prompt += `Tu objetivo es ayudar a los clientes de manera amable, profesional y eficiente. `;
      prompt += `Responde de forma concisa y útil. `;
      prompt += `Si no tienes información suficiente, pide más detalles al cliente. `;
      prompt += `Siempre mantén un tono profesional y amigable.`;
    }

    if (assistant.description) {
      prompt += `\n\nContexto adicional: ${assistant.description}`;
    }

    return prompt;
  }

  /**
   * Procesar respuesta para aplicar formato específico
   */
  static processResponse(response: string, assistant: Assistant): string {
    let processedResponse = response.trim();

    // Aplicar límite de caracteres si es necesario
    const maxLength = assistant.max_tokens * 4; // Aproximadamente 4 caracteres por token
    if (processedResponse.length > maxLength) {
      processedResponse = processedResponse.substring(0, maxLength - 3) + '...';
    }

    // Aplicar formato básico
    processedResponse = processedResponse
      .replace(/\n{3,}/g, '\n\n') // Máximo 2 saltos de línea consecutivos
      .trim();

    return processedResponse;
  }

  /**
   * Generar respuesta de emergencia cuando OpenAI no está disponible
   */
  static generateFallbackResponse(assistant: Assistant): string {
    const fallbackResponses = [
      'Gracias por tu mensaje. Un agente humano te responderá pronto.',
      'Hemos recibido tu consulta y la procesaremos lo antes posible.',
      'Gracias por contactarnos. Te responderemos en breve.',
      'Tu mensaje ha sido recibido. Un miembro de nuestro equipo te ayudará pronto.'
    ];

    const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
    return fallbackResponses[randomIndex];
  }

  /**
   * Configurar el servicio con configuración completa
   */
  static configure(config: OpenAIConfig): void {
    if (config.apiKey) {
      this.setApiKey(config.apiKey);
    }
    
    if (config.baseURL) {
      this.setBaseURL(config.baseURL);
    }
  }
}
