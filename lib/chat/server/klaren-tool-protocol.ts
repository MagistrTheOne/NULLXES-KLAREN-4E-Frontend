import "server-only";

export {
  extractKlarenToolCalls,
  stripKlarenToolMarkers,
  KLAREN_TOOL_PROTOCOL_HINT,
  type ExtractedKlarenToolCall,
} from "@/lib/chat/server/klaren-tool-protocol-core";