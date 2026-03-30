# eTracs API Documentation

## Base URL
```
http://192.168.11.17:9050/api
```

## Table of Contents
- [Authentication](#authentication)
- [Response Formats](#response-formats)
- [Status Codes](#status-codes)
- [Entity Endpoints](#entity-endpoints)
- [Entity Individual Endpoints](#entity-individual-endpoints)
- [Examples](#examples)

---

## Authentication

**All API endpoints require authentication using an API key.**

### Configured API Keys
- `etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c` (Production)
- `etracs_test_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p` (Testing)

### Authentication Methods

#### Method 1: X-API-Key Header (Recommended)
```bash
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  http://192.168.11.17:9050/api/entities
```

#### Method 2: Bearer Token
```bash
curl -H "Authorization: Bearer etracs_test_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p" \
  http://192.168.11.17:9050/api/entities
```

### Authentication Error Responses

| Status Code | Scenario | Response |
|-------------|----------|----------|
| **401** | No API key provided | `{"message": "API key is missing. Provide it via X-API-Key header or Bearer token."}` |
| **403** | Invalid API key | `{"message": "Invalid API key."}` |
| **500** | API_KEYS not configured | `{"message": "API authentication is not configured on the server."}` |

---

## Response Formats

### Successful Pagination Response
```json
{
  "current_page": 1,
  "data": [...],
  "first_page_url": "http://...",
  "from": 1,
  "last_page": 100,
  "last_page_url": "http://...",
  "links": [...],
  "next_page_url": "http://...",
  "path": "http://...",
  "per_page": 20,
  "prev_page_url": null,
  "to": 20,
  "total": 2000
}
```

### Error Response
```json
{
  "message": "Error description"
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| **200** | Success |
| **401** | Unauthorized - Missing API key |
| **403** | Forbidden - Invalid API key |
| **404** | Not Found - Resource doesn't exist |
| **422** | Unprocessable Entity - Validation error |
| **500** | Internal Server Error |

---

## Entity Endpoints

### 1. List Entities

Returns a paginated list of entities.

**Endpoint:** `GET /entities`

**Query Parameters**

| Parameter | Type   | Required | Description                          |
|-----------|--------|----------|--------------------------------------|
| `search`  | string | No       | Filter by entity name or entity number |
| `page`    | int    | No       | Page number (default: 1)             |

**Example Requests**
```bash
# List all entities
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  http://192.168.11.17:9050/api/entities

# Search entities
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  "http://192.168.11.17:9050/api/entities?search=amaba&page=1"
```

**Example Response**
```json
{
  "current_page": 1,
  "data": [
    {
      "objid": "IND-10006567:16ab8cb6c90:-7e5b",
      "entityno": "04321-038811I",
      "name": "AMABA, ARTURO A.",
      "address_text": "LANAO, DALAGUETE, \nCEBU",
      "type": "INDIVIDUAL",
      "state": "ACTIVE"
    }
  ],
  "per_page": 20,
  "total": 1
}
```

---

### 2. Get Entity by ID

Returns a single entity with its individual details.

**Endpoint:** `GET /entities/{id}`

**Path Parameters**

| Parameter | Type   | Required | Description       |
|-----------|--------|----------|-------------------|
| `id`      | string | Yes      | Entity `objid`    |

**Example Request**
```bash
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  http://192.168.11.17:9050/api/entities/IND-10006567:16ab8cb6c90:-7e5b
```

**Example Response**
```json
{
  "objid": "IND-10006567:16ab8cb6c90:-7e5b",
  "entityno": "04321-038811I",
  "name": "AMABA, ARTURO A.",
  "address_text": "LANAO, DALAGUETE, \nCEBU",
  "type": "INDIVIDUAL",
  "state": "ACTIVE",
  "individual": {
    "objid": "IND-10006567:16ab8cb6c90:-7e5b",
    "lastname": "AMABA",
    "firstname": "ARTURO",
    "middlename": "A.",
    "birthdate": "1975-03-05",
    "gender": "M",
    "civilstatus": "MARRIED"
  }
}
```

**Error Response** — Entity not found
```json
{
  "message": "No query results for model [App\\Models\\Entity]."
}
```
HTTP Status: `404`

---

### 3. Duplicate Check

Checks for potential duplicate entity records. Accepts any combination of name fields and birthdate, scores each result by how many provided fields match, and returns the list sorted by match score descending.

**Endpoint:** `GET /entities/duplicate-check`

**Query Parameters**

| Parameter    | Type   | Required        | Description                        |
|--------------|--------|-----------------|------------------------------------|
| `firstname`  | string | At least one    | First name (case-insensitive)      |
| `middlename` | string | At least one    | Middle name (case-insensitive)     |
| `lastname`   | string | At least one    | Last name (case-insensitive)       |
| `birthdate`  | string | At least one    | Date of birth in `YYYY-MM-DD` format |

> At least one field must be provided. Providing all four fields enables 100% match detection.

**Scoring**

`match_score = (number of provided fields that match / number of provided fields) × 100`

| Provided Fields | All Match | Score  |
|-----------------|-----------|--------|
| 4               | Yes       | 100%   |
| 4               | 3 match   | 75%    |
| 2               | Both match| 100%   |
| 2               | 1 matches | 50%    |

**Example Requests**
```bash
# Full match with all fields
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  "http://192.168.11.17:9050/api/entities/duplicate-check?firstname=ARTURO&lastname=AMABA&middlename=A.&birthdate=1975-03-05"

# Partial fields (name only)
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  "http://192.168.11.17:9050/api/entities/duplicate-check?firstname=ARTURO&lastname=AMABA"
```

**Example Response**
```json
[
  {
    "objid": "IND-10006567:16ab8cb6c90:-7e5b",
    "entityno": "04321-038811I",
    "name": "AMABA, ARTURO A.",
    "firstname": "ARTURO",
    "middlename": "A.",
    "lastname": "AMABA",
    "birthdate": "1975-03-05",
    "address": {
      "text": "LANAO, DALAGUETE, \nCEBU",
      "barangay_name": "LANAO",
      "city": null,
      "municipality": "DALAGUETE",
      "province": "CEBU",
      "street": null
    },
    "match_score": 100,
    "matched_fields": ["firstname", "middlename", "lastname", "birthdate"]
  },
  {
    "objid": "IND1e3b04d8:167716cfd95:-279f",
    "entityno": "04321-036736I",
    "name": "AMABA, ISABEL A.",
    "firstname": "ISABEL",
    "middlename": "A.",
    "lastname": "AMABA",
    "birthdate": "1992-05-13",
    "address": {
      "text": "BIASONG\nLANAO, DALAGUETE, \nCEBU",
      "barangay_name": "LANAO",
      "city": null,
      "municipality": "DALAGUETE",
      "province": "CEBU",
      "street": null
    },
    "match_score": 50,
    "matched_fields": ["middlename", "lastname"]
  }
]
```

**Looking up an exact match (entity ID)**

To retrieve the eTracs entity ID for a known individual, pass all four fields and check if the first result has `match_score: 100`. The `objid` of that result is the entity ID.

```bash
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  "http://192.168.11.17:9050/api/entities/duplicate-check?firstname=ARTURO&lastname=AMABA&middlename=A.&birthdate=1975-03-05"
```

If `match_score` of the first result is `100`, use its `objid` as the entity ID.

**Error Response** — No fields provided
```json
{
  "message": "At least one field (firstname, middlename, lastname, birthdate) is required."
}
```
HTTP Status: `422`

---

## Entity Individual Endpoints

### 1. List Entity Individuals

Returns a paginated list of individual entity records.

**Endpoint:** `GET /entity-individuals`

**Query Parameters**

| Parameter | Type   | Required | Description                                      |
|-----------|--------|----------|--------------------------------------------------|
| `search`  | string | No       | Filter by lastname, firstname, or middlename     |
| `page`    | int    | No       | Page number (default: 1)                         |

**Example Requests**
```bash
# List all individuals
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  http://192.168.11.17:9050/api/entity-individuals

# Search individuals
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  "http://192.168.11.17:9050/api/entity-individuals?search=amaba"
```

**Example Response**
```json
{
  "current_page": 1,
  "data": [
    {
      "objid": "IND-10006567:16ab8cb6c90:-7e5b",
      "lastname": "AMABA",
      "firstname": "ARTURO",
      "middlename": "A.",
      "birthdate": "1975-03-05",
      "gender": "M",
      "civilstatus": "MARRIED"
    }
  ],
  "per_page": 20,
  "total": 1
}
```

---

### 2. Get Entity Individual by ID

Returns a single individual with its parent entity details.

**Endpoint:** `GET /entity-individuals/{id}`

**Path Parameters**

| Parameter | Type   | Required | Description         |
|-----------|--------|----------|---------------------|
| `id`      | string | Yes      | Individual `objid`  |

**Example Request**
```bash
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  http://192.168.11.17:9050/api/entity-individuals/IND-10006567:16ab8cb6c90:-7e5b
```

**Example Response**
```json
{
  "objid": "IND-10006567:16ab8cb6c90:-7e5b",
  "lastname": "AMABA",
  "firstname": "ARTURO",
  "middlename": "A.",
  "birthdate": "1975-03-05",
  "birthplace": "LANAO,DALAGUETE,CEBU",
  "gender": "M",
  "civilstatus": "MARRIED",
  "entity": {
    "objid": "IND-10006567:16ab8cb6c90:-7e5b",
    "entityno": "04321-038811I",
    "name": "AMABA, ARTURO A.",
    "address_text": "LANAO, DALAGUETE, \nCEBU",
    "type": "INDIVIDUAL",
    "state": "ACTIVE"
  }
}
```

**Error Response** — Not found
```json
{
  "message": "No query results for model [App\\Models\\EntityIndividual]."
}
```
HTTP Status: `404`

---

## Examples

### Complete Workflow Example

```bash
# Set your API key
API_KEY="etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c"
BASE_URL="http://192.168.11.17:9050/api"

# 1. Search for entities by name
curl -H "X-API-Key: $API_KEY" \
  "$BASE_URL/entities?search=amaba"

# 2. Check for duplicates before creating a new entity
curl -H "X-API-Key: $API_KEY" \
  "$BASE_URL/entities/duplicate-check?firstname=ARTURO&lastname=AMABA&birthdate=1970-05-15"

# 3. Get detailed information about a specific entity
curl -H "X-API-Key: $API_KEY" \
  "$BASE_URL/entities/IND-10006567:16ab8cb6c90:-7e5b"

# 4. Get individual details
curl -H "X-API-Key: $API_KEY" \
  "$BASE_URL/entity-individuals/IND-10006567:16ab8cb6c90:-7e5b"
```

### Using with jq for JSON Processing

```bash
API_KEY="etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c"

# Get total count of entities
curl -s -H "X-API-Key: $API_KEY" \
  "http://192.168.11.17:9050/api/entities" | jq '.total'

# Extract just the names from search results
curl -s -H "X-API-Key: $API_KEY" \
  "http://192.168.11.17:9050/api/entities?search=amaba" | jq '.data[].name'

# Get high-confidence duplicate matches (score >= 80)
curl -s -H "X-API-Key: $API_KEY" \
  "http://192.168.11.17:9050/api/entities/duplicate-check?firstname=ARTURO&lastname=AMABA" | \
  jq '[.[] | select(.match_score >= 80)]'

# Pretty print response
curl -s -H "X-API-Key: $API_KEY" \
  "http://192.168.11.17:9050/api/entities?search=amaba" | jq '.'
```

### Using Bearer Token Authentication

```bash
# Alternative authentication method using Bearer token
TOKEN="etracs_test_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p"

curl -H "Authorization: Bearer $TOKEN" \
  "http://192.168.11.17:9050/api/entities"
```

### Pagination Example

```bash
API_KEY="etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c"

# Get first page
curl -s -H "X-API-Key: $API_KEY" \
  "http://192.168.11.17:9050/api/entities?page=1"

# Get second page
curl -s -H "X-API-Key: $API_KEY" \
  "http://192.168.11.17:9050/api/entities?page=2"

# Get page info
curl -s -H "X-API-Key: $API_KEY" \
  "http://192.168.11.17:9050/api/entities" | \
  jq '{current_page, last_page, total, per_page}'
```

### Error Handling Example

```bash
# Test without API key (should return 401)
curl -v http://192.168.11.17:9050/api/entities

# Test with invalid API key (should return 403)
curl -v -H "X-API-Key: invalid_key" \
  http://192.168.11.17:9050/api/entities

# Test with valid API key (should return 200)
curl -v -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  http://192.168.11.17:9050/api/entities
```

---

## Additional Notes

### Adding New API Keys

To add a new API key:

1. Generate a new key:
```bash
php artisan tinker --execute="echo base64_encode(random_bytes(32));"
```

2. Add to `.env` file:
```env
API_KEYS=key1,key2,new_key
```

3. Restart the application:
```bash
docker-compose -f docker-compose.external-db.yml restart
```

### Rate Limiting

Currently, there are no rate limits implemented. Please use the API responsibly.

### Support

For API support and questions, please contact the eTracs development team.

---

## Changelog

### Version 1.0.0 (2026-03-18)
- Initial API release with authentication
- Entity and entity individual endpoints
- Duplicate check functionality
- Deployed to http://192.168.11.17:9050
