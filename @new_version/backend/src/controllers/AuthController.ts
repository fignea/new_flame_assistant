import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { database } from '../config/database';
import { generateToken } from '../middleware/auth';
import { LoginRequest, RegisterRequest, User, ApiResponse } from '../types';

export class AuthController {
  public async login(req: Request<{}, ApiResponse, LoginRequest>, res: Response<ApiResponse>) {
    try {
      const { email, password } = req.body;

      // Validar datos de entrada
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
      }

      // Buscar usuario
      const user = await database.get(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      ) as User;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Generar token
      const token = generateToken(user);

      // Respuesta exitosa (sin incluir la contraseña)
      const { password: _, ...userWithoutPassword } = user;
      
      return res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          accessToken: token,
          refreshToken: token // Por ahora usamos el mismo token
        },
        message: 'Inicio de sesión exitoso'
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  public async register(req: Request<{}, ApiResponse, RegisterRequest>, res: Response<ApiResponse>) {
    try {
      const { email, password, name } = req.body;

      // Validar datos de entrada
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Email, contraseña y nombre son requeridos'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      // Verificar si el usuario ya existe
      const existingUser = await database.get(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El usuario ya existe'
        });
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear usuario
      const result = await database.query(
        'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id',
        [email.toLowerCase(), hashedPassword, name]
      );

      // Obtener el usuario creado
      const newUser = await database.get(
        'SELECT id, email, name, created_at FROM users WHERE id = $1',
        [result.rows[0].id]
      ) as User;

      // Generar token
      const token = generateToken(newUser);

      return res.status(201).json({
        success: true,
        data: {
          user: newUser,
          accessToken: token,
          refreshToken: token // Por ahora usamos el mismo token
        },
        message: 'Usuario registrado exitosamente'
      });

    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  public async getProfile(req: Request, res: Response<ApiResponse>) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const user = await database.get(
        'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      ) as User;

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      return res.json({
        success: true,
        data: { user },
        message: 'Perfil obtenido exitosamente'
      });

    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  public async updateProfile(req: Request, res: Response<ApiResponse>) {
    try {
      const userId = (req as any).user?.id;
      const { name, currentPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Obtener usuario actual
      const user = await database.get(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      ) as User;

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Actualizar nombre si se proporciona
      if (name && name !== user.name) {
        await database.run(
          'UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [name, userId]
        );
      }

      // Actualizar contraseña si se proporciona
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: 'Contraseña actual requerida para cambiar la contraseña'
          });
        }

        const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
        
        if (!isValidCurrentPassword) {
          return res.status(400).json({
            success: false,
            message: 'Contraseña actual incorrecta'
          });
        }

        if (newPassword.length < 6) {
          return res.status(400).json({
            success: false,
            message: 'La nueva contraseña debe tener al menos 6 caracteres'
          });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        await database.run(
          'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [hashedNewPassword, userId]
        );
      }

      // Obtener usuario actualizado
      const updatedUser = await database.get(
        'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      ) as User;

      return res.json({
        success: true,
        data: { user: updatedUser },
        message: 'Perfil actualizado exitosamente'
      });

    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

export const authController = new AuthController();
