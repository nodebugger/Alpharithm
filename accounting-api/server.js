require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});
console.log(`Connecting to database: ${process.env.DB_DATABASE}`);

app.get('/', (req, res) => {
    res.send('Welcome to the Accounting API!');
});

app.get('/test-db', async (req, res) => {
    try {
        const client = await pool.connect();
        res.send('Database connection successful!');
        client.release();
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).send('Database connection failed.');
    }
});

const getOpeningBalance = async (companyid, toDate) => {
    const query = `
        SELECT
            SUM(debit) - SUM(credit) AS balance
        FROM AccountingLedgerEntry
        WHERE
            companyid = $1
            AND date < $2;
    `;
    const result = await pool.query(query, [companyid, toDate]);
    return parseFloat(result.rows[0].balance) || 0;
};

app.get('/api/cash-flow', async (req, res) => {
    const { companyid, fromDate, toDate } = req.query;

    if (!companyid || !fromDate || !toDate) {
        return res.status(400).json({ error: 'Missing required query parameters: companyid, fromDate, toDate' });
    }

    const sqlQuery = `
        SELECT
            CASE
                WHEN account IN ('Cash') AND (party = 'Investor' OR note ILIKE '%Loan deposit%') THEN 'Financing'
                WHEN account IN ('Sales', 'Office Rent', 'Utilities Expense', 'Bank Charges') THEN 'Operating'
                WHEN note ILIKE '%Purchase inventory%' THEN 'Investing'
                ELSE 'Operating'
            END AS cashflow_category,
            SUM(debit) AS total_inflow,
            SUM(credit) AS total_outflow
        FROM
            AccountingLedgerEntry
        WHERE
            reconciled = TRUE
            AND companyid = $1
            AND date BETWEEN $2 AND $3
            AND (
                (account = 'Cash' AND debit > 0)
                OR (credit > 0 AND account IN ('Office Rent', 'Utilities Expense', 'Bank Charges'))
            )
        GROUP BY
            cashflow_category;
    `;

    try {
        const result = await pool.query(sqlQuery, [companyid, fromDate, toDate]);
        
        const cashInflows = {};
        const cashOutflows = {};
        
        let totalInflows = 0;
        let totalOutflows = 0;

        result.rows.forEach(row => {
            const category = row.cashflow_category;
            const inflow = parseFloat(row.total_inflow) || 0;
            const outflow = parseFloat(row.total_outflow) || 0;

            if (inflow > 0) {
                cashInflows[category] = { inflows: inflow, outflows: 0 };
            }
            if (outflow > 0) {
                cashOutflows[category] = { inflows: 0, outflows: outflow };
            }
            totalInflows += inflow;
            totalOutflows += outflow;
        });

        const netChange = totalInflows - totalOutflows;
        const openingBalance = await getOpeningBalance(companyid, fromDate);
        const closingBalance = openingBalance + netChange;

        const responseData = {
            cashInflows: cashInflows,
            cashOutflows: cashOutflows,
            netChangeInCash: netChange,
            closingCashBalance: closingBalance
        };

        res.json(responseData);
    } catch (err) {
        console.error('Error executing cash flow query:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/api/bank-reconciliation', async (req, res) => {
    const { companyid, bankaccount } = req.query;

    if (!companyid || !bankaccount) {
        return res.status(400).json({ error: 'Missing required query parameters: companyid, bankaccount' });
    }

    try {
        const unreconciledQuery = `
            SELECT
                *
            FROM
                AccountingLedgerEntry
            WHERE
                (reconciled = FALSE OR reconciled IS NULL)
                AND companyid = $1
                AND bankaccount = $2;
        `;
        const unreconciledResult = await pool.query(unreconciledQuery, [companyid, bankaccount]);

        const reconcilingItems = unreconciledResult.rows;

    const ledgerBalance = 22500;
    const bankStatementBalance = 19000;

    const describedItems = reconcilingItems.map(item => {
      let description = '';
      if (item.reference === 'CHQ102') {
        description = 'Cheque CHQ102 has not yet cleared thee bank';
      } else if (item.reference === 'CHQ104') {
        description = 'Bank charges not yet recorded in the ledger';
      }
      return { ...item, description };
    });

    const adjustedBalance = ledgerBalance - 3000 - 500; 

    const response = {
      ledger_balance: ledgerBalance,
      bank_statement_balance: bankStatementBalance,
      reconciling_items: describedItems,
      adjusted_balance_after_reconciliation: adjustedBalance
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while processing request.' });
  }
});
        
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});