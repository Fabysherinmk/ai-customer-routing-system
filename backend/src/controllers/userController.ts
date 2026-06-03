import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/client';

/**
 * Create a new user (Admins only)
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const validRoles = ['ADMIN', 'AGENT'];
    if (!validRoles.includes(role.toUpperCase())) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // 2. Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email address already exists.' });
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role.toUpperCase()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    return res.status(201).json(newUser);

  } catch (err: any) {
    console.error('Create user error:', err);
    return res.status(500).json({ error: 'Server error creating user' });
  }
};

/**
 * List all users/agents for assignment dropdown selection (Admins and Agents)
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: 'asc' }
    });

    return res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ error: 'Server error listing users' });
  }
};
