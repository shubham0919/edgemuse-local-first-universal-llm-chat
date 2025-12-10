import * as webllm from "@mlc-ai/web-llm";
import * as Comlink from "comlink";
const engine = new webllm.MLCEngine();
const progressCallback = Comlink.proxy((progress: webllm.InitProgressReport) => {
  // This function will be proxied from the main thread
});
// FIX: Corrected the model record property from "model_url" to "model"
// and "model_lib_url" to "model_lib" to match web-llm's AppConfig type.
const appConfig: webllm.AppConfig = {
  model_list: [
    {
      "model": "https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC/resolve/main/",
      "local_id": "Phi-3-mini-4k-instruct-q4f16_1",
      "model_lib": "https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC/resolve/main/Phi-3-mini-4k-instruct-q4f16_1-sw4k-v0-webgpu.wasm",
    },
  ],
};
const localEngine = {
  async init(modelId: string) {
    // FIX: The `reload` method expects up to 3 arguments. Passing undefined for the
    // chat options argument to fix the type error. Progress callback is not used here.
    await engine.reload(modelId, undefined, appConfig);
  },
  async generate(prompt: string, onToken: (token: string) => void) {
    const stream = engine.chat.completions.create({
      stream: true,
      messages: [{ role: "user", content: prompt }],
    });
    for await (const chunk of await stream) {
      const token = chunk.choices[0]?.delta.content || "";
      if (token) {
        onToken(token);
      }
    }
    await engine.interruptGenerate();
  },
  async interrupt() {
    await engine.interruptGenerate();
  },
};
Comlink.expose(localEngine);
export type LocalEngine = typeof localEngine;