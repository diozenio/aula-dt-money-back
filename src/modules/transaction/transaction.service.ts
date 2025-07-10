import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { PaginationDto } from './dto/pagination.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}
  async create({ category, data, price, title, type }: CreateTransactionDto) {
    const createdTransaction = await this.prisma.transaction.create({
      data: {
        title,
        category,
        data,
        price,
        type,
      },
    });
    return createdTransaction;
  }

  async findAll({ page = 1, limit = 10 }: PaginationDto) {
    const skip = (page - 1) * limit;
    const take = limit;

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        skip,
        take,
        orderBy: { data: 'desc' },
      }),
      this.prisma.transaction.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: transactions,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto) {
    await this.findOne(id);
    return this.prisma.transaction.update({
      where: { id },
      data: updateTransactionDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.transaction.delete({
      where: { id },
    });
  }

  async getSummary() {
    const summary = await this.prisma.transaction.groupBy({
      by: ['type'],
      _sum: {
        price: true,
      },
    });

    const income =
      summary.find((item) => item.type === TransactionType.INCOME)?._sum
        .price || 0;
    const outcome =
      summary.find((item) => item.type === TransactionType.OUTCOME)?._sum
        .price || 0;
    const total = income - outcome;

    return {
      income,
      outcome,
      total,
    };
  }
}
