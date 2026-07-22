import { IsIn } from 'class-validator';
import type { ConversionStatusT } from '../partner-portal.service';

const STATUSES: ConversionStatusT[] = ['NO_ANSWER', 'ON_BOARDING', 'CONVERTED', 'NOT_INTERESTED'];

export class UpdateConversionDto {
  @IsIn(STATUSES)
  status!: ConversionStatusT;
}
