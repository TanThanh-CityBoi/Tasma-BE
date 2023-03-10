import { BadRequestException, Injectable } from '@nestjs/common';
import { UserService } from 'src/users/user.service';
import { GOOGLE_AUTH_URL, transformData } from 'src/utils';
import { JwtService } from '@nestjs/jwt';
import { LoginRes, SignUpRes } from './dto';
import { User } from 'src/users/schemas';
import { isEmpty } from 'lodash';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly config: ConfigService,
  ) {}
  async login(data: any) {
    const { email, password } = data;
    if (!email) throw new BadRequestException('Incorrect email or password');
    const user = await this.userService.getUser({ email });
    if (isEmpty(user)) {
      throw new BadRequestException('Incorrect email or password');
    }
    const isCorrectPassword = bcrypt.compareSync(password, user.password);
    if (isEmpty(user) || !isCorrectPassword) {
      throw new BadRequestException('Incorrect email or password');
    }
    //
    const accessToken = this.jwtService.sign(
      { userId: user._id },
      {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('TOKEN_EXPTIME'),
      },
    );
    return transformData(LoginRes, {
      userInfo: user,
      accessToken,
    });
  }

  async signUp(data: any) {
    const { email, firstName, lastName, gender, password, confirmPassword } =
      data;
    if (password != confirmPassword) {
      throw new BadRequestException(
        'Password and ConfirmPassword does not match',
      );
    }
    //
    const existedUser = await this.userService.getUser({ email });
    if (!isEmpty(existedUser)) {
      throw new BadRequestException('Email have already used');
    }
    //
    const newUser = new User();
    newUser.email = email;
    newUser.firstName = firstName;
    newUser.lastName = lastName;
    newUser.password = bcrypt.hashSync(password, 10);
    newUser.gender = gender;
    const result = await this.userService.createUser(newUser);
    return transformData(SignUpRes, result);
  }

  async loginWithGoogle(data: any) {
    const { googleAccessToken } = data;
    const response = await axios.get(GOOGLE_AUTH_URL, {
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
      },
    });
    const firstName = response.data.given_name;
    const lastName = response.data.family_name;
    const email = response.data.email;

    const existedUser = await this.userService.getUser({ email });
    if (!isEmpty(existedUser)) {
      const accessToken = this.jwtService.sign(
        { userId: existedUser._id },
        {
          secret: this.config.get('JWT_SECRET'),
          expiresIn: this.config.get('TOKEN_EXPTIME'),
        },
      );
      return transformData(LoginRes, { ...existedUser, accessToken });
    }

    const newUser = new User();
    newUser.firstName = firstName;
    newUser.lastName = lastName;
    newUser.email = email;
    const accessToken = this.jwtService.sign(
      { userId: existedUser._id },
      {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('TOKEN_EXPTIME'),
      },
    );
    const createResult = await this.userService.createUser(newUser);
    return transformData(LoginRes, { ...createResult, accessToken });
  }
}
