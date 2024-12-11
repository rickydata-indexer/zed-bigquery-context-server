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

## Usage

- `/bq-schema <table-name>`: Retrieve the schema for the table with the given name.
- `/bq-schema all-tables`: Retrieve the schemas for all tables in the dataset.
- `/bq-schema <dataset>.<table>`: Retrieve the schema for a specific table in a dataset.
