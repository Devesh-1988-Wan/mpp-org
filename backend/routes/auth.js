// backend/routes/auth.js
const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

// SQL Server connection configuration
const dbConfig = {
  server: process.env.VITE_DB_SERVER,
  database: process.env.VITE_DB_DATABASE,
  user: process.env.VITE_DB_USER,
  password: process.env.VITE_DB_PASSWORD,
  port: parseInt(process.env.VITE_DB_PORT, 10),
  options: {
    encrypt: process.env.VITE_DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
};

// --- Sign-Up Endpoint ---
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

    // Use a transaction to ensure all inserts succeed or fail together
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Insert into users table
      const userResult = await new sql.Request(transaction)
        .input('email', sql.NVarChar, email)
        .input('encrypted_password', sql.NVarChar, hashedPassword)
        .query('INSERT INTO dbo.users (email, encrypted_password) OUTPUT INSERTED.id VALUES (@email, @encrypted_password);');
      
      const userId = userResult.recordset[0].id;

      // Insert into profiles table
      await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, userId)
        .input('username', sql.NVarChar, email.split('@')[0])
        .input('full_name', sql.NVarChar, '') // You can add a full name field to your signup form
        .query('INSERT INTO dbo.profiles (id, username, full_name) VALUES (@id, @username, @full_name);');
      
      await transaction.commit();
      res.status(201).json({ message: 'User created successfully.' });

    } catch (err) {
      await transaction.rollback();
      // Handle unique constraint violation (user already exists)
      if (err.number === 2627 || err.number === 2601) {
        return res.status(409).json({ message: 'User with this email already exists.' });
      }
      throw err; // Re-throw other errors
    }

  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
});


// --- Sign-In Endpoint ---
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT u.id, u.email, u.encrypted_password, p.username, p.full_name, p.avatar_url FROM dbo.users u JOIN dbo.profiles p ON u.id = p.id WHERE u.email = @email');

        if (result.recordset.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = result.recordset[0];
        const isPasswordValid = await bcrypt.compare(password, user.encrypted_password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Create JWT
        const token = jwt.sign(
            { sub: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                full_name: user.full_name,
                avatar_url: user.avatar_url,
            }
        });

    } catch (err) {
        console.error('Signin Error:', err);
        res.status(500).json({ message: 'Server error during signin.' });
    }
});


module.exports = router;