import sql from 'mssql';

const config = {
  server: import.meta.env.VITE_DB_SERVER,
  database: import.meta.env.VITE_DB_DATABASE,
  user: import.meta.env.VITE_DB_USER,
  password: import.meta.env.VITE_DB_PASSWORD,
  port: parseInt(import.meta.env.VITE_DB_PORT || '1433', 10),
  options: {
    encrypt: import.meta.env.VITE_DB_ENCRYPT === 'true',
    trustServerCertificate: true, // For local dev; set to false in production with a valid cert
  },
  connectionTimeout: 15000, // Add a connection timeout
};

let pool: sql.ConnectionPool | null = null;

const ensurePool = async () => {
  if (pool && pool.connected) {
    return pool;
  }
  try {
    console.log('Attempting to connect to SQL Server...');
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('Connected to SQL Server successfully.');
    
    pool.on('error', err => {
        console.error('SQL Pool Error:', err);
        pool = null; // Reset pool on error
    });

    return pool;
  } catch (err) {
    console.error('Database connection failed:', err);
    pool = null; // Ensure we don't reuse a failed pool
    // Re-throw the error so the calling service knows the connection failed
    throw new Error('Failed to connect to the database.');
  }
};

export const getRequest = async () => {
  const connectionPool = await ensurePool();
  if (!connectionPool) {
      throw new Error('Database connection is not available.');
  }
  return connectionPool.request();
};

export const db = sql;