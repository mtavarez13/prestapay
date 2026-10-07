import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const aiService = {
  async generateItemDescription(item: { name: string; category: string; brand: string; state: string }): Promise<string> {
    try {
      const prompt = `Genera una descripción comercial atractiva para un artículo de casa de empeño con los siguientes detalles:
      Nombre: ${item.name}
      Categoría: ${item.category}
      Marca: ${item.brand}
      Estado: ${item.state}
      La descripción debe ser profesional, resaltar el valor del artículo y ser concisa.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      return response.text || "No se pudo generar la descripción.";
    } catch (error) {
      console.error("Error generating item description:", error);
      return "Error al generar la descripción con IA.";
    }
  }
};
