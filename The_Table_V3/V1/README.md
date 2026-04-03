The_Table - Real-Time Restaurant Simulator

Author: Rohan Desai [Ladybug]
Email: pro.rohandesai@gmail.com

Live demo: http://localhost:8000
Source: https://git.sr.ht/~ladybug/The_Table
License: MIT
Location: India
Year: 2025

A 60× speed, event-driven, statistical simulation of a 32-table restaurant.
Built in pure Python + FastAPI + vanilla JS – zero frameworks.

This is the minimal working concept that powers The_Table_V3 – the future platform that will orchestrate everything from street-side cafés to Michelin-star kitchens.

Start Commands:
  pip install -r requirements.txt
  uvicorn main.py:app --reload
  Open http://localhost:8000 – watch customers arrive, order, eat and leave in real time.

How It Works (60 seconds)
  Customers spawn every 20–180 sec (real-world pace ÷ 60).
  Tables turn orange → blue → purple → red as they decide, order, eat, pay.
  Order-takers (left panel) go busy when taking orders.
  Chefs (bottom row) pulse red while cooking, orange while plating.
  Waiters (right panel) run between kitchen and tables.
  Every timing is sampled from NumPy distributions defined in config/simulator.yaml.

Key Features (ready for V3)
  Real-time WebSocket dashboard
  Config-driven menu & timings
  32 tables, 5 chefs, 8 waiters, 3 order-takers
  Pure HTML/CSS/JS – no React, no Tailwind
  100% local, 0 external services
  MIT licensed – fork, extend, commercialise

Config Example (config/simulator.yaml)
  yamlspeed_factor: 60
  tables: 32
  menu_items:
    masala_dosa:
      cooking: { mean: 180, std: 30 }
      price: 80
  distributions:
    customer_arrival: { min: 20, max: 180 }
    eating: { mean: 600, std: 120 }

Project Layout
  ├ main.py          → FastAPI + simulation engine
  ├ static/          → index.html · style.css · app.js
  ├ config/          → simulator.yaml
  └ requirements.txt
Next: The_Table_V3
This repo is the concept seed.

The_Table:
  Built a 60× real-time restaurant simulator in 100% open-source Python/JS.
  Statistical timing, WebSocket live dashboard, config-driven operations.
  Foundation for The_Table_V3 – the orchestration platform for every restaurant on Earth.