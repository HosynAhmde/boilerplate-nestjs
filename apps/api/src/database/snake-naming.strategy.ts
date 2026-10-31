import { DefaultNamingStrategy, type NamingStrategyInterface, type Table } from 'typeorm';

export function snakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Maps camelCase entity properties to snake_case tables and columns, so
 * `createdAt` becomes `created_at` and `RoleSectionPermission` becomes
 * `role_section_permission`.
 */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  override tableName(className: string, customName: string | undefined): string {
    return customName ?? snakeCase(className);
  }

  override columnName(
    propertyName: string,
    customName: string,
    embeddedPrefixes: string[],
  ): string {
    const prefix = embeddedPrefixes.length ? `${snakeCase(embeddedPrefixes.join('_'))}_` : '';
    return prefix + (customName ? customName : snakeCase(propertyName));
  }

  override relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  override joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  override joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
  ): string {
    return snakeCase(
      `${firstTableName}_${firstPropertyName.replace(/\./g, '_')}_${secondTableName}`,
    );
  }

  // Readable constraint names (pk_role, fk_app_user_role_id, ...) instead of
  // TypeORM's hashed ones. Postgres truncates identifiers at 63 bytes.
  override primaryKeyName(tableOrName: Table | string): string {
    return `pk_${this.bareTable(tableOrName)}`;
  }

  override foreignKeyName(tableOrName: Table | string, columnNames: string[]): string {
    return `fk_${this.bareTable(tableOrName)}_${columnNames.join('_')}`.slice(0, 63);
  }

  override uniqueConstraintName(tableOrName: Table | string, columnNames: string[]): string {
    return `uq_${this.bareTable(tableOrName)}_${columnNames.join('_')}`.slice(0, 63);
  }

  override indexName(tableOrName: Table | string, columnNames: string[]): string {
    return `idx_${this.bareTable(tableOrName)}_${columnNames.join('_')}`.slice(0, 63);
  }

  private bareTable(tableOrName: Table | string): string {
    const name = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;
    return name.split('.').pop()!;
  }

  override joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return snakeCase(`${tableName}_${columnName ?? propertyName}`);
  }
}
