# High-Volume Device Data Ingestion Service

This project is a TypeScript-based backend system designed to ingest, store, and retrieve high-frequency device data. It is built to be scalable, performant, and production-ready, based on intentionally ambiguous requirements to simulate a real-world engineering challenge.

---

## Table of Contents

- [Assumptions](#assumptions)
- [Architecture and Data Flow](#architecture-and-data-flow)
- [Design Decisions & Reasoning](#design-decisions--reasoning)
- [How to Reproduce](#how-to-reproduce)
- [API Endpoints](#api-endpoints)
- [Limitations and Trade-offs](#limitations-and-trade-offs)
- [Architectural Critique & Future Considerations](#architectural-critique--future-considerations)

---

## Assumptions

Due to vague requirements, the following assumptions were made:

- **High Ingestion Volume**: System must handle 1,000–5,000 requests/second.
- **Payload Variability**: Payloads may have unknown or extra fields.
- **Data Structure**:
  - `device`: Unique string identifier.
  - `timestamp`: Unix epoch (seconds).
  - Vital signs (e.g., `heartRateValue`): numeric fields.
- **Primary Read Pattern**: Fetch latest data per device — read-optimized schema.

---

## Architecture and Data Flow

The system uses a decoupled, asynchronous design for maximum throughput:

1. **POST `/vital-data` (Fastify)**  
   - Validates payload (using Zod).
   - Pushes data to in-memory queue.
   - Returns `202 Accepted`.

2. **Background Worker**  
   - Polls the queue in intervals.
   - Batches writes using `UPSERT` to PostgreSQL.

3. **Database**  
   - Optimized for latest-device-state queries.

4. **GET `/vital-data`**  
   - Fetches latest data from a materialized view/table.

---

## Design Decisions & Reasoning

| Component         | Technology/Pattern                     | Rationale                                                                 |
|------------------|-----------------------------------------|--------------------------------------------------------------------------|
| Web Framework     | Fastify                                 | High performance, lower overhead than Express.js                         |
| Ingestion Logic   | Decoupled via in-memory queue + worker  | Prevents blocking; supports high availability                            |
| Database          | PostgreSQL                              | Reliable, transactional, supports `UPSERT`                               |
| Schema Design     | Materialized view / latest-only table   | Optimized for read patterns                                              |
| Language          | TypeScript                              | Type safety, productivity, maintainability                               |
| Validation        | Zod                                     | Schema-first validation with TypeScript inference                        |
| Environment       | Docker Compose                          | Reproducible and easy-to-setup dev environment                           |

---

## How to Reproduce

### Prerequisites

- Node.js (v18+)
- Docker & Docker Compose

### 1. Setup Environment

```bash
cp .env.example .env
