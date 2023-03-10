import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/middlewares';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  @Get('/profile')
  async getProfile(@Request() req) {
    return req.user;
  }
}
