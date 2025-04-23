const sql = require('mssql');

const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const config = {
    user: process.env.AZURE_SQL_USERNAME,
    password: process.env.AZURE_SQL_PASSWORD,
    server: process.env.AZURE_SQL_SERVER, // You can use 'localhost\\instance' to connect to named instance
    database: process.env.AZURE_SQL_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true', // Use this if you're on Windows Azure
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true'  // Change to true for local dev / self-signed certs
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Connected to the database');
        return pool;
    })
    .catch(err => {
        console.error('Database connection failed:', err);
        throw err;
    });

module.exports = {
    sql, poolPromise
};
