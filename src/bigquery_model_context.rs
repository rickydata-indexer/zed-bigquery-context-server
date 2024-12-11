use serde::Deserialize;
use std::env;
use zed::settings::ContextServerSettings;
use zed_extension_api::{self as zed, serde_json, Command, ContextServerId, Project, Result};

const PACKAGE_NAME: &str = "@rickydata/bigquery-context-server";
const PACKAGE_VERSION: &str = "0.1.1";
const SERVER_PATH: &str = "node_modules/@rickydata/bigquery-context-server/index.mjs";

struct BigQueryModelContextExtension;

#[derive(Debug, Deserialize)]
struct BigQueryContextServerSettings {
    project_id: String,
    credentials_json: String,
}

impl zed::Extension for BigQueryModelContextExtension {
    fn new() -> Self {
        Self
    }

    fn context_server_command(
        &mut self,
        _context_server_id: &ContextServerId,
        project: &Project,
    ) -> Result<Command> {
        let version = zed::npm_package_installed_version(PACKAGE_NAME)?;
        if version.as_deref() != Some(PACKAGE_VERSION) {
            zed::npm_install_package(PACKAGE_NAME, PACKAGE_VERSION)?;
        }

        let settings = ContextServerSettings::for_project("bigquery-context-server", project)?;
        let Some(settings) = settings.settings else {
            return Err(
                "missing BigQuery settings (project_id and credentials_json required)".into(),
            );
        };
        let settings: BigQueryContextServerSettings =
            serde_json::from_value(settings).map_err(|e| e.to_string())?;

        Ok(Command {
            command: "node".to_string(),
            args: vec![
                env::current_dir()
                    .unwrap()
                    .join(SERVER_PATH)
                    .to_string_lossy()
                    .to_string(),
            ],
            env: vec![
                ("GOOGLE_CLOUD_PROJECT".into(), settings.project_id),
                (
                    "GOOGLE_APPLICATION_CREDENTIALS".into(),
                    settings.credentials_json,
                ),
            ],
        })
    }
}

zed::register_extension!(BigQueryModelContextExtension);
