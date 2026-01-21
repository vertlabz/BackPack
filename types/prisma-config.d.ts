declare module 'prisma/config' {
  type DatasourceConfig = {
    url?: string
  }

  type PrismaConfig = {
    schema?: string
    datasource?: DatasourceConfig
  }

  export function defineConfig(config: PrismaConfig): PrismaConfig
  export function env(name: string): string
}
