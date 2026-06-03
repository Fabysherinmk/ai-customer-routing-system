import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_12345_crrs';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log(`[Login Attempt] Email: "${email}", Password Length: ${password?.length || 0}`);

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`[Login Fail] User not found: "${email}"`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log(`[Login Debug] User ID: ${user.id}, Role: ${user.role}, Password Match: ${isMatch}`);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Sign JWT
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching user details' });
  }
};
