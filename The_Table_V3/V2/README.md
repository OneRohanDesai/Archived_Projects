The Table V2 — Real Kitchen in Your Browser

A live, real-time restaurant simulator that proves one thing:  
A multi-chef kitchen can run like clockwork — with zero paper.

Built using Python FastAPI + vanilla web + WebSocket, V2 is the working prototype that powers every idea behind The Table V3 — the upcoming commercial platform for cafés to Michelin-star kitchens.

Watch It Work
   1. Open four tabs:  
      http://localhost:8000  
      → Manager | Order-Taker | Chef (dosa) | Waiter  
   2. Take an order → watch it **split instantly** by specialty.  
   3. Dosa Chef sees only dosas. Idli Chef sees only idlis.  
   4. Items cook, turn green, fly to Waiter → delivered → table freed → bill closed.  
   5. Manager sees **revenue climb in real time.**

No refresh. No delay. Pure flow.

Core Features (already production-grade)
   - Specialty chef queues (dosa, idli, vada, beverage)  
   - Auto-cooking timer per item (180 s Masala Dosa, 90 s Idli)  
   - Partial delivery — waiter serves what’s ready first  
   - Live manager dashboard — tables, revenue, occupancy  
   - One-click order form — 12 tables, full menu  
   - WebSocket sync — every role sees truth in <200 ms  

Tech (simple, fast, local)
   - Backend: FastAPI (Python)  
   - Frontend: HTML + CSS + 200 lines vanilla JS  
   - Realtime: WebSocket (no React, no node)  
   - Run: python run.py → http://localhost:8000  

From V2 → V3 (the leap)
   V2 is the proof. V3 is the product.

V3 will ship with:
   - Cloud-native core (Kubernetes + Helm)  
   - Mobile apps for waiters & chefs  
   - Printer & KDS integration  
   - Multi-branch sync  
   - AI prep-time prediction  
   - Michelin-grade audit logs  

Every line of V2 is battle-tested.  
Every bug we killed here will never reach a real kitchen.

## Run it now
   git clone https://git.sr.ht/~you/The_Table_V2
   cd The_Table_V2
   python -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   python run.py

Open the four tabs.
Watch a restaurant breathe.

The Table V2 is closed.
The Table V3 is loading…
— Built with love for food and orchestration.
— Ready for the world.

Let’s go make kitchens quiet.

Contact
Author: Rohan Desai
Email: pro.rohandesai@gmail.com

SourceHut Repo: https://git.sr.ht/~ladybug/The_Table_V2
Location: India
Year: 2025