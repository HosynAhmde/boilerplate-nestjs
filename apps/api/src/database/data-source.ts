import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadDotEnv, validateEnv } from '../config/env.js';
import { buildDataSourceOptions } from './typeorm.options.js';

// Used only by the TypeORM CLI (migration:run, migration:generate, ...).
loadDotEnv();

const AppDataSource = new DataSource(buildDataSourceOptions(validateEnv(process.env)));
export default AppDataSource;
