# AuraShop — Low-Level Architecture Diagram

This document describes the **low-level architecture** of AuraShop: components, data flow, and storage.

---

## 1. System Overview (High-Level)

```mermaid
flowchart TB
    subgraph Client["🖥️ Client"]
        Browser["Browser"]
    end

    subgraph Frontend["Next.js Frontend (port 3000)"]
        Pages["Pages (App Router)"]
        Components["Components"]
        API_Client["lib/api.ts"]
    end

    subgraph Proxy["Next.js Rewrites"]
        Rewrite["/api/* → http://localhost:8000/*"]
    end

    subgraph Backend["FastAPI Backend (port 8000)"]
        Main["main.py (REST API)"]
        Services["Services Layer"]
        Data["Data / Storage"]
    end

    subgraph External["External"]
        OpenAI["OpenAI API (optional)"]
    end

    Browser --> Pages
    Pages --> Components
    Pages --> API_Client
    API_Client -->|"fetch('/api/...')"| Rewrite
    Rewrite --> Main
    Main --> Services
    Services --> Data
    Services --> OpenAI
```

---

## 2. Frontend (Next.js) — Low-Level

```mermaid
flowchart LR
    subgraph Frontend["Frontend (src/)"]
        subgraph App["app/ (App Router)"]
            Home["page.tsx (Home)"]
            Products["products/page.tsx"]
            ProductDetail["products/[id]/page.tsx"]
            Cart["cart/page.tsx"]
            Checkout["checkout/page.tsx"]
            Login["login/page.tsx"]
            Profile["profile/page.tsx"]
            Wallet["wallet/page.tsx"]
            Orders["orders/[id]/page.tsx"]
            Returns["returns/"]
            StoreScanner["store-scanner/page.tsx"]
            Search["search/page.tsx"]
        end

        subgraph Components["components/"]
            Header["Header.tsx"]
            ChatWidget["ChatWidget.tsx"]
            ProductCard["ProductCard.tsx"]
            SpinWheel["SpinWheel.tsx"]
            SearchBar["SearchBar.tsx"]
            BackendOffline["BackendOfflineBanner.tsx"]
            UI["ui/ (badge, button, card, input)"]
        end

        subgraph Lib["lib/"]
            API["api.ts — all API calls"]
            Session["session.ts"]
            Fallback["fallback-products.ts"]
            Unsplash["unsplash.ts"]
        end
    end

    App --> Components
    App --> Lib
    API -->|"GET/POST /api/*"| Backend
```

**Key:** All backend calls go through `lib/api.ts` using base path `/api`. Next.js `rewrites` in `next.config.js` send `/api/:path*` to `http://localhost:8000/:path*`.

---

## 3. Backend API (FastAPI) — Routes & Handlers

```mermaid
flowchart TB
    subgraph Main["main.py — REST API"]
        Health["GET /health"]
        Categories["GET /categories"]
        Products["GET /products, GET /products/:id"]
        Events["POST /events"]
        Recs["GET /recommendations"]
        Chat["POST /chat, POST /chat/stream (SSE)"]
        Auth["POST /auth/send-otp, verify-otp"]
        Coupon["POST /home/coupon-game, jackpot, scratch"]
        CouponValidate["GET /coupons/validate"]
        Session["GET /session/:id/context, cart; POST cart/clear"]
        Stores["GET /stores"]
        Orders["POST /orders, GET /orders/:id, GET /users/:id/orders"]
        OrderStatus["POST /orders/:id/status, cancel"]
        Pickup["POST /pickup/verify, complete/:id"]
        Profile["GET|POST /users/:id/profile"]
        Wallet["GET /users/:id/wallet, wallet/transactions"]
        Spin["POST /orders/:id/spin"]
        Cashback["POST /orders/:id/cashback"]
        WalletApply["POST /orders/apply-wallet"]
        WalletPreview["GET /wallet/preview-cashback"]
        AddMoney["POST /wallet/add-money"]
        ReturnsRouter["/api/returns/* (mounted router)"]
    end
```

---

## 4. Backend Services & Data Flow

```mermaid
flowchart TB
    subgraph API["main.py"]
        Routes["Routes"]
    end

    subgraph Services["Backend Services"]
        DataStore["data_store.py"]
        AIService["ai_service.py"]
        OrderService["order_service.py"]
        WalletService["wallet_service.py"]
        AuthOTP["auth_otp.py"]
        CouponGame["coupon_game.py"]
        RAGStore["rag_store.py"]
        ReturnsModule["returns/ (routes, services)"]
    end

    subgraph Storage["Storage & External"]
        ProductsJSON["data/products.json"]
        OrdersJSON["data/orders.json"]
        ChromaDB["data/chroma_db/ (ChromaDB)"]
        ReturnsDB["returns.db (SQLite)"]
        InMemory["In-memory: events, carts, OTP, wallets, rec cache"]
        OpenAI["OpenAI API"]
    end

    Routes --> DataStore
    Routes --> AIService
    Routes --> OrderService
    Routes --> WalletService
    Routes --> AuthOTP
    Routes --> CouponGame
    Routes --> ReturnsModule

    DataStore --> ProductsJSON
    DataStore --> InMemory
    AIService --> DataStore
    AIService --> RAGStore
    AIService --> OpenAI
    RAGStore --> ChromaDB
    OrderService --> OrdersJSON
    WalletService --> InMemory
    AuthOTP --> InMemory
    CouponGame --> InMemory
    ReturnsModule --> ReturnsDB
    ReturnsModule --> ChromaDB
```

---

## 5. Data Store & AI Layer (Detail)

```mermaid
flowchart TB
    subgraph data_store["data_store.py"]
        LoadProducts["load_products()"]
        GetProduct["get_product(), get_products(), get_categories()"]
        Events["add_event(), get_events()"]
        Cart["get_cart(), add_to_cart(), remove_from_cart(), clear_cart()"]
        Context["get_session_context()"]
        RecCache["get_cached_recommendations(), cache_recommendations()"]
    end

    subgraph ai_service["ai_service.py"]
        Intent["_classify_intent() → order | recommend | faq | general"]
        AgentIntent["_parse_agent_intent() (OpenAI)"]
        GetRecs["get_recommendations()"]
        Chat["chat(), chat_stream()"]
    end

    subgraph rag_store["rag_store.py"]
        ChromaClient["ChromaDB PersistentClient"]
        ProductsCollection["products collection (embeddings)"]
        FAQCollection["FAQ collection (embeddings)"]
        SearchProducts["search_products()"]
        SearchFAQ["search_faq()"]
    end

    GetRecs --> Context
    GetRecs --> RAGStore
    GetRecs --> RecCache
    Chat --> Intent
    Chat --> AgentIntent
    Chat --> RAGStore
    Chat --> DataStore
    RAGStore --> ChromaClient
```

---

## 6. Orders, Wallet & Auth (Detail)

```mermaid
flowchart LR
    subgraph order_service["order_service.py"]
        CreateOrder["create_order()"]
        GetOrder["get_order(), get_user_orders()"]
        UpdateStatus["update_order_status()"]
        QR["generate_qr_code_data(), verify_pickup_qr(), complete_pickup()"]
        Profile["get_user_profile(), create_or_update_profile()"]
        Stores["get_available_stores()"]
    end

    subgraph wallet_service["wallet_service.py"]
        GetWallet["get_wallet(), get_wallet_summary()"]
        Cashback["add_cashback(), calculate_cashback()"]
        Spin["spin_wheel_result(), add_spin_reward(), is_spin_used()"]
        Deduct["deduct_from_wallet()"]
        AddMoney["add_money_to_wallet()"]
        Refund["add_refund(), revoke_order_rewards()"]
    end

    subgraph auth_otp["auth_otp.py"]
        SendOTP["send_otp() — print OTP in terminal"]
        VerifyOTP["verify_otp()"]
    end

    order_service --> OrdersJSON
    wallet_service --> InMemory
    auth_otp --> InMemory
```

---

## 7. Returns Module (Detail)

```mermaid
flowchart TB
    subgraph ReturnsRoutes["returns/routes.py"]
        CreateReturn["POST /api/returns/"]
        GetByOrder["GET /api/returns/order/:order_id"]
        Admin["Admin endpoints"]
    end

    subgraph ReturnsServices["returns/services/"]
        ReturnsService["returns_service.py"]
        ReturnsWorkflow["returns_workflow.py"]
        VisionAgent["vision_agent.py"]
        PolicyAgent["policy_agent.py"]
        ResolutionAgent["resolution_agent.py"]
        EmbeddingService["embedding_service.py"]
        CommunicationAgent["communication_agent.py"]
        AdminService["admin_service.py"]
    end

    subgraph ReturnsData["Returns Data"]
        SQLite["returns.db (SQLite)"]
        ChromaPolicies["ChromaClient — return_policies collection"]
    end

    ReturnsRoutes --> ReturnsService
    ReturnsService --> ReturnsWorkflow
    ReturnsWorkflow --> VisionAgent
    ReturnsWorkflow --> PolicyAgent
    ReturnsWorkflow --> ResolutionAgent
    PolicyAgent --> ChromaPolicies
    ReturnsService --> SQLite
```

---

## 8. Storage Summary

| Storage | Type | Used By | Purpose |
|--------|------|---------|---------|
| `backend/data/products.json` | JSON file | data_store | Product catalog (loaded at startup) |
| `backend/data/orders.json` | JSON file | order_service | Orders + user profiles (persisted) |
| `backend/data/chroma_db/` | ChromaDB (persistent) | rag_store, returns | Product/FAQ embeddings; return policies |
| `backend/returns.db` | SQLite | returns module | Return requests, order snapshot, status |
| In-memory dicts | Python dicts | data_store, auth_otp, wallet_service, coupon_game | Events, carts, OTP, wallets, spin state, rec cache |

---

## 9. Request Flow Examples

**Product listing:**  
Browser → Next.js (products page) → `api.ts` `fetchProducts()` → `GET /api/products` → Next rewrite → FastAPI `GET /products` → `data_store.get_products()` → `products.json` + in-memory → JSON response.

**Chat (streaming):**  
Browser → ChatWidget → `api.ts` `chatStream()` → `POST /api/chat/stream` → FastAPI → `ai_service.chat_stream()` → intent + RAG/OpenAI → SSE chunks → client `onChunk` / `onDone`.

**Place order:**  
Checkout page → `POST /api/orders` (body: user_id, items, delivery_method, address/store) → `order_service.create_order()` → write to `orders.json` → return order with QR if store pickup.

**Login:**  
Login page → `sendOtp(email)` → `POST /api/auth/send-otp` → `auth_otp.send_otp()` (store OTP in memory, print in terminal) → `verifyOtp(email, otp)` → `POST /api/auth/verify-otp` → return `{ email, name }`; frontend stores user in session.

---

You can render these Mermaid diagrams in GitHub, VS Code (with a Mermaid extension), or [mermaid.live](https://mermaid.live).
