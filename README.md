# Zed BigQuery Context Server

This extension provides a Model Context Server for Google BigQuery, for use with the Zed AI assistant.

It adds a `/bq-schema` slash command to the Assistant Panel.

## Configuration

To use the extension, you will need to configure your Google Cloud Project and credentials in your Zed `settings.json`:

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

The `credentials_json` should point to a service account key file with permissions to access BigQuery. You can create a service account and download its key file from the [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts).

## Development

1. Publish the npm package:
```bash
cd npm
npm publish --access public
```

2. Build the Rust extension:
```bash
cargo build --release
```

## Usage

After installing and configuring the extension:

- `/bq-schema <table-name>`: Retrieve the schema for the table with the given name
- `/bq-schema <dataset>.<table>`: Retrieve the schema for a specific table in a dataset
- `/bq-schema all-tables`: Retrieve the schemas for all tables in all datasets

## Package Information

- NPM Package: [@rickydata/bigquery-context-server](https://www.npmjs.com/package/@rickydata/bigquery-context-server)
- Repository: [zed-bigquery-context-server](https://github.com/rickydata-indexer/zed-bigquery-context-server)
