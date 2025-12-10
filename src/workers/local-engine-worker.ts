import * as webllm from "@mlc-ai/web-llm";
import * as Comlink from "comlink";
let engine: webllm.MLCEngine;
const appConfig: webllm.AppConfig = {
  model_list: [
    {
      "model_url": "https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC/resolve/main/",
      "model_id": "Phi-3-mini-4k-instruct-q4f16_1",
      "model_lib_url": "https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC/resolve/main/Phi-3-mini-4k-instruct-q4f16_1-sw4k-v0-webgpu.wasm",
    },
  ],
};
const localEngine = {
  async init(modelId: string, progressCallback: (report: webllm.InitProgressReport) => void) {
    try {
      if (!engine) {
        engine = new webllm.MLCEngine();
      }
      engine.setInitProgressCallback(progressCallback);
      await engine.reload(modelId, undefined, appConfig);
    } catch (e) {
      console.error("Initialization error in worker:", e);
      throw new Error(`Worker error: ${e instanceof Error ? e.message : String(e)}`);
    }
  },
  async generate(prompt: string, onToken: (token: string) => void) {
    if (!engine) {
      throw new Error("Engine not initialized.");
    }
    try {
      const stream = await engine.chat.completions.create({
        stream: true,
        messages: [{ role: "user", content: prompt }],
      });
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta.content || "";
        if (token) {
          onToken(token);
        }
      }
      // Generation is complete, no need to interrupt unless requested.
    } catch (e) {
      console.error("Generation error in worker:", e);
      throw new Error(`Worker error: ${e instanceof Error ? e.message : String(e)}`);
    }
  },
  async interrupt() {
    if (engine) {
      await engine.interruptGenerate();
    }
  },
};
Comlink.expose(localEngine);
export type LocalEngine = typeof localEngine;