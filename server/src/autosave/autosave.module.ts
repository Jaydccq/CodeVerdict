import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutosaveService } from './autosave.service';
import { AutosaveController } from './autosave.controller';
import { AutoSave } from '../entities/auto-save.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AutoSave])],
  controllers: [AutosaveController],
  providers: [AutosaveService],
  exports: [AutosaveService],
})
export class AutosaveModule {}
