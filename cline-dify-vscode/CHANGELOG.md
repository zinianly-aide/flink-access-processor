# Changelog

## 0.2.0
- Generator: structured JSON plan with validation and per-file Preview selection
- Config: provider-aware validation (Dify requires API key; Ollama does not) and aligned setting keys
- Webviews: CSP + nonce hardening and safer rendering/escaping utilities

## 0.2.1
- Streaming: wait for real stream completion before marking idle
- Safety: command execution default disabled; whitelist + operator blocking; streamed/cancellable execution
- Networking: add request timeout defaults for non-stream requests

## 0.2.2
- Multi-root: pick workspace folder for generator/project tools/citations/change tracker
- Q&A: persistent chat history + stop/clear controls
- Change Tracker: file list + per-file diff loading + open diff in editor

## 0.3.0
- Generator: record reproducible run metadata in `GENERATION_RUN.json` (mode/selection/model/params/results)
- Generator: strengthen structured plan validation (paths, duplicates, deps, steps)
- Generator: apply generation temperature/maxTokens config for plan + file generation

## 0.4.0
- Q&A: introduce rule-based intent routing (`/help`, MCP, citations, common commands)
- Citation: add “引用当前选区”能力（命令与 Q&A 均可触发）

## 0.5.0
- MCP: add optional `/tools` and `/resources` discovery helpers (with 404 guidance)

## 0.6.0
- Generator: apply plan `dependencies` into `package.json` and generate `DEPENDENCIES.md`
- Generator: stronger prompts to pin dependency versions and restrict third-party imports to declared deps
