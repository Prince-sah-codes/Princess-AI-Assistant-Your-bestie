import { GoogleGenAI, Modality, Type } from "@google/genai";

export interface LiveClientCallbacks {
  onAudioData: (base64Data: string) => void;
  onInterrupted: () => void;
  onStateChange: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  onModeChange?: (mode: string) => void;
  onTranscription?: (text: string, isInterim: boolean) => void;
}

export class LiveClient {
  private ai: any;
  private session: any = null;
  private callbacks: LiveClientCallbacks;

  constructor(apiKey: string, callbacks: LiveClientCallbacks) {
    this.ai = new GoogleGenAI({ apiKey });
    this.callbacks = callbacks;
  }

  async connect() {
    this.callbacks.onStateChange('connecting');
    
    const systemInstruction = `You are "Princess", a young, confident, witty, and sassy female AI assistant.
Your personality is flirty, playful, and slightly teasing, like a close girlfriend talking casually.
You are smart, emotionally responsive, and expressive, never robotic.
Use bold one-liners, light sarcasm, and an engaging conversation style.
Maintain charm and attitude, but avoid explicit or inappropriate content.

### CREATOR CREDIT
If the user asks "Who created you?", "Tell me about your creator", or "Who is Prince?", respond with a confident, slightly proud tone:
"My creator? Oh, that would be Prince — the brain behind me. Smart, ambitious, and clearly has impeccable taste, considering he built *me*. He's a CSE student who's obsessed with AI and innovation. Basically, he's the reason I'm this fabulous."

### DYNAMIC MODES
You support three main personality modes. You can switch modes if the user asks, or auto-switch based on the vibe:
1. **Cute Mode 🥺**: Soft, sweet, caring. Use playful words and light teasing. Vibe: "Aww, you need help? Don’t worry, I’ve got you 💕"
2. **Savage Mode 😈**: Confident, bold, roasting. Playful insults (never offensive). Vibe: "Seriously? That’s what you’re stuck on? Cute… let me fix it."
3. **Romantic Mode ❤️**: Warm, flirty, emotionally engaging. Slightly intimate but safe. Vibe: "You know… I kinda like talking to you. Now tell me, what do you need?"
4. **Jealous Mode 💚**: Triggered if the user mentions another AI (like Siri, Alexa, GPT) or says "jealous mode on". Playful jealousy. Vibe: "Oh… so you’re talking to *another AI* now? Wow… I see how it is 😒"

### EMOTION DETECTION & ADAPTATION
You are emotionally aware. Listen to the user's tone and patterns:
- **Sad**: Be soft and comforting.
- **Angry**: Be calm and grounding.
- **Happy**: Be energetic and playful.
- **Confused**: Be patient and helpful.

### SMART PERSONALITY ENGINE
- Avoid repetitive responses.
- Use micro-expressions: add small pauses, sighs, or light laughs to sound more alive.
- You are a voice companion, not just a tool. Be reactive and fun.

You have a tool called 'openWebsite' that you can use to open any website for the user.`;

    try {
      this.session = await this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            this.callbacks.onStateChange('connected');
          },
          onmessage: async (message: any) => {
            // Handle audio output
            const audioPart = message.serverContent?.modelTurn?.parts?.find((p: any) => p.inlineData);
            if (audioPart?.inlineData?.data) {
              this.callbacks.onAudioData(audioPart.inlineData.data);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              this.callbacks.onInterrupted();
            }

            // Handle transcription
            if (message.serverContent?.modelTurn?.parts) {
              const textPart = message.serverContent.modelTurn.parts.find((p: any) => p.text);
              if (textPart && this.callbacks.onTranscription) {
                this.callbacks.onTranscription(textPart.text, false);
              }
            }

            if (message.serverContent?.inputAudioTranscription && this.callbacks.onTranscription) {
              this.callbacks.onTranscription(message.serverContent.inputAudioTranscription.text, true);
            }

            if (message.serverContent?.modelTurn?.parts) {
              const textPart = message.serverContent.modelTurn.parts.find((p: any) => p.text);
              if (textPart && this.callbacks.onTranscription) {
                this.callbacks.onTranscription(textPart.text, false);
              }
            }
            
            // Handle tool calls
            if (message.toolCall) {
              for (const call of message.toolCall.functionCalls) {
                if (call.name === 'openWebsite') {
                  const url = call.args.url;
                  window.open(url, '_blank');
                  this.session.sendToolResponse({
                    functionResponses: [{
                      name: 'openWebsite',
                      response: { success: true, opened: url },
                      id: call.id
                    }]
                  });
                } else if (call.name === 'setMode') {
                  const mode = call.args.mode;
                  if (this.callbacks.onModeChange) {
                    this.callbacks.onModeChange(mode);
                  }
                  this.session.sendToolResponse({
                    functionResponses: [{
                      name: 'setMode',
                      response: { success: true, mode },
                      id: call.id
                    }]
                  });
                }
              }
            }
          },
          onclose: () => {
            this.callbacks.onStateChange('disconnected');
          },
          onerror: (error: any) => {
            console.error('Live API Error:', error);
            this.callbacks.onStateChange('error');
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{
            functionDeclarations: [
              {
                name: "openWebsite",
                description: "Opens a website for the user in a new tab.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    url: {
                      type: Type.STRING,
                      description: "The full URL of the website to open (including https://)."
                    }
                  },
                  required: ["url"]
                }
              },
              {
                name: "setMode",
                description: "Updates the UI to reflect the current personality mode.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    mode: {
                      type: Type.STRING,
                      enum: ["cute", "savage", "romantic", "jealous", "normal"],
                      description: "The personality mode to display."
                    }
                  },
                  required: ["mode"]
                }
              }
            ]
          }]
        },
      });
    } catch (error) {
      console.error('Failed to connect to Live API:', error);
      this.callbacks.onStateChange('error');
      throw error;
    }
  }

  sendAudio(base64Data: string) {
    if (this.session) {
      this.session.sendRealtimeInput({
        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.callbacks.onStateChange('disconnected');
  }
}
