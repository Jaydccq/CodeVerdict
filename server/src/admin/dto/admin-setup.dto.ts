import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class AdminSetupDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  setupKey: string;
}
