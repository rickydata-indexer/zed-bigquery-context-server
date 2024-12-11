#!/usr/bin/env node

import { BigQuery } from '@google-cloud/bigquery';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
  CompleteRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server({
  name: "bigquery-context-server",
  version: "0.1.1",
});

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!projectId || !credentialsPath) {
  console.error("Please provide GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS environment variables");
  process.exit(1);
}

process.stderr.write(`Starting server. Project: ${projectId}\n`);
const bigquery = new BigQuery();

const SCHEMA_PATH = "schema";
const SCHEMA_PROMPT_NAME = "bq-schema";
const ALL_TABLES = "all-tables";

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    const [datasets] = await bigquery.getDatasets();
    let resources = [];
    
    for (const dataset of datasets) {
      const [tables] = await dataset.getTables();
      for (const table of tables) {
        resources.push({
          uri: `bigquery://${projectId}/${dataset.id}/${table.id}/${SCHEMA_PATH}`,
          mimeType: "application/json",
          name: `"${dataset.id}.${table.id}" table schema`,
        });
      }
    }
    
    return { resources };
  } catch (error) {
    console.error("Error listing resources:", error);
    throw error;
  }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const matches = uri.match(/bigquery:\/\/([^\/]+)\/([^\/]+)\/([^\/]+)\/schema/);
  if (!matches) {
    throw new Error("Invalid resource URI");
  }

  const [, projectId, datasetId, tableId] = matches;
  
  try {
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);
    const [metadata] = await table.getMetadata();
    
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(metadata.schema, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error reading resource:", error);
    throw error;
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "bq-schema",
        description: "Returns the schema for a BigQuery table.",
        inputSchema: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["all", "specific"],
              description: "Mode of schema retrieval",
            },
            table: {
              type: "string",
              description: "Table name (required if mode is 'specific'). Format: [dataset.]table",
            },
          },
          required: ["mode"],
          if: {
            properties: { mode: { const: "specific" } },
          },
          then: {
            required: ["table"],
          },
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "bq-schema") {
    const table = request.params.arguments?.table;
    
    if (typeof table !== "string" || table.length === 0) {
      throw new Error(`Invalid table: ${table}`);
    }

    try {
      const schema = await getSchema(table);
      return {
        content: [{ type: "text", text: schema }],
      };
    } catch (error) {
      console.error("Error calling tool:", error);
      throw error;
    }
  }

  throw new Error("Tool not found");
});

server.setRequestHandler(CompleteRequestSchema, async (request) => {
  process.stderr.write("Handling completions/complete request\n");

  if (request.params.ref.name === SCHEMA_PROMPT_NAME) {
    const tableQuery = request.params.argument.value;
    const alreadyHasArg = /\S*\s/.test(tableQuery);

    if (alreadyHasArg) {
      return {
        completion: {
          values: [],
        },
      };
    }

    try {
      const [datasets] = await bigquery.getDatasets();
      let tables = [ALL_TABLES];
      
      for (const dataset of datasets) {
        const [datasetTables] = await dataset.getTables();
        tables.push(...datasetTables.map(table => `${dataset.id}.${table.id}`));
      }
      
      return {
        completion: {
          values: tables,
        },
      };
    } catch (error) {
      console.error("Error completing:", error);
      throw error;
    }
  }

  throw new Error("unknown prompt");
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  process.stderr.write("Handling prompts/list request\n");

  return {
    prompts: [
      {
        name: SCHEMA_PROMPT_NAME,
        description: "Retrieve the schema for a given table in BigQuery",
        arguments: [
          {
            name: "table",
            description: "the table to describe (format: [dataset.]table)",
            required: true,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  process.stderr.write("Handling prompts/get request\n");

  if (request.params.name === SCHEMA_PROMPT_NAME) {
    const table = request.params.arguments?.table;

    if (typeof table !== "string" || table.length === 0) {
      throw new Error(`Invalid table: ${table}`);
    }

    try {
      const schema = await getSchema(table);
      return {
        description: table === ALL_TABLES ? "all table schemas" : `${table} schema`,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: schema,
            },
          },
        ],
      };
    } catch (error) {
      console.error("Error getting prompt:", error);
      throw error;
    }
  }

  throw new Error(`Prompt '${request.params.name}' not implemented`);
});

async function getSchema(tableOrAll) {
  if (tableOrAll === ALL_TABLES) {
    const [datasets] = await bigquery.getDatasets();
    let allSchemas = [];
    
    for (const dataset of datasets) {
      const [tables] = await dataset.getTables();
      for (const table of tables) {
        const [metadata] = await table.getMetadata();
        allSchemas.push({
          dataset: dataset.id,
          table: table.id,
          schema: metadata.schema
        });
      }
    }
    
    return JSON.stringify(allSchemas, null, 2);
  } else {
    let [dataset, table] = tableOrAll.split('.');
    if (!table) {
      table = dataset;
      // Search in all datasets
      const [datasets] = await bigquery.getDatasets();
      for (const ds of datasets) {
        const [tables] = await ds.getTables();
        const foundTable = tables.find(t => t.id === table);
        if (foundTable) {
          dataset = ds.id;
          break;
        }
      }
    }
    
    const ds = bigquery.dataset(dataset);
    const tbl = ds.table(table);
    const [metadata] = await tbl.getMetadata();
    
    return JSON.stringify({
      dataset,
      table,
      schema: metadata.schema
    }, null, 2);
  }
}

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
