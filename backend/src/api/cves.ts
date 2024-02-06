import {
  IsInt,
  IsPositive,
  IsString,
  ValidateNested,
  IsOptional,
  IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';
import { Cve, connectToDatabase } from '../models';
import { validateBody, wrapHandler, NotFound } from './helpers';

class CveFilters {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsOptional()
  @IsString()
  cve_name?: string;

  @IsOptional()
  @IsString()
  vuln_status?: string;
}

class CveSearch {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsOptional()
  @IsString()
  cve_name?: string;

  @IsOptional()
  @IsString()
  vuln_status?: string;

  @Type(() => CveFilters)
  @ValidateNested()
  @IsOptional()
  filters?: CveFilters;

  @IsInt()
  @IsPositive()
  @IsOptional()
  pageSize?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  page?: number;

  async getResults(event): Promise<[Cve[], number]> {
    const filters = this.filters || new CveFilters();
    const query = Cve.createQueryBuilder('cve');

    if (filters.cve_name) {
      query.andWhere('cve.cve_name = :cve_name', {
        cve_name: filters.cve_name
      });
    }
    if (filters.vuln_status) {
      query.andWhere('cve.vuln_status = :vuln_status', {
        vuln_status: filters.vuln_status
      });
    }

    // Apply pagination to the query
    const pageSize = this.pageSize || 25;
    const skip = ((this.page || 1) - 1) * pageSize;
    query.skip(skip).take(pageSize);

    // Execute the query
    const [result, count] = await query.getManyAndCount();

    return [result, count];
  }
}

/**
 * @swagger
 *
 * /cves/{cve_uid}:
 *  get:
 *    description: Retrieve a single CVE record by its ID.
 *    tags:
 *    - CVE
 *    parameters:
 *    - name: cve_uid
 *      in: path
 *      required: true
 *      schema:
 *        type: string
 */
export const get = wrapHandler(async (event) => {
  await connectToDatabase();
  const cve_uid = event.pathParameters?.cve_uid;
  console.log('cve_uid:', cve_uid);

  const cve = await Cve.findOne({ where: { cve_uid: cve_uid } });
  console.log('Cve.findOne result:', cve);

  if (!cve) {
    return {
      statusCode: 404,
      body: JSON.stringify(Error)
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(cve)
  };
});

//TODO: Remove getByName endpoint once the vulnerability and cve tables are related
/**
 * @swagger
 *
 * /cves/name/{cve_name}:
 *  get:
 *    description: Retrieve a single CVE record by its name.
 *    tags:
 *    - CVE
 *    parameters:
 *    - name: cve_name
 *      in: path
 *      required: true
 *      schema:
 *        type: string
 */
export const getByName = wrapHandler(async (event) => {
  await connectToDatabase();
  const cve_name = event.pathParameters?.cve_name;
  console.log('cve_name:', cve_name);

  const cve = await Cve.findOne({ where: { cve_name } });
  console.log('Cve.findOne result:', cve);

  if (!cve) {
    return {
      statusCode: 404,
      body: JSON.stringify(Error)
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(cve)
  };
});
