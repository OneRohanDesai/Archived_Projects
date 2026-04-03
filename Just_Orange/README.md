# Just Orange – Zero-Decision Recipe Generator

### An AWS SRE, Serverless, Monitoring & AI Showcase

**One input. One perfect dish. No decision paralysis.**

Just Orange is a deliberately minimal, production-style system that turns a small set of human constraints (ingredients, taste, time, allergies) into **exactly one optimal recipe** using an LLM.

There are **no choices, no tuning knobs, no UI complexity** — the project focuses instead on:

* AWS Serverless reliability
* SRE practices and observability
* Token-efficient AI usage
* Operational discipline over features

This repository is designed as a **hands-on AWS SRE + monitoring + AI demo**, not a consumer product.

---

## What This Project Demonstrates

* **AWS Serverless Architecture** (Lambda, API Gateway, DynamoDB, S3)
* **Production-grade monitoring & observability**
* **SRE principles**: SLOs, error budgets, caching, failure modes
* **AI integration with strict cost and token controls**
* **Local + cloud parity** for testing and demos

---

## Core Idea

Instead of asking users to make decisions, the system makes **one best decision** for them.

> Input constraints → optimized prompt → single high-quality recipe → done.

No sliders. No variants. No “choose one of five”.
This keeps latency low, cost predictable, and UX opinionated.

---

## Features

* Single-command / single-click recipe generation
* Highly token-efficient LLM prompts
* Allergy & exclusion awareness
* Time-budget enforcement (prep + eat)
* Query caching (local + DynamoDB)
* CLI + Web (serverless) interfaces
* Monitoring-first design

---

## Deployment & Runtime Modes

| Mode            | Purpose                           | Cost     | Skills Demonstrated                                                 |
| --------------- | --------------------------------- | -------- | ------------------------------------------------------------------- |
| **CLI / Local** | Laptop-based SRE & observability  | $0       | Bash, Python, caching, failure handling, local metrics              |
| **Serverless**  | Always-on AWS production showcase | ~$0 idle | Lambda, API Gateway, DynamoDB, S3, CloudWatch, X-Ray, SRE practices |

Both modes use the **same core logic** — only execution and infrastructure differ.

---

## Architecture Overview

```
User Input
   ↓
core/recipe_engine.sh
   ↓
Token-optimized prompt
   ↓
OpenAI API
   ↓
Single concise recipe
   ↓
CLI output | Web UI (Serverless)
```

---

## Repository Structure

```
.
├── cli/
│   ├── cli.html               # Minimal browser-based CLI
│   └── just-orange.sh         # Local execution wrapper
│
├── core/
│   ├── recipe_engine.sh       # Prompt builder + response parser
│   ├── cache.db               # Local cache
│   └── GPT command            # Prompt experiments / notes
│
├── live/
│   ├── lambda/
│   │   └── handler.py         # AWS Lambda entrypoint
│   └── live.html              # Static frontend (S3)
│
├── justorange.html            # Standalone demo page
├── LICENSE
└── README.md
```

---

## Local CLI Usage (SRE-Focused)

The local mode is intentionally simple and transparent — no hidden magic.

```bash
# Clone the repo
git clone https://git.sr.ht/~ladybug/Just_Orange
cd Just_Orange/cli

# Run the generator
./just-orange.sh
```

Example interaction:

```
Ingredients: tomato, rice, egg, soy sauce
Taste: umami
Max time (minutes): 15
Allergies / exclude: peanuts
```

The CLI emphasizes:

* Deterministic behavior
* Fast failure on invalid inputs
* Minimal external dependencies
* Clear logging for troubleshooting

---

## AWS Serverless Version

The `live/` directory contains the **production-style AWS deployment**.

### Components

* **AWS Lambda** – stateless execution
* **API Gateway** – HTTPS frontend
* **DynamoDB** – request/result caching
* **S3** – static frontend
* **CloudWatch** – logs & metrics
* **X-Ray** – request tracing

### Characteristics

* Near-zero idle cost
* Horizontally scalable
* No servers to manage
* Designed for fault injection and failure visibility

---

## Observability & SRE Practices

This project is intentionally observability-first.

### Metrics Tracked

* Request latency
* Error rate
* Cache hit ratio
* LLM call duration
* Timeout frequency

### Reliability Goals

* **Availability SLO**: 99.9 %
* **Latency SLO**:
  99 % of requests return in under 10 seconds
* **Cost control**:
  Token usage capped per request

### Failure Scenarios Considered

* LLM API timeouts
* Invalid or missing secrets
* Cache corruption
* Partial AWS service degradation

---

## Why This Project Exists

Just Orange is not about recipes.

It is about:

* Showing **how to integrate AI responsibly**
* Demonstrating **AWS SRE thinking in a small system**
* Proving you can build **reliable, observable systems without Kubernetes**
* Highlighting **engineering judgment over feature sprawl**

This makes it suitable for:

* AWS / SRE / Platform interviews
* Architecture discussions
* Monitoring & reliability demos
* AI cost-control examples

---

## License

MIT License — free to fork, adapt, and use.

---

Made with ❤️, pragmatism, and late-night hunger — 2025
