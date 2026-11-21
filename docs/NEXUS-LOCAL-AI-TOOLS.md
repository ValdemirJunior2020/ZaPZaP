# Controlled read-only AI tool invocation (local development)

The public store AI includes a guarded, read-only currency conversion tool. It only invokes Frankfurter when a visitor explicitly requests converting an amount (such as "convert 100 USD to GBP"), with ISO currency allowlisting and a finite amount cap. No customer identity, lead, booking details, or chat history is sent to Frankfurter. The tool's verified rate is added as reference context for Ollama; the AI must not fabricate an exchange result when the provider fails.

This is not general-purpose model-driven tool calling, and it does not authorize bookings, payments, CRM edits, private calendar lookups, or lead disclosure. Full controlled AI actions still require owner opt-in, customer confirmation, tenant policy enforcement, and integration tests before release.

Tests: tests/nexus-tool-router.test.mjs (mocked provider). Only on development branch; no production deployment.
