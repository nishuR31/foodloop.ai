Build a complete, production-style, scalable and fully working hackathon MVP called **FoodLoop AI — Smart Food Waste Management & Redistribution Platform**.

## 1. OBJECTIVE

Create an AI-powered platform that helps institutional kitchens, cafeterias, food businesses and food-processing units:

* Predict food demand.
* Prevent overproduction.
* Manage food inventory.
* Detect MFG/EXP dates using barcode + OCR/AI.
* Detect surplus food.
* Match surplus with nearby NGOs/food banks/community kitchens.
* Optimize redistribution/delivery routes.
* Track redistribution.
* Monitor storage conditions.
* Calculate food waste, cost and environmental impact.
* Provide AI-powered recommendations.

The project must be **actually functional**, not just a UI prototype.

Prioritize a stable, demonstrable MVP over unnecessary complexity.

---

# 2. CORE USER ROLES

Implement authentication and role-based access for:

### Admin

* Manage users/organizations.
* View complete ecosystem analytics.
* Manage NGOs, kitchens and drivers.
* View food redistribution activity.
* View sustainability metrics.
* Monitor alerts.

### Kitchen / Institution

* Dashboard.
* Manage inventory.
* Add food/products.
* Scan barcode.
* Upload product image.
* Extract MFG/EXP using OCR + AI.
* Record food production.
* Record actual consumption.
* Automatically calculate surplus.
* Create redistribution requests.
* View NGO matches.
* Track deliveries.
* View AI recommendations.
* View sustainability/cost analytics.

### NGO / Food Bank

* Dashboard.
* View available surplus food.
* View nearby opportunities.
* Accept/request food.
* Specify required quantity.
* Manage pickup.
* Track redistribution status.

### Driver

* View assigned deliveries.
* View pickup/drop-off.
* View route.
* Update:

  * Assigned
  * Pickup pending
  * Picked up
  * In transit
  * Delivered

---

# 3. TECHNOLOGY STACK

Use a modern, maintainable stack:

### Frontend

* Next.js App Router
* TypeScript
* Tailwind CSS
* Responsive mobile-first UI
* Reusable components
* React Hook Form
* Zod validation
* TanStack Query where appropriate

### Backend

Use a clean API architecture.

Preferred:

* FastAPI
* Python
* Pydantic
* SQLAlchemy

OR, if the project environment already uses Node:

* Node.js
* TypeScript
* Fastify
* Prisma

Do not mix unnecessary backend frameworks.

### Database

* PostgreSQL

### Authentication

* Secure JWT/session authentication.
* HttpOnly cookies where appropriate.
* Role-based authorization.

### AI

Use an external AI API through a backend service layer.

The AI provider must be configurable through environment variables.

Do NOT hardcode API keys.

### OCR

Use an OCR provider through an abstraction/service layer.

If an OCR API is unavailable, provide a development fallback so the complete application can still be demonstrated.

### Maps

Use a map/routing provider through an abstraction layer.

If external routing is unavailable, provide a deterministic mock route for demo mode.

---

# 4. IMPORTANT ONE-DAY DEVELOPMENT RULE

Do NOT attempt to build real physical IoT hardware integration.

Create an **IoT simulation layer** that generates realistic:

* Temperature
* Humidity
* Storage condition
* Refrigerator status

The architecture must make it possible to replace the simulator with real IoT devices later.

Clearly separate:

`IoT Simulator → IoT Service → Database → Dashboard`

---

# 5. MAIN WORKFLOW

The most important end-to-end workflow must work:

```text
Kitchen
   ↓
Add Inventory
   ↓
Barcode/Image Scan
   ↓
OCR
   ↓
AI extracts MFG/EXP
   ↓
Inventory saved
   ↓
AI predicts food demand
   ↓
Kitchen records production
   ↓
System calculates surplus
   ↓
Surplus listing created
   ↓
Nearby NGOs matched
   ↓
NGO accepts
   ↓
Route generated
   ↓
Driver assigned
   ↓
Delivery tracked
   ↓
Food redistributed
   ↓
Impact metrics updated
```

This entire flow must be demonstrable without manually editing the database.

---

# 6. AI DEMAND PREDICTION

Create a demand prediction module.

Input:

* Historical consumption
* Production quantity
* Day of week
* Number of people
* Holiday/event information
* Optional weather data

Output:

```json
{
  "predicted_demand": 850,
  "recommended_production": 870,
  "expected_surplus": 20,
  "confidence": 0.91
}
```

For the hackathon, use a practical hybrid approach:

* Statistical baseline/model for reliable numerical prediction.
* AI for explanation and recommendations.

Do NOT make the LLM responsible for mathematical calculations.

Example AI recommendation:

> Dinner demand has decreased over the last 7 days. Reduce tomorrow's production by approximately 60 meals to reduce expected waste.

Always validate AI output with schemas.

---

# 7. INVENTORY SYSTEM

Create inventory management.

Each inventory item should support:

* Product name
* Category
* Quantity
* Unit
* Batch number
* Barcode
* Manufacturing date
* Expiry date
* Storage location
* Storage temperature
* Status
* Created date

Statuses:

* SAFE
* EXPIRING_SOON
* EXPIRED
* LOW_STOCK
* OUT_OF_STOCK
* QUALITY_WARNING

Automatically calculate expiry status based on current date.

Do NOT trust AI to determine whether food is safe.

AI only extracts/assists with information.

---

# 8. BARCODE + OCR + AI

Implement:

```text
Camera / Image Upload
        ↓
Barcode Detection
        ↓
Product Lookup
        ↓
OCR
        ↓
AI Structured Extraction
        ↓
Validation
        ↓
User Confirmation
        ↓
Database
```

Important:

A normal barcode does NOT necessarily contain MFG/EXP.

Therefore:

* Barcode identifies the product when possible.
* OCR reads the printed label.
* AI extracts MFG/EXP/batch number from OCR text.
* If confidence is low, ask the user to manually verify.
* Never invent missing dates.

AI output:

```json
{
  "product_name": "Milk",
  "manufacturing_date": "2026-09-02",
  "expiry_date": "2026-09-15",
  "batch_number": "M24091",
  "confidence": 0.97
}
```

Validate all dates before saving.

---

# 9. SURPLUS DETECTION

Implement:

```text
Produced Quantity
-
Consumed Quantity
=
Surplus Quantity
```

Example:

```text
Produced: 1000
Consumed: 860
Surplus: 140
```

Automatically generate a surplus opportunity when surplus exceeds a configurable threshold.

Prevent duplicate surplus creation.

Use database transactions for critical operations.

---

# 10. NGO MATCHING

Create a matching engine based on:

* Distance
* Required quantity
* Available quantity
* Food category
* Remaining shelf life
* NGO availability
* Pickup capability

Example:

```text
Available:
140 meals

Recommended:

NGO A
Distance: 2.4 km
Required: 120
Match Score: 94%

NGO B
Distance: 4.2 km
Required: 80
Match Score: 81%
```

Use deterministic scoring for reliability.

AI may explain the recommendation but should not be responsible for the actual matching calculation.

---

# 11. REDISTRIBUTION

Implement complete status lifecycle:

```text
CREATED
↓
MATCHED
↓
ACCEPTED
↓
PICKUP_SCHEDULED
↓
PICKED_UP
↓
IN_TRANSIT
↓
DELIVERED
```

Prevent invalid status transitions.

Record:

* Source kitchen
* Receiving NGO
* Quantity
* Food type
* Pickup time
* Delivery time
* Driver
* Route
* Status

---

# 12. ROUTE OPTIMIZATION

Create a route service.

For hackathon MVP:

* Use map/routing API if credentials exist.
* Otherwise use mock/deterministic routing.

Display:

* Pickup
* Destination
* Distance
* Estimated travel time
* Route status

Do not build a complicated custom routing algorithm unnecessarily.

---

# 13. IoT STORAGE MONITORING

Create simulated sensors.

Generate:

* Temperature
* Humidity
* Refrigerator status

Example:

```text
Cold Storage

Temperature: 4.2°C 🟢
Humidity: 58% 🟢
Status: Normal
```

Simulate abnormal situations:

```text
Temperature: 11.8°C 🔴
Status: WARNING
```

Generate an alert.

Keep the IoT layer modular so real sensors can later publish data through an API/MQTT service.

---

# 14. FOOD QUALITY AI

Create an optional image-analysis feature.

User uploads food image.

AI returns structured screening information such as:

```json
{
  "quality_status": "REVIEW_REQUIRED",
  "visible_issues": [],
  "confidence": 0.72,
  "recommendation": "Manual inspection required"
}
```

Important:

Never claim that computer vision can definitively certify food safety.

Present it as:

**AI-assisted visual screening.**

---

# 15. AI RECOMMENDATION ENGINE

This should be one of the main hackathon "wow" features.

Generate recommendations such as:

> Reduce tomorrow's lunch production by 8%.

> 18 kg of vegetables are approaching expiry. Prioritize them in tomorrow's menu.

> NGO A is the most efficient redistribution option based on quantity and distance.

> Storage temperature exceeded the recommended threshold. Inspect cold storage.

Recommendations must be based on actual database data.

Do not generate random recommendations.

---

# 16. SUSTAINABILITY DASHBOARD

Calculate and display:

* Food waste prevented
* Food redistributed
* Meals saved
* Waste reduction percentage
* Estimated CO₂e avoided
* Estimated water savings
* Estimated money saved
* Redistribution rate

Make calculation assumptions configurable.

Clearly label environmental numbers as:

**Estimated impact**

rather than presenting them as exact measurements.

---

# 17. COST ANALYTICS

Calculate:

```text
Wasted Food Cost
Prevented Waste Cost
Redistribution Value
Operational Savings
```

Dashboard:

```text
Food Waste Cost       ₹42,500
Prevented Waste       ₹31,200
Redistributed Value   ₹18,600
Estimated Savings     ₹49,800
```

Use configurable cost-per-unit values.

---

# 18. ADMIN DASHBOARD

Create a premium dashboard containing:

* Total kitchens
* Total NGOs
* Active surplus
* Food redistributed
* Waste prevented
* Active deliveries
* Expiring inventory
* Storage alerts
* Estimated savings
* Sustainability impact

Charts:

* Waste trend
* Food redistribution trend
* Demand vs production
* Waste by category
* Monthly impact

---

# 19. KITCHEN DASHBOARD

Show:

```text
Today's Demand
Expected Production
Actual Production
Expected Surplus
Expiring Inventory
Active Redistributions
AI Recommendations
Storage Alerts
```

Include clear CTA buttons:

* Add Inventory
* Scan Product
* Record Production
* Create Surplus
* Find NGO

---

# 20. NGO DASHBOARD

Show:

* Available surplus
* Nearby opportunities
* Accepted donations
* Pending pickups
* Completed distributions

Allow NGO to:

* Accept surplus
* Request quantity
* Confirm pickup
* Confirm delivery

---

# 21. NOTIFICATION SYSTEM

Implement in-app notifications for:

* Expiring inventory
* Expired inventory
* Surplus detected
* NGO acceptance
* Pickup reminder
* Delivery update
* Storage temperature warning
* AI recommendation

Email/SMS/WhatsApp can be future integrations unless easy to implement safely.

---

# 22. DATABASE

Design normalized PostgreSQL schema.

Minimum entities:

* User
* Organization
* Kitchen
* NGO
* Driver
* InventoryItem
* FoodBatch
* ProductionRecord
* ConsumptionRecord
* DemandPrediction
* Surplus
* Redistribution
* Delivery
* Route
* Sensor
* SensorReading
* Alert
* AIRecommendation
* ImpactMetric
* Notification

Use:

* Primary keys
* Foreign keys
* Unique constraints
* Proper indexes
* Timestamps
* Soft delete where appropriate

Use database transactions for inventory, surplus and redistribution operations.

---

# 23. SECURITY

Implement:

* Password hashing
* Secure authentication
* Role-based authorization
* Input validation
* API validation
* Rate limiting on authentication endpoints
* CORS configuration
* Environment variables
* No API keys in frontend
* No secrets committed to Git
* Safe file upload validation
* Image size/type restrictions

Never expose private credentials.

---

# 24. ERROR HANDLING

Every API should return consistent errors.

Example:

```json
{
  "success": false,
  "error": {
    "code": "INVENTORY_NOT_FOUND",
    "message": "Inventory item not found"
  }
}
```

Frontend should show useful error messages.

No blank screens.

No uncaught promise errors.

No fake successful responses.

---

# 25. UI/UX

Create a premium hackathon-quality interface.

Requirements:

* Modern dashboard
* Responsive design
* Mobile friendly
* Clean typography
* Cards
* Charts
* Tables
* Status badges
* Alerts
* Loading states
* Empty states
* Error states
* Confirmation dialogs
* Toast notifications
* Skeleton loaders
* Accessible forms
* Keyboard-friendly navigation

Avoid excessive animations that hurt performance.

---

# 26. DEMO MODE

Because this is a hackathon project, create a **Demo Mode**.

Seed realistic data:

* 2–3 kitchens
* 5+ inventory items
* 3 NGOs
* 2 drivers
* Historical demand data
* Active surplus
* Delivery
* Sensor readings
* Alerts
* AI recommendations

Provide a **Reset Demo Data** capability for development/admin.

The entire hackathon presentation should be executable from seeded data.

---

# 27. SAMPLE DEMO SCENARIO

Create a complete seeded scenario:

```text
University Kitchen
        ↓
AI predicts 850 meals
        ↓
Kitchen produces 900
        ↓
Actual consumption = 820
        ↓
80 surplus meals detected
        ↓
System recommends NGO A
        ↓
NGO A accepts 70 meals
        ↓
Driver assigned
        ↓
Route generated
        ↓
Delivery completed
        ↓
Impact dashboard updated
```

The presenter must be able to demonstrate this from the UI.

---

# 28. API DESIGN

Create clean REST APIs such as:

```text
/auth/*
/users/*
/organizations/*
/inventory/*
/barcode/*
/ocr/*
/ai/*
/demand/*
/production/*
/consumption/*
/surplus/*
/ngos/*
/matching/*
/redistribution/*
/deliveries/*
/routes/*
/sensors/*
/alerts/*
/analytics/*
/impact/*
/notifications/*
```

Document important APIs.

---

# 29. ENVIRONMENT CONFIGURATION

Create:

`.env.example`

Include placeholders for:

```text
DATABASE_URL=
AI_API_KEY=
OCR_API_KEY=
MAPS_API_KEY=
AUTH_SECRET=
```

The application must gracefully fall back to demo/mock providers when optional external services are unavailable.

Never put actual secrets into source code.

---

# 30. TESTING

Before declaring the project complete:

Test:

* Authentication
* Role permissions
* Inventory CRUD
* Date extraction
* Expiry calculation
* Demand prediction
* Production recording
* Surplus calculation
* NGO matching
* Redistribution
* Delivery status
* Route generation
* Sensor alerts
* Analytics
* AI failures
* Invalid inputs
* Duplicate requests
* Empty states
* Mobile responsiveness

Fix all runtime errors.

Do not leave TODOs in core functionality.

---

# 31. PERFORMANCE

Implement:

* Database indexes
* Pagination
* API caching where useful
* Lazy loading for heavy components
* Image compression/size limits
* Efficient database queries
* Avoid unnecessary API calls
* Avoid unnecessary AI calls
* Server-side validation

Do not over-engineer.

---

# 32. SCALABILITY

Structure the code so these can later be added without rewriting the application:

* Real IoT devices
* MQTT
* Advanced ML models
* More kitchens
* More NGOs
* Multiple cities
* Multiple organizations
* Real logistics providers
* Mobile applications
* Advanced computer vision
* Automated ESG reporting

Use service abstractions for:

* AI
* OCR
* Maps
* IoT

---

# 33. IMPORTANT RELIABILITY RULES

Never:

* Invent AI results.
* Invent expiry dates.
* Assume every barcode contains expiry information.
* Mark food as safe solely from AI.
* Expose API keys.
* Trust frontend validation alone.
* Create duplicate redistribution records.
* Allow impossible delivery status transitions.
* Use AI for calculations that should be deterministic.
* Return fake success responses when an operation failed.

Every important operation must have proper validation and error handling.

---

# 34. DEVELOPMENT PRIORITY

Build in this order:

### P0 — Must work

1. Authentication
2. Database
3. Kitchen dashboard
4. Inventory
5. Barcode/OCR/AI extraction
6. Demand prediction
7. Production/consumption
8. Surplus detection
9. NGO matching
10. Redistribution
11. Delivery tracking
12. Impact dashboard

### P1 — Add if time permits

13. Route map
14. IoT simulator
15. AI recommendations
16. Notifications
17. Food image analysis
18. Cost analytics

### P2 — Future scalability

19. Real IoT hardware
20. Advanced ML
21. Advanced computer vision
22. Automated ESG compliance
23. Large-scale logistics optimization

---

# 35. FINAL REQUIREMENT

Do not just generate static pages.

The final application must have:

**Frontend → API → Database → AI/services → Database → Dashboard**

with real state changes.

When a user performs an action in the UI, the database must actually update and the relevant dashboards must reflect the change.

Use realistic seeded data and make the entire end-to-end demo work.

At the end:

1. Run the application.
2. Run database migrations.
3. Seed demo data.
4. Run tests.
5. Check all major routes/pages.
6. Fix TypeScript/Python/build errors.
7. Fix API errors.
8. Fix broken UI states.
9. Verify responsive layout.
10. Verify the complete demo workflow.
11. Provide exact setup commands.
12. Provide `.env.example`.
13. Provide deployment instructions.
14. Provide a concise architecture explanation.
15. Provide a list of implemented features.
16. Clearly identify any optional external API that requires a real key.

**Do not stop after creating the UI. Build the complete working MVP.**
