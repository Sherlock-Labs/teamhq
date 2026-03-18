# Fleetio Fleet Segmentation: Parameter-Based

## The Five Parameters

1. **In-house vs. outsourced** — % of repairs done in own shop (0% to 90%+)
2. **Asset type mix** — light vehicles, medium trucks, Class 7-8, trailers, heavy equipment
3. **Annual miles/vehicle** — how hard the fleet works
4. **Geographic spread** — single site, regional, multi-state, national
5. **Downtime cost/vehicle/day** — economic impact when a vehicle is out of service

## How They Cluster

These five parameters aren't independent — they correlate. Certain combinations show up together repeatedly because they describe real operating models. Five natural clusters emerge:

---

### Cluster 1: Light-Duty Service Fleets
**The van fleet that gets people to job sites.**

| Parameter | Typical value |
|-----------|--------------|
| In-house | 0–10% (outsource nearly everything) |
| Asset types | Vans, pickups, light trucks — homogeneous |
| Annual miles | 15,000–30,000 |
| Geo spread | Regional to multi-state |
| Downtime cost | $100–400/day (tech can't reach the job, but company doesn't halt) |

**Examples:** Pest control (Terminix, Rentokil), HVAC, plumbing, landscaping, home health, property management, solar installers

**What they need from Fleetio:**
- Ring 0: Inspections (pre-trip), fuel tracking, mobile app — this is the daily driver workflow
- Ring 1: Work orders (to track what the shop did), telematics (basic location + odometer), automations (PM reminders)
- Ring 2: **Shop Network only.** No parts room, no mechanics, no tire tracking. They call Firestone.
- Ring 3: Basic reporting. Maybe API if they have a field service platform to integrate.

**What they don't need:** Parts & Inventory, Tire Management, Warranty, Billing, labor tracking, enhanced service tasks, purchase orders.

**Willingness to pay:** Low to moderate. Fleet is overhead, not the product. $5–8/vehicle/month is the sweet spot. Sensitive to price because maintenance isn't where they compete.

---

### Cluster 2: Large Private Fleets
**The fleet where vehicles are revenue-critical and the shop runs all day.**

| Parameter | Typical value |
|-----------|--------------|
| In-house | 60–85% (full shop operations; outsource overflow and specialty work) |
| Asset types | Medium-duty trucks, Class 6-7, step vans, trailers |
| Annual miles | 30,000–80,000 |
| Geo spread | Regional to multi-state (hub-and-spoke distribution) |
| Downtime cost | $600–1,500+/day (route doesn't get covered, deliveries missed) |

**Examples:** Beverage distribution (Coca-Cola, Pepsi bottlers), food service (Sysco, US Foods), waste haulers, building materials, linen/uniform services

**What they need from Fleetio:**
- Ring 0: Everything — inspections, fuel tracking, asset management at scale
- Ring 1: High work order volume, aggressive PM programs, telematics (Samsara/Motive/Geotab), automations for scheduling and routing
- Ring 2: **Most of it.** Parts & Inventory (large parts rooms, often multiple locations). Tire Management (high daily miles burn through tires — standard commercial sizes but high volume). Warranty (fleet refreshes mean active warranty tracking). Shop Network (for overflow or when a truck breaks down away from home base).
- Ring 3: Advanced Analytics (cost per mile, cost per route). API (integration with ERP, WMS, route optimization). AI features (Smart Uploads for high invoice volume).

**What defines this segment:** High maintenance intensity on revenue-critical assets. These aren't for-hire carriers (OTR trucking is a different market that Fleetio doesn't primarily serve) — they're private fleets where vehicles serve the core business. A beverage distributor's truck at 60K miles/year in stop-and-go delivery needs PM every 4–6 weeks. Downtime means routes don't get covered and customers don't get served. Most Ring 2 modules have measurable ROI for this fleet.

**Willingness to pay:** High. $12–18/vehicle/month. Clear ROI on each module. A $14/vehicle/month subscription on a 500-truck fleet is $84K/year — easily justified against downtime costs and maintenance efficiency gains.

**Note:** This is distinct from OTR (over-the-road) trucking — truckload carriers, LTL, etc. Those fleets are served by TMS-centric platforms (Samsara, Motive) and aren't Fleetio's primary market. Large private fleets share some characteristics (in-house shops, high maintenance intensity) but operate in a fundamentally different model: the vehicle serves the business, rather than being the business.

---

### Cluster 3: Mixed Fleet / Heavy Equipment
**The fleet with trucks AND machines, measured in hours AND miles.**

| Parameter | Typical value |
|-----------|--------------|
| In-house | 40–70% (own shop for routine; specialty work outsourced) |
| Asset types | Mixed — pickups, dump trucks, excavators, loaders, skid steers, generators, trailers |
| Annual miles | Varies wildly — trucks: 15,000–40,000; equipment: measured in engine hours (500–2,000/year) |
| Geo spread | Regional (job sites within a region, but assets move between sites) |
| Downtime cost | $500–1,500/day (equipment idle on a job site = crew idle = project delayed) |

**Examples:** Construction (general, heavy civil, road), utilities, oil & gas services, mining, forestry

**What they need from Fleetio:**
- Ring 0: "Assets" mode (not "Vehicles"). Engine hours tracking alongside miles. OEM service programs (Cat/Deere templates). Inspections customized for equipment.
- Ring 1: Work orders, but the complexity is different — equipment repairs are longer, more expensive, more specialized. Service programs by engine hours, not miles.
- Ring 2: Parts & Inventory (stock parts for equipment that dealers take weeks to ship). Tire Management (earthmovers, dump trucks — specialized tires, expensive). Warranty (new Cat/Deere equipment comes with 2–5 year warranties worth tracking). Less need for Shop Network (equipment is too specialized for Firestone).
- Ring 3: Analytics (cost per hour, utilization rates — is this excavator earning its keep?). API (integration with project management, job costing).

**What defines this segment:** Asset heterogeneity is the dominant parameter. They don't have "a fleet" — they have 6 different types of assets with different maintenance intervals, different parts, different tracking units (miles vs. hours vs. cycles). The product has to handle all of them.

**Willingness to pay:** Medium to high. $10–15/vehicle/month. Equipment downtime is expensive but they're also managing tight project margins. The value prop is: "stop losing $1,500/day to avoidable downtime on a $400K excavator."

---

### Cluster 4: Last-Mile / High-Frequency
**The fleet that runs hard every day on short routes with lots of stops.**

| Parameter | Typical value |
|-----------|--------------|
| In-house | 10–40% (larger fleets build a shop; smaller ones outsource) |
| Asset types | Sprinter/Transit vans, box trucks, cargo vans — relatively homogeneous |
| Annual miles | 25,000–50,000 (high daily miles, lots of stop-and-go, hard on brakes/tires) |
| Geo spread | Metro / regional hub-and-spoke (distribution center → routes → back) |
| Downtime cost | $500–1,200/day (a route doesn't get covered, packages don't get delivered, SLAs broken) |

**Examples:** Amazon DSPs, FedEx Ground contractors, food/grocery delivery, medical supply delivery, courier services, linen/uniform services

**What they need from Fleetio:**
- Ring 0: Inspections are critical (DOT for box trucks, internal for vans). High-frequency — every driver every day.
- Ring 1: Automations are the killer feature — with high vehicle counts doing the same routes, PM scheduling and issue routing need to be automated. Telematics essential (GPS for route compliance, odometer for PM triggers). Work orders at volume.
- Ring 2: Shop Network if outsourcing. Parts & Inventory if in-house. Tire Management is moderate — they burn through tires but they're standard sizes, not the specialized tracking that trucking needs.
- Ring 3: Analytics — cost per route, cost per delivery, fleet utilization.

**What defines this segment:** Volume and velocity. More maintenance events per vehicle per year than any other segment because of high daily miles and stop-and-go driving. Brake pads, tires, and suspension wear fast. The fleet manager is drowning in volume — automations and streamlined work order flows matter more than specialized modules.

**Willingness to pay:** Medium. $8–12/vehicle/month. They're cost-conscious (thin margins on delivery) but they understand that a van sitting in the shop means missed deliveries. The value prop is operational efficiency at scale, not deep domain features.

---

### Cluster 5: Institutional / Government
**The fleet that serves internal "customers" and reports to a board.**

| Parameter | Typical value |
|-----------|--------------|
| In-house | 70–90% in-house (own shop, union mechanics) but also outsource specialty work — hybrid model |
| Asset types | Wildly mixed — police cars, fire trucks, dump trucks, mowers, sedans, utility trucks, ambulances |
| Annual miles | Low to moderate (8,000–20,000) — most vehicles don't go far |
| Geo spread | Single jurisdiction (city, county, campus) |
| Downtime cost | Variable and political — a police car down ≠ a parks truck down, but both create constituent complaints |

**Examples:** Cities, counties, state agencies, school districts, universities, transit authorities, military installations

**What they need from Fleetio:**
- Ring 0: Everything, but with extreme asset heterogeneity (more asset types than any other segment).
- Ring 1: Work orders, service programs — but the urgency model is different. Priority is by department/function, not revenue impact. "The mayor's car" vs. "a spare pickup in parks dept."
- Ring 2: Parts & Inventory (always — they stock everything because procurement cycles are long). Billing (internal chargebacks between departments — "Public Works charges Parks $450 for that repair"). Shop Network for specialty/overflow work (despite having in-house shops, they outsource transmission rebuilds, body work, and specialty equipment). **Motor Pool** — shared vehicle reservations, check-in/check-out, department allocation. This is a major PubSec-specific need that doesn't exist in Fleetio today.
- Ring 3: Analytics and reporting are disproportionately important — they report to city council, board of supervisors, taxpayers. Need to justify budgets with data. API for ERP integration (Workday, Tyler/Munis, Oracle).

**What defines this segment:** Internal chargebacks, political reporting, and the hybrid maintenance model. They're the only segment where Billing is used not to generate external revenue but to allocate internal costs. Analytics isn't about optimizing — it's about accountability and budget justification. Motor Pool is a verticalized capability unique to this segment — universities, cities, and agencies manage shared vehicle pools that departments reserve, and tracking utilization justifies fleet size decisions to boards and councils. Procurement is slow (government purchasing rules), but contracts are extremely sticky (3–5 year terms, painful to switch).

**Willingness to pay:** Moderate, but sticky. $8–12/vehicle/month. Government procurement cycles are long but once you're in, you're in for years. Total contract value is high because of fleet size and contract length, even if per-vehicle pricing is moderate.

---

## The 3×2 That Actually Predicts Packaging

The five parameters are useful for understanding customers, but for **packaging decisions** the two that matter most are:

**Axis 1: Maintenance model (outsourced → hybrid → in-house)** — determines which Ring 2 modules they need
**Axis 2: Downtime cost per vehicle per day** — determines willingness to pay per vehicle

The maintenance model isn't binary. Many fleets — especially government, institutional, and mid-size construction — run a hybrid model: they have an in-house shop for routine PM but outsource specialty work, overflow, or OTR breakdowns. This matters for packaging because hybrid fleets need *both* Parts & Inventory (for their shop) *and* Shop Network (for outsourced work).

```
                          DOWNTIME COST / VEHICLE / DAY
                      Low ($100-400)            High ($500-2,000+)
                 ┌─────────────────────┬──────────────────────────┐
    OUTSOURCED   │  Light-Duty         │  Last-Mile /              │
    (no shop)    │  Service Fleets     │  High-Frequency           │
                 │                     │                           │
                 │  Need: Shop Net     │  Need: Shop Net +         │
                 │  WTP: $5-8/veh      │  Automations + Telem      │
                 │                     │  WTP: $8-12/veh           │
                 ├─────────────────────┼──────────────────────────┤
    HYBRID       │  Gov / PubSec /     │  Mixed Fleet /            │
    (shop +      │  Universities       │  Construction             │
     outsource)  │                     │                           │
                 │  Need: Parts +      │  Need: Parts + Shop Net + │
                 │  Billing + Motor    │  Tires + Equipment Hours  │
                 │  Pool + Analytics   │  WTP: $10-15/veh          │
                 │  WTP: $8-12/veh     │                           │
                 ├─────────────────────┼──────────────────────────┤
    IN-HOUSE     │  Regional Fleets    │  Large Private Fleets     │
    (full shop)  │  (single-site ops)  │  (beverage, food, waste)  │
                 │                     │                           │
                 │  Need: Parts +      │  Need: Parts + Tires +    │
                 │  Work Orders        │  Warranty + Shop Net      │
                 │  WTP: $8-12/veh     │  WTP: $12-18/veh         │
                 └─────────────────────┴──────────────────────────┘
```

**What this tells you about packaging:**

- **Outsourced + low downtime:** These customers need Ring 0-1 + Shop Network. They'll never buy Parts or Tire Management. They're price-sensitive. The ideal package is Professional + Shop Network (which is exactly what they get today for free — and why they have no reason to upgrade to Premium).

- **Outsourced + high downtime:** These customers need Ring 0-1 heavily, with operational efficiency features (automations, telematics). They might add Shop Network. They'll pay more because downtime hurts. The ideal package is Professional with strong Ring 1 + optional Shop Network.

- **Hybrid + low downtime:** Government and institutional. They run their own shop but also outsource specialty/overflow work. They need Parts & Inventory, Billing (internal chargebacks between departments), Analytics (budget justification), and Motor Pool (shared vehicle reservations — a verticalized capability that doesn't exist in Fleetio today but is a major PubSec need). They may also use Shop Network for outsourced work. The ideal package is modular: Parts + Billing + Analytics + Motor Pool as add-ons.

- **Hybrid + high downtime:** Mixed fleet / construction. Equipment is too specialized for generic shops (outsource for some), but they also maintain common vehicles in-house. Need Parts, Shop Network, Tire Management, and equipment-specific features (engine hours tracking). The hybrid model means they need modules from both the "outsourced" and "in-house" columns.

- **In-house + low downtime:** Regional fleets with a single shop doing most work themselves. Need Parts & Inventory and strong Work Order management, but simpler needs than national carriers. Less likely to need Shop Network, Tire Management at scale, or Warranty tracking.

- **In-house + high downtime:** Power users — large private fleets (beverage, food service, waste, building materials). They need most or all Ring 2 modules: Parts, Tires, Warranty, and often Shop Network for overflow or when a truck breaks down away from home base. These are the customers Premium was designed for — and the closest segment to where bundling Ring 2 together actually makes sense. Highest WTP.

**The key insight:** Only the in-house + high-downtime cell (large private fleets) benefits from the current Premium bundle. The other five cells are either overpaying for modules they don't use, getting their key module free with no upgrade path, needing verticalized capabilities that don't exist yet (Motor Pool for PubSec), or requiring a hybrid mix of modules that doesn't match any current tier boundary. And notably, OTR trucking — the segment that would theoretically use *every* module at the highest intensity — isn't a market Fleetio primarily serves, which makes the "power user bundle" even narrower than it appears.
