import sql from 'mssql';

const config = {
  server: import.meta.env.VITE_DB_SERVER,
  database: import.meta.env.VITE_DB_DATABASE,
  user: import.meta.env.VITE_DB_USER,
  password: import.meta.env.VITE_DB_PASSWORD,
  port: parseInt(import.meta.env.VITE_DB_PORT || '1433', 10),
  options: {
    encrypt: import.meta.env.VITE_DB_ENCRYPT === 'true',
    trustServerCertificate: true, // Change to false in production with a valid certificate
  },
};

let pool: sql.ConnectionPool;

export const connectToSql = async () => {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('Connected to SQL Server');
    } catch (err) {
      console.error('Database connection failed:', err);
      // Handle connection error appropriately
    }
  }
  return pool.request();
};

export const db = sql;