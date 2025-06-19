# Backend Engineering Task – High-Volume Ingestion & Scalable Architecture Design

This project is a TypeScript-based backend system designed to ingest, store, and retrieve high-frequency device data. 

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

```
cp .env.example .env
```

### 2. Build and run
```bash
docker-compose up --build
```

### 3. Testing End-points

#### Ingest Data (POST)
- Send a JSON payload to the ingestion endpoint. The server will respond with ```{"status": "accepted"}```.
```
curl -X POST -H "Content-Type: application/json" \
  -d '{"device": "fitband-alpha", "timestamp": 1750240800, "heartRateValue": 88}' \
  http://localhost:3000/vital-data

curl -X POST -H "Content-Type: application/json" \
  -d '{"device": "smart-scale-beta", "timestamp": 1750240860, "bloodPressureSystolic": 118, "bloodPressureDiastolic": 78}' \
  http://localhost:3000/vital-data
```
#### Query Data (GET)
- Retrieve the latest data. The sortBy parameter can be deviceId, heartRate, breathRate, or timestamp.

# Get the latest data, sorted by newest timestamp first
```
curl "http://localhost:3000/vital-data?count=5&sortBy=timestamp&orderBy=desc"
```

## API Endpoints

## POST `/vital-data`
Accepts a JSON payload for a single device measurement.

### Body
A JSON object matching the `VitalData` schema:

- `device` (string, required)
- `timestamp` (number, required)
- Other vital signs (e.g., `heartRateValue`) are optional numbers.

### Success Response
- `202 Accepted`

### Failure Response
- `400 Bad Request` with details of validation errors.

---

## GET `/vital-data`
Retrieves a paginated and sorted list of the latest data for all devices.

### Query Parameters
- `count` (number, optional, default: 20, max: 100): Number of records per page.
- `offset` (number, optional, default: 0): Number of records to skip.
- `sortBy` (string, optional, default: `timestamp`): Column to sort by.  
  Allowed values: `deviceId`, `heartRate`, `breathRate`, `timestamp`.
- `orderBy` (string, optional, default: `desc`): Sort order.  
  Allowed values: `asc`, `desc`.

### Success Response
- `200 OK` with a JSON body containing `total` and `resources` fields.

---

## Limitations and Trade-offs

- **In-Memory Queue**: Simple array; data is lost on crash.  
  *Improvement*: Use Redis or RabbitMQ.

- **Basic Worker**: Uses `setInterval`, lacks backpressure handling.  
  *Improvement*: Use a job queue library or a separate worker process, like bullq 

- **No Dead-Letter Queue**: Failed batches are only logged.  
  *Improvement*: Add a DLQ for inspection and reprocessing.

- **No Authentication**: Endpoints are publicly accessible.  
  *Improvement*: Implement API key or OAuth 2.0.

---

## Architectural Critique & Future Considerations

### Is HTTP the right protocol?
No. For high-frequency telemetry, HTTP/1.1 is inefficient.

### Better Protocols
- **MQTT**: A lightweight, publish/subscribe protocol that maintains a persistent connection, drastically reducing overhead.
- **gRPC**: Uses HTTP/2 for multiplexing and Protocol Buffers for efficient binary serialization, making it much faster and less bandwidth-intensive than REST over HTTP/1.1.

---

## Alternative Architectures

**Devices → MQTT Broker → Kafka → Stream Processor → Databases**

### Components
- **MQTT Broker** (e.g., EMQX, HiveMQ): Devices connect to an MQTT broker, which can handle millions of persistent connections efficiently.
- **Apache Kafka**: The MQTT broker forwards all messages to a Kafka topic. Kafka provides a highly durable, scalable, and persistent log of all incoming events, acting as a central buffer for the entire system.
- **Stream Processor** (e.g., Flink, ksqlDB):  A stream processing engine consumes data from Kafka in real-time. It can perform transformations, aggregations (e.g., calculating 5-minute average heart rate), and route data to different destinations.
- **Databases**:
  - The processor can write the raw event data to a data lake (like S3) for analytics, and simultaneously update a high-performance database (like PostgreSQL or a time-series DB like InfluxDB) to serve real-time queries

---

# Potential System Improvements

- **Dedicated Cache**: Introduce a Redis cache in front of the read endpoint (GET /vital-data) to serve popular queries with sub-millisecond latency.
- **Horizontal Scaling**: The backend service is stateless and can be scaled horizontally by running multiple instances behind a load balancer.
- **Database Scaling**: For read-heavy workloads, PostgreSQL can be scaled by introducing one or more read replicas.

