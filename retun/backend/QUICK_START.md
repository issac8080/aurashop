# Quick Start - View Opik Traces

## 1. Make sure your server is running:
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
✓ Opik tracing initialized successfully
  Workspace: manna-oleeviya
  Project: Auto
```

## 2. Generate a trace:
In a NEW terminal, run:
```bash
cd backend
python test_opik_tracing.py
```

OR make a POST request to create a return:
```bash
curl -X POST "http://localhost:8000/api/user/returns" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORD-001147",
    "description": "Item is damaged",
    "damage_type": "PHYSICAL",
    "category": "Footwear",
    "media_base64": []
  }'
```

## 3. View traces:
Open: https://www.comet.com/opik/manna-oleeviya/projects/Auto/traces

**Wait 10-30 seconds** after making the request, then refresh the page.

You should see:
- `process_ai_return` - Main workflow trace
- `vision_agent_analyze` - LLM call
- `policy_agent_interpret` - LLM call  
- `communication_agent_generate` - LLM call
- Workflow nodes: `vision_node`, `policy_node`, etc.

## Troubleshooting:
- If no traces appear, check the server logs for Opik initialization messages
- Make sure `OPIK_API_KEY`, `OPIK_WORKSPACE`, and `OPIK_PROJECT_NAME=Auto` are in your `.env` file
- Traces may take 10-30 seconds to appear in the dashboard






