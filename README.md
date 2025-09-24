# Accounting API

## Project Overview
This project provides a simple accounting API with two main functionalities:

- **Cash Flow Statement API**: Generates a summary of cash inflows and outflows for a given period.  
- **Bank Reconciliation Statement API**: Reconciles the company's ledger balance with the bank statement balance, identifying and accounting for unreconciled items.  

The API is built using **Node.js (Express.js)** and a **PostgreSQL database**.  
NOTE: Please set up the environment variables and database before proceeding to endpoint testing.

---

## API Endpoints
The API documentation is available via **Postman**.  
You can import the provided collection to test the endpoints:

- [Postman Documentation](https://documenter.getpostman.com/view/45896640/2sB3QCRtHU)

---

### Task 1: Cash Flow Statement
**Endpoint:**  
```http
GET /api/cash-flow
```
- example query: http://localhost:3000/api/cash-flow?companyid=1&fromDate=2025-01-01&toDate=2025-01-31

Query Parameters:
- companyid: 1 (required)
- fromDate: 2025-01-01 (required)
- toDate: 2025-01-31 (required)


### Task 2: Bank Reconciliation Statement
**Endpoint:**
```http 
GET /api/bank-reconciliation
```
- example query: http://localhost:3000/api/bank-reconciliation?companyid=1&bankaccount=MainBank

Query Parameters:
- companyid: 1 (required)
- bankaccount: MainBank (required)

---

- accounting-api/server.js # All API code lives here
- task-deliverables/ # contains screenshots of tests on browser (in pretty-print format)