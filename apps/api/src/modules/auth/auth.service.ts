import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenPayload } from './interfaces/token-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { outlet: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        outletId: user.outletId,
        outlet: user.outlet,
      },
      ...tokens,
    };
  }

  /**
   * Public status used by the auth pages to decide whether the first-time
   * setup form should be shown or the "ask an admin" flow instead.
   */
  async getSetupStatus() {
    const userCount = await this.prisma.user.count();
    return {
      setupCompleted: userCount > 0,
      userCount,
    };
  }

  async register(registerDto: RegisterDto) {
    // Public registration is only for initial setup. Additional users must be
    // created by an admin from Settings > Pengguna.
    const userCount = await this.prisma.user.count();
    if (userCount > 0) {
      throw new ForbiddenException(
        'Registrasi publik hanya tersedia untuk setup awal. Hubungi admin untuk membuat akun baru.',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    const outlet = await this.prisma.outlet.create({
      data: {
        name: registerDto.outletName || 'Outlet Utama',
        address: registerDto.outletAddress,
        phone: registerDto.outletPhone,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        name: registerDto.name,
        role: 'ADMIN',
        outletId: outlet.id,
      },
      include: { outlet: true },
    });

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        outletId: user.outletId,
        outlet: user.outlet,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    const storedToken = await this.prisma.user.findFirst({
      where: { refreshToken },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    // Verify token
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (payload.sub !== storedToken.id) {
        throw new UnauthorizedException('Token tidak valid');
      }
    } catch {
      throw new UnauthorizedException('Refresh token kedaluwarsa');
    }

    const tokens = await this.generateTokens(storedToken);
    await this.storeRefreshToken(storedToken.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { outlet: true },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const { passwordHash, refreshToken, ...result } = user;
    return result;
  }

  private async generateTokens(user: any) {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      outletId: user.outletId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }
}