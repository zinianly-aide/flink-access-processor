# Changelog

## 0.2.0
- Generator: structured JSON plan with validation and per-file Preview selection
- Config: provider-aware validation (Dify requires API key; Ollama does not) and aligned setting keys
- Webviews: CSP + nonce hardening and safer rendering/escaping utilities

## 0.2.1
- Streaming: wait for real stream completion before marking idle
- Safety: command execution default disabled; whitelist + operator blocking; streamed/cancellable execution
- Networking: add request timeout defaults for non-stream requests
