# NexusSales automatic startup (Windows 11)

Run **NEXUS-AUTO-START.bat** once from the ZaPZaP repository. It registers a **current-user (HKCU Run)** login entry and starts services immediately. This is not a machine boot service: sign in to Windows to start it, and keep the PC powered on for remote AI.

- Ollama: 127.0.0.1:11434; uses installed qwen3:8b and qwen3:4b (does not redownload).
- Private Node gateway: 127.0.0.1:8789; authenticates /api/chat with private NEXUS_OLLAMA_GATEWAY_TOKEN (minimum 24 characters). GET /health carries no secrets. Never port-forward 8789 or 11434 from the router.
- ZaPZaP local backend/dashboard: 127.0.0.1:8788.
- Cloudflare named tunnel: will start only if cloudflared is already installed and an existing %USERPROFILE%\.cloudflared\config.yml (or config.yaml) explicitly contains an ingress route to localhost:8789. Otherwise startup logs **TUNNEL PENDING** and does not invent a hostname, modify DNS, overwrite other apps' tunnels, or expose an unprotected service. Cloudflared connectivity must be verified outside the local health test.

The gateway requires **the same token** as the NexusSales server configured in the existing gitignored **.env.local**, and any hosted Vercel/Netlify deployment must use the same private gateway token and correct HTTPS hostname via NEXUS_OLLAMA_URL. Never commit secrets. If the private token is missing, the gateway will deliberately not start.

Logs and status are in %LOCALAPPDATA%\NexusSales\startup.log; per-process logs in the same directory. Run **START-NEXUS-LOCAL.bat** to start manually without changing Windows startup. Services already running are detected before starting, avoiding duplicate Ollama/site/gateway processes.

To uninstall startup **only**, run:

```bat
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v NexusSalesAI /f
```

The existing HotelPlanner NEXUS Agent at 127.0.0.1:8787 and its config.json, database, Python venv and launch scripts are not altered. PayPal, OpenAI fallback, and production deployment are unchanged.

**Troubleshooting:** If 8789 remains closed, inspect %LOCALAPPDATA%\NexusSales\nexus-gateway-error.log and ensure .env.local has the gateway token. If Cloudflare is pending, ensure the selected tunnel config actually targets 8789. If a hosted AI test returns a 404, first verify public DNS/hostname vs NEXUS_OLLAMA_URL; a 404 can also mean a missing model. Both models can be confirmed by `ollama list`.
