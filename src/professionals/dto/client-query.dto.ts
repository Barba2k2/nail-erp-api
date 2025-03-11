import { IsIn, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ClientQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: 'A página deve ser um número positivo' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: 'O limite deve ser um número positivo' })
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'O termo de busca deve ser uma string' })
  search?: string;

  @IsOptional()
  @IsIn(['name', 'email', 'createdAt'], {
    message: 'O campo de ordenação deve ser "name", "email" ou "createdAt"',
  })
  sortBy?: string = 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'A ordem deve ser "asc" ou "desc"' })
  order?: 'asc' | 'desc' = 'asc';
}
