# Fleetio Product Topology: Natural Contour Lines

**Purpose:** Map the natural module boundaries in Fleetio's product — where the seams are, how data flows between domains, and what this means for packaging.

---

## The Gravity Center: The Asset Record

Everything in Fleetio radiates from a single object: **the vehicle/asset record**. It's the system of record. Every module either writes data to it, reads data from it, or both. This is the one thing you literally cannot remove and still have a product. It's also where Fleetio's value metric lives — per vehicle, per month.

---

## 14 Natural Modules

Working from the feature inventory, the product breaks into 14 distinct functional domains. Each has its own objects, its own primary users, and its own reason for existing.

### 1. Fleet Registry (Core)
**What:** Asset records, groups/subgroups, custom fields, lifecycle tracking, replacement analysis, utilization, document management.
**Primary users:** Fleet managers, admins.
**Objects:** Vehicles/assets, groups, documents, status records.
**Why it's distinct:** This is the database. Everything else is a workflow on top of it.
**Current tier:** All plans (with limits on groups/custom fields at lower tiers).

### 2. Contacts & Drivers
**What:** Driver profiles, vehicle assignments, CDL tracking, renewal reminders, certifications, self-assignment.
**Primary users:** Fleet managers, drivers, HR.
**Objects:** Contacts, assignments, documents, licenses.
**Why it's distinct:** People management is a separate domain from asset management, but tightly coupled (who's assigned to what).
**Current tier:** All plans.

### 3. Inspections
**What:** DVIR forms, custom inspection forms, photo upload, digital signatures, defect tracking, offline mode, inspection-to-issue automation.
**Primary users:** Drivers (submitting), fleet managers (reviewing).
**Objects:** Inspection forms, submissions, defects, issues.
**Why it's distinct:** Self-contained field workflow. A driver with a phone does an inspection → system creates issues. Doesn't need work orders, parts, or analytics to function.
**Current tier:** All plans (two-way Motive sync is Premium).
**Connections OUT:** Failed items → Issues → feeds Maintenance.

### 4. Fuel Management
**What:** Fuel entries, fuel card integrations (WEX, FLEETCOR, etc.), economy tracking (MPG), cost tracking, exception alerts, GPS-vs-location mismatch.
**Primary users:** Fleet managers, drivers (logging fills), finance.
**Objects:** Fuel entries, fuel cards, alerts.
**Why it's distinct:** Own data sources (fuel cards), own workflows (anomaly detection), own reports. Mostly independent from maintenance.
**Current tier:** Basic on all plans. Advanced alerts (GPS cross-reference) need telematics → Professional+.
**Connections IN:** Needs Telematics for GPS-based fraud alerts.
**Connections OUT:** Cost data → Analytics.

### 5. Maintenance Operations
**What:** Service entries, service reminders (time/mileage/engine hours), work orders, work order workflows, service programs (PM schedules), labor clock in/out, enhanced service tasks.
**Primary users:** Fleet managers, mechanics, shop foremen.
**Objects:** Service entries, reminders, work orders, service programs, labor records.
**Why it's distinct:** This is the operational core — the jump from "tracking" to "managing" maintenance. The work order is the most complex object in the product (line items, status workflows, labor, parts, comments).
**Current tier:** Service entries/reminders on all plans. Work orders → Professional+. Enhanced tasks, labor, service program automations → Premium.
**Connections IN:** Issues from Inspections. Odometer/DTCs from Telematics. Parts from Inventory. Warranty data.
**Connections OUT:** Feeds Parts consumption. Can route to Shop Network. Feeds Billing.

### 6. Parts & Inventory
**What:** Parts catalog, inventory tracking (on-hand, by location down to aisle/row/bin), low inventory alerts, automatic adjustment on work orders, purchase orders, PO auto-approval.
**Primary users:** Parts managers, mechanics, procurement.
**Objects:** Parts, inventory locations, stock levels, purchase orders.
**Why it's distinct:** Completely separate domain. Has its own users (parts manager), own procurement workflow (POs), own alerts (low stock). Many fleets don't manage their own parts at all.
**Current tier:** Basic catalog on Professional. Full inventory + POs → Premium only.
**Connections IN:** Work orders consume parts.
**Connections OUT:** POs to vendors. Low stock alerts.

### 7. Shop Network (Outsourced Maintenance)
**What:** Access to 110,000+ shops (US/Canada), line-by-line estimate approval, vendor portal, shop search from mobile, Geotab integration.
**Primary users:** Fleet managers (approving work), external shops (via vendor portal).
**Objects:** Shop records, estimates, repair orders (14M+/year).
**Why it's distinct:** Fundamentally different workflow from in-house maintenance. You're not managing mechanics — you're managing vendors. Different approval flow, different cost structure, different users. The vendor portal is essentially a separate product for shops.
**Current tier:** Professional+ (included in subscription, ~3% take rate on repair volume but GMV is modest today).
**Connections IN:** Vehicle data for shop context.
**Connections OUT:** Completed repair orders → service history.

### 8. Tire Management
**What:** Tire inventory, tread depth/air pressure monitoring, axle position tracking, rotation tracking, performance reporting, specialized part fields.
**Primary users:** Fleet managers, tire specialists.
**Objects:** Tires, positions, measurements, tire-specific parts.
**Why it's distinct:** Highly specialized vertical module with its own data model (axle positions, tread depth). Only relevant to certain fleet types (trucking, transportation). Could be its own mini-product.
**Current tier:** Premium only.
**Connections:** Sits alongside Parts & Inventory but has unique schema.

### 9. Warranty Management
**What:** Standard/extended warranty tracking, warranty alerts surfaced in work orders, part warranty opportunity reports.
**Primary users:** Fleet managers, mechanics (get alerts during work).
**Objects:** Warranty records, alerts.
**Why it's distinct:** Small but self-contained. The key integration is the work order alert — "check warranty before you do this repair." The Auto Integrate acquisition (March 2025) signals this is becoming more important.
**Current tier:** Premium only.
**Connections:** Surfaces in work orders. Links to parts.

### 10. Billing / Shop Profit Center
**What:** Markups (percentage or fixed), quoting (turn work orders into quotes), invoicing (generate and email invoices).
**Primary users:** Shop managers, fleet companies that do maintenance for others.
**Objects:** Quotes, invoices, markup rules.
**Why it's distinct:** This is a different business model — it turns a cost center (maintenance) into a revenue center. A fleet with an internal shop that also services other companies' vehicles needs this. The workflow is: work order → add markups → generate quote → customer approves → do work → invoice.
**Current tier:** Premium only.
**Connections IN:** Work orders, parts, labor.
**Connections OUT:** Invoices to customers.

### 11. Telematics Hub
**What:** 20+ third-party telematics integrations (Geotab, Samsara, Motive, etc.), automatic odometer/engine hours sync, live location, location history, DTC alerts, sensor data, geofencing.
**Primary users:** Fleet managers, dispatchers.
**Objects:** Telematics connections, location records, DTC codes, sensor snapshots.
**Why it's distinct:** Pure integration/data layer. Fleetio doesn't make hardware — it aggregates data from multiple telematics providers into a single view. This is the "hardware-agnostic" play. Each integration is its own connector with different data frequencies and capabilities.
**Current tier:** Basic (native Cat/Deere) on all plans. Third-party integrations → Professional+. Sensor data → Premium.
**Connections OUT:** Odometer → Service Reminders. DTCs → Issues → Work Orders. Location → Fuel alerts. Location → Shop Network search.

### 12. Analytics & Intelligence
**What:** Standard reports, custom dashboards, visualizations, threshold alerts, report scheduling/sharing, pre-built dashboards (Fleet Overview, Maintenance Costs, Fuel Costs, Parts, Inspections).
**Primary users:** Fleet managers, executives, finance.
**Objects:** Reports, dashboards, charts, alerts.
**Why it's distinct:** Pure output/insight layer. Consumes data from every other module. Was previously sold as a separate add-on — proving it has standalone value.
**Current tier:** Standard reports on all plans. Custom dashboards → Professional. Advanced Analytics → Premium.
**Connections IN:** Reads from everything.

### 13. Automations Engine
**What:** Trigger/condition/action rules, automation templates, email actions, purchase order auto-approval, service program automations.
**Primary users:** Fleet managers, admins.
**Objects:** Automation rules, triggers, conditions, actions, execution logs.
**Why it's distinct:** Horizontal orchestration layer. Crosses every module boundary. Currently running 300+ workflows and 200K+ automation runs. This is the "glue" that turns individual modules into an integrated system.
**Current tier:** Professional+ (PO auto-approval and service program automations → Premium).
**Connections:** Touches everything. The meta-module.

### 14. API / Developer Platform
**What:** REST API, 50+ webhook event types, OAuth, API keys, developer portal.
**Primary users:** Developers, IT teams, system integrators.
**Objects:** API keys, webhooks, OAuth tokens.
**Why it's distinct:** Platform extensibility. Different buyer (IT team, not fleet manager). Enables custom integrations that Fleetio doesn't build natively.
**Current tier:** Professional+ only.

### Bonus: Tools/Equipment Tracking (Add-on)
**What:** Tool tracking, barcode check-in/out, assignment, usage audit trail, service entries on tools.
**Already an add-on** at ~$0.50/tool/month. Proves the modular model works.

### Bonus: Recall Management
**What:** NHTSA recall alerts, year/make/model matching, recall-to-issue workflow.
**Current tier:** Professional+.
**Small module.** Could be part of Fleet Registry or Compliance. US-only.

---

## Data Flow Map

This is how data moves between modules. The arrows show dependency direction (A → B means A creates data that B consumes).

```
                          ┌─────────────┐
                          │ TELEMATICS  │ (20+ providers)
                          │    HUB      │
                          └──────┬──────┘
                                 │
                    odometer, DTCs, location, sensors
                                 │
                    ┌────────────┼────────────────┐
                    ▼            ▼                 ▼
            ┌──────────┐  ┌───────────┐    ┌──────────┐
            │  SERVICE  │  │  ISSUES   │    │   FUEL   │
            │ REMINDERS │  │ (from DTCs│    │   MGMT   │
            └─────┬─────┘  │  & inspx) │    │(GPS alert│
                  │        └─────┬─────┘    │ enrichm.)│
                  │              │           └──────────┘
                  ▼              ▼
          ┌──────────────────────────┐
          │   MAINTENANCE OPERATIONS │
          │  (Work Orders are the    │◄─── Issues from INSPECTIONS
          │   central workflow)      │
          └──────┬────────┬─────────┘
                 │        │
        ┌────────┘        └──────────┐
        ▼                            ▼
  ┌───────────┐              ┌──────────────┐
  │  PARTS &  │              │ SHOP NETWORK │
  │ INVENTORY │              │ (outsourced) │
  │           │              └──────────────┘
  └─────┬─────┘
        │ low stock
        ▼
  ┌───────────┐     ┌───────────┐
  │ PURCHASE  │     │ WARRANTY  │──► alerts in work orders
  │  ORDERS   │     │   MGMT    │
  └───────────┘     └───────────┘

  ┌───────────┐
  │ TIRE MGMT │ (specialized vertical module, parallel to parts)
  └───────────┘

  ┌───────────┐
  │ BILLING   │◄── work orders + parts + labor → quotes → invoices
  │ (PROFIT   │
  │  CENTER)  │
  └───────────┘

  ╔═══════════════════════════════════════════════╗
  ║ AUTOMATIONS ENGINE — orchestrates across all  ║
  ╚═══════════════════════════════════════════════╝

  ╔═══════════════════════════════════════════════╗
  ║ ANALYTICS — reads from everything             ║
  ╚═══════════════════════════════════════════════╝

  ╔═══════════════════════════════════════════════╗
  ║ API / DEVELOPER PLATFORM — exposes everything ║
  ╚═══════════════════════════════════════════════╝

  ┌─────────────────────────────────────────┐
  │ FLEET REGISTRY + CONTACTS + MOBILE APP  │ ◄── The foundation everything sits on
  └─────────────────────────────────────────┘
```

---

## Natural Contour Lines: Four Concentric Rings

The modules naturally organize into concentric rings based on their distance from the core use case ("I need to track and maintain my vehicles").

### Ring 0 — The Foundation
*What you need to have a fleet management system at all.*

| Module | Why it's foundational |
|--------|----------------------|
| Fleet Registry | The database. Everything attaches to a vehicle record. |
| Contacts & Drivers | Can't manage vehicles without knowing who drives them. |
| Inspections | Regulatory requirement (DVIRs). The most basic field workflow. |
| Basic Fuel Tracking | Manual entries + fuel card import. Basic cost tracking. |
| Mobile App (Fleetio Go) | The field interface. Drivers live here. |

**Characteristic:** Tracking-oriented. You're recording what happened. Minimal workflow complexity. A 10-truck plumber lives here.

### Ring 1 — Operational Management
*The jump from tracking to actively managing operations.*

| Module | Why it's in this ring |
|--------|-----------------------|
| Work Orders | The key operational object. Transforms maintenance from a log into a managed workflow. |
| Service Programs | Structured preventive maintenance schedules. Proactive, not reactive. |
| Telematics Hub | Data enrichment from hardware. Automates odometer, surfaces DTCs, enables location-based workflows. |
| Automations | Workflow orchestration. "When X happens, do Y." The efficiency multiplier. |
| Recall Management | Regulatory awareness. Small but operationally important. |

**Characteristic:** Workflow-oriented. You're managing processes, not just recording events. A 100-vehicle regional company lives here. This is where Fleetio starts saving real time and money.

**Key seam: Ring 0 → Ring 1 is the biggest jump in the product.** It's the difference between a digital logbook and an operations platform. This is where the current Essential → Professional boundary sits, and it's actually well-placed.

### Ring 2 — Specialized Depth
*Modules that serve specific operational needs. Not every fleet needs all of these.*

| Module | Who needs it |
|--------|-------------|
| Parts & Inventory | Fleets with in-house shops that stock parts. |
| Shop Network | Fleets that outsource maintenance (or do a mix). |
| Tire Management | Trucking, transportation, heavy vehicle fleets. |
| Warranty Management | Fleets with newer vehicles or extended warranty programs. |
| Billing / Shop Profit Center | Fleets whose shop also services external customers. |

**Characteristic:** These are the modules where customer needs genuinely diverge. A construction company with 200 excavators has very different Ring 2 needs than a pest control company with 200 vans. The construction company needs Parts & Inventory and Tire Management. The pest control company needs Shop Network (they outsource everything).

**This is where the current packaging breaks.** All of Ring 2 is locked behind Premium at $10/vehicle. A fleet that needs only Shop Network (currently free in Professional) gets it, but a fleet that needs only Warranty Management must buy all of Premium. There's no way to buy depth in one domain without buying depth in all domains.

### Ring 3 — Intelligence & Platform
*Layers that sit on top of everything and multiply value.*

| Module | What it does |
|--------|-------------|
| Analytics & Intelligence | Turns operational data into business insight. ROI-focused. |
| AI Features (Smart Uploads, future) | Automation of manual work. Time savings. |
| API / Developer Platform | Extensibility. Custom integrations. IT buyer. |

**Characteristic:** These don't do operational work themselves — they amplify the value of Rings 0-2. A fleet gets more value from Analytics the more modules they use. API access is meaningless without data flowing through the system. AI features (Smart Uploads) automate Ring 1-2 workflows.

---

## Where the Seams Are (Packaging Implications)

### Strong seams (clean separation, low coupling)
These modules can be packaged independently with minimal confusion:

1. **Parts & Inventory** — Own objects, own users, own procurement workflow. Clean input (work orders consume parts) and output (PO to vendor).
2. **Tire Management** — Entirely self-contained. Specialized data model. Only relevant to certain verticals.
3. **Shop Network** — Fundamentally different workflow than in-house maintenance. Different users (fleet manager + external shops).
4. **Billing / Shop Profit Center** — Different business model (revenue center vs. cost center). Different buyer.
5. **Analytics** — Already was a separate add-on. Proves it can be sold independently.
6. **API / Developer Platform** — Different buyer (IT team). Different value proposition.
7. **Tools/Equipment** — Already an add-on. Proven.

### Weak seams (high coupling, hard to separate)
These modules are tightly interleaved and hard to sell independently:

1. **Work Orders ↔ Service Reminders ↔ Service Programs** — These are one workflow, not three products. You can't meaningfully sell work orders without reminders.
2. **Telematics ↔ Fuel alerts** — GPS-based fuel fraud detection requires telematics data. Can't sell the alert without the data source.
3. **Warranty ↔ Work Orders** — Warranty alerts surface inside work orders. Without work orders, warranty tracking is just a database field.
4. **Automations ↔ Everything** — Automations span every module. Hard to say "you get automations for maintenance but not for inspections."
5. **Inspections ↔ Issues ↔ Work Orders** — The inspection → issue → work order pipeline is a single flow. Inspections without the downstream workflow lose half their value.

### The big architectural tension
**Automations and Telematics are horizontal capabilities that cross every module boundary.** If you modularize Ring 2, do automations work across all your purchased modules? What about telematics data — does it only flow into modules you've paid for?

The cleanest answer: **Automations and Telematics are part of Ring 1 (Operational Management) and work across whatever Ring 2 modules you add.** They're platform capabilities, not modules.

---

## The Five Packaging-Ready Modules

If you were to modularize Ring 2, these are the natural products:

| Module | Standalone value | Primary persona | Current state |
|--------|-----------------|-----------------|---------------|
| **Parts & Inventory** | "Manage your parts room" | Parts manager, shop foreman | Premium-gated |
| **Shop Network** | "Outsource maintenance smarter" | Fleet manager | Free in Professional+ |
| **Tire Management** | "Track every tire on every axle" | Fleet/tire manager | Premium-gated |
| **Billing Suite** | "Turn your shop into a profit center" | Shop manager, finance | Premium-gated |
| **Advanced Analytics** | "See what your fleet data is telling you" | Fleet manager, executives | Premium-gated (was add-on) |

Warranty Management is too small to be a standalone module — it naturally bundles with Maintenance Operations or Parts & Inventory.

Recall Management is too small to be standalone — it naturally bundles with Fleet Registry or the Telematics Hub.

---

## Connection Strength Matrix

How tightly coupled is each module to every other? (3 = deeply interleaved, 2 = meaningful data exchange, 1 = light touch, 0 = independent)

| | Registry | Contacts | Inspect. | Fuel | Maint. | Parts | Shop Net | Tires | Warranty | Billing | Telem. | Analytics | Automat. | API |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Registry** | — | 3 | 2 | 2 | 3 | 1 | 1 | 1 | 1 | 0 | 2 | 2 | 1 | 1 |
| **Contacts** | 3 | — | 2 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 |
| **Inspections** | 2 | 2 | — | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 1 |
| **Fuel** | 2 | 1 | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 1 | 1 |
| **Maintenance** | 3 | 2 | 2 | 0 | — | 3 | 2 | 1 | 2 | 3 | 2 | 2 | 2 | 1 |
| **Parts** | 1 | 0 | 0 | 0 | 3 | — | 0 | 2 | 2 | 2 | 0 | 1 | 1 | 1 |
| **Shop Network** | 1 | 0 | 0 | 0 | 2 | 0 | — | 0 | 0 | 0 | 1 | 1 | 1 | 1 |
| **Tires** | 1 | 0 | 0 | 0 | 1 | 2 | 0 | — | 0 | 0 | 0 | 1 | 0 | 1 |
| **Warranty** | 1 | 0 | 0 | 0 | 2 | 2 | 0 | 0 | — | 0 | 0 | 1 | 1 | 1 |
| **Billing** | 0 | 0 | 0 | 0 | 3 | 2 | 0 | 0 | 0 | — | 0 | 1 | 0 | 1 |
| **Telematics** | 2 | 0 | 1 | 2 | 2 | 0 | 1 | 0 | 0 | 0 | — | 1 | 1 | 1 |
| **Analytics** | 2 | 1 | 1 | 1 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | — | 1 | 1 |
| **Automations** | 1 | 1 | 1 | 1 | 2 | 1 | 1 | 0 | 1 | 0 | 1 | 1 | — | 1 |
| **API** | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | — |

**Highest coupling cluster:** Maintenance ↔ Parts ↔ Billing ↔ Warranty (the "in-house shop" cluster)
**Most independent modules:** Shop Network, Tire Management, Analytics, API

---

## Key Takeaway

The product has **one clear core** (Registry + Inspections + Basic Maintenance + Fuel + Mobile), **one operational layer** (Work Orders + Automations + Telematics), and then **genuinely divergent specialized modules** in Ring 2 that different customers value differently.

The current packaging forces Ring 2 into a single Premium tier, which means:
- A fleet that needs only Parts & Inventory subsidizes Tire Management, Billing, and Warranty
- A fleet that needs only the Shop Network gets it free (in Professional) while a fleet that needs only Warranty pays $10/vehicle for everything
- There's no way to express "I'm a sophisticated fleet that outsources maintenance" differently from "I'm a sophisticated fleet with an in-house shop"

The natural contour lines suggest Ring 2 should be **modular** — pick the depth you need. Rings 0-1 should stay **tiered** (everyone follows roughly the same progression from tracking → operations). Ring 3 (Intelligence & Platform) could go either way — add-ons or tier features.
