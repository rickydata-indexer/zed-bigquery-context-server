# @zeddotdev/bigquery-context-server

A Node.js server that provides BigQuery schema information for the Zed IDE BigQuery extension.

## Installation

```bash
npm install @zeddotdev/bigquery-context-server
```

## Configuration

This package requires Google Cloud credentials to be configured. You can set this up by:

1. Creating a service account in your Google Cloud project
2. Downloading the service account key JSON file
3. Setting the path to this file in your Zed settings as `credentials_json`
4. Setting your Google Cloud project ID in your Zed settings as `project_id`

Example Zed settings:

```json
{
  "context_servers": {
    "bigquery-context-server": {
      "settings": {
        "project_id": "your-google-cloud-project-id",
        "credentials_json": "/path/to/your/credentials.json"
      }
    }
  }
}
```

## Commands

The server handles the following commands:

- `/bq-schema <table>`: Get schema for a specific table
- `/bq-schema <dataset>.<table>`: Get schema for a specific table in a dataset
- `/bq-schema all-tables`: Get schemas for all tables in all datasets
