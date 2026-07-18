"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolToGeminiFunctionDeclaration = toolToGeminiFunctionDeclaration;
// ─────────────────────────────────────────────
// Gemini Function Declaration (for LLM native tool use)
// ─────────────────────────────────────────────
function toolToGeminiFunctionDeclaration(tool) {
    return {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
    };
}
//# sourceMappingURL=interface.js.map