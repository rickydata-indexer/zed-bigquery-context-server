import { BigQuery } from '@google-cloud/bigquery';

const bigquery = new BigQuery();

async function handleCommand(command, argument) {
  if (command === 'bq-schema') {
    const table = argument || 'all-tables';
    try {
      if (table === 'all-tables') {
        const [datasets] = await bigquery.getDatasets();
        let allTables = [];
        for (const dataset of datasets) {
          const [tables] = await dataset.getTables();
          for (const table of tables) {
            const [metadata] = await table.getMetadata();
            allTables.push({
              dataset: dataset.id,
              table: table.id,
              schema: metadata.schema
            });
          }
        }
        return JSON.stringify(allTables, null, 2);
      } else {
        // Handle specific table
        let [dataset, tableName] = table.split('.');
        if (!tableName) {
          // If no dataset specified, search in all datasets
          const [datasets] = await bigquery.getDatasets();
          for (const ds of datasets) {
            const [tables] = await ds.getTables();
            const foundTable = tables.find(t => t.id === table);
            if (foundTable) {
              const [metadata] = await foundTable.getMetadata();
              return JSON.stringify({
                dataset: ds.id,
                table: foundTable.id,
                schema: metadata.schema
              }, null, 2);
            }
          }
          throw new Error(`Table ${table} not found in any dataset`);
        } else {
          // Get specific dataset.table
          const ds = bigquery.dataset(dataset);
          const table = ds.table(tableName);
          const [metadata] = await table.getMetadata();
          return JSON.stringify({
            dataset,
            table: tableName,
            schema: metadata.schema
          }, null, 2);
        }
      }
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }
  return `Unknown command: ${command}`;
}

process.stdin.setEncoding('utf8');
let inputBuffer = '';

process.stdin.on('data', async (chunk) => {
  inputBuffer += chunk;
  const newlineIndex = inputBuffer.indexOf('\n');
  if (newlineIndex !== -1) {
    const line = inputBuffer.slice(0, newlineIndex);
    inputBuffer = inputBuffer.slice(newlineIndex + 1);
    try {
      const { command, argument } = JSON.parse(line);
      const response = await handleCommand(command, argument);
      process.stdout.write(JSON.stringify({ response }) + '\n');
    } catch (error) {
      process.stdout.write(JSON.stringify({ error: error.message }) + '\n');
    }
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});
