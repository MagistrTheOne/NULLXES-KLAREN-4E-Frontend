/**
 * Read-only verification of the KLAREN Anam persona and ElevenLabs agents.
 * Uses the root .env supplied by the developer:
 * node --env-file=.env scripts/avatar-discover.mjs
 * Never logs or persists API keys.
 */
const ANAM_PERSONA_ID = "af7fc98c-b24a-47f9-b894-02a261d8763f";
const EXPECTED_AVATAR_ID = "71d29277-08ab-4cb7-88fd-606f284b6224";
const keys = {
  anam: process.env.ANAM_API_KEY,
  eleven: process.env.ELEVENLABS_API_KEY,
};
if (!keys.anam || !keys.eleven) {
  console.error("Missing ANAM_API_KEY or ELEVENLABS_API_KEY in root .env.");
  process.exit(1);
}

async function getJson(url, headers) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (!response.ok) throw Error(`Provider returned HTTP ${response.status}.`);
  return response.json();
}

try {
  const persona = await getJson(
    `https://api.anam.ai/v1/personas/${ANAM_PERSONA_ID}`,
    { Authorization: `Bearer ${keys.anam}` },
  );
  const avatarId = persona.avatarId ?? persona.avatar?.id ?? persona.config?.avatarId ?? null;
  const voiceId = persona.voiceId ?? persona.voice?.id ?? persona.config?.voiceId ?? null;
  console.log("Anam persona:", JSON.stringify({
    id: ANAM_PERSONA_ID, name: persona.name, avatarId, voiceId,
    expectedAvatarMatches: avatarId ? avatarId === EXPECTED_AVATAR_ID : "not exposed",
  }, null, 2));

  let cursor;
  const allAgents = [];
  do {
    const url = new URL("https://api.elevenlabs.io/v1/convai/agents");
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await getJson(url, { "xi-api-key": keys.eleven });
    allAgents.push(...(response.agents ?? []));
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor && allAgents.length < 500);

  const matches = allAgents.filter((agent) => /klaren|кларен/i.test(agent.name ?? ""));
  console.log("ElevenLabs KLAREN agents:", JSON.stringify(matches.map((agent) => ({
    agent_id: agent.agent_id, name: agent.name, voice_id: agent.voice_id,
  })), null, 2));
  if (matches.length === 1) {
    console.log(`Set ELEVENLABS_AGENT_ID=${matches[0].agent_id} in the root .env if you want to pin this agent.`);
  } else {
    console.log("No unambiguous KLAREN agent found. Create or select the correct ElevenLabs Agent, then set ELEVENLABS_AGENT_ID in root .env.");
  }
  console.log("For Anam server-side bridging, set the ElevenLabs agent input audio format to PCM 16000 Hz in Advanced settings.");
} catch (error) {
  console.error("Discovery failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
}
