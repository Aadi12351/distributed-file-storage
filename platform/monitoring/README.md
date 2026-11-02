# Drive Monitoring — Prometheus and Grafana

This setup monitors the Drive project EC2 server’s CPU and RAM usage using Prometheus, Node Exporter, and Grafana. Grafana sends email notifications when RAM usage remains above 85% for five minutes.

Monitoring runs on a separate EC2 instance to reduce memory pressure on the application server.

## Architecture

| Server | Components |
|---|---|
| Project EC2 — `172.31.5.5` | Jenkins, build agent, Docker, Kind, Argo CD, Drive application, Node Exporter |
| Monitoring EC2 — `172.31.5.78` | Prometheus and Grafana through Docker Compose |

Node Exporter exposes host metrics on the project server. Prometheus collects them over the VPC’s private network every 60 seconds. Grafana queries Prometheus to display dashboards and evaluate alerts.

## Files

| File | Purpose |
|---|---|
| `compose.yaml` | Runs Prometheus and Grafana |
| `prometheus.yml` | Defines scrape targets and intervals |
| `.env.example` | Documents required environment variables |
| `grafana/provisioning/datasources/prometheus.yaml` | Automatically configures the Grafana data source |
| `grafana/drive-server-monitoring.json` | Exported CPU and RAM dashboard |
| `grafana/alert-rules.yaml` | Exported high RAM alert rule |

The dashboard and alert exports are restoration files. They are not automatically loaded by the current Compose configuration.

## Prerequisites

- Two EC2 instances with private network connectivity.
- Docker Engine and Docker Compose on the monitoring server.
- Node Exporter running on the project server.
- A Gmail account with an app password for SMTP notifications.

Update the private IP in `prometheus.yml` when using a different project server.

## Network Access

| Destination | Port | Allowed source |
|---|---|---|
| Project server Node Exporter | TCP 9100 | Monitoring EC2 security group |
| Monitoring server Grafana | TCP 3000 | Your administrator IP |
| Gmail SMTP | TCP 587 outbound | Monitoring server |

Prometheus port 9090 is bound to `127.0.0.1` on the monitoring server.

## Install Node Exporter

Run on the **project EC2**:

```bash
sudo apt-get update
sudo apt-get install -y prometheus-node-exporter
sudo systemctl enable --now prometheus-node-exporter
sudo systemctl is-active prometheus-node-exporter
```

Verify locally:

```bash
curl -fsS --max-time 10 http://127.0.0.1:9100/metrics \
  -o /tmp/node-metrics.txt

head -n 5 /tmp/node-metrics.txt
```

## Start Monitoring

Run on the **monitoring EC2**, from this directory:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Set these values privately:

```dotenv
GRAFANA_ADMIN_PASSWORD=your-strong-grafana-password
GRAFANA_SMTP_USER=your-gmail-address
GRAFANA_SMTP_PASSWORD=your-google-app-password
```

Use the Gmail account that created the app password.

Validate and start:

```bash
sudo docker compose config --quiet
sudo docker compose up -d
sudo docker compose ps
```

Check service health:

```bash
curl -fsS --max-time 10 http://127.0.0.1:9090/-/ready
curl -fsS --max-time 10 http://127.0.0.1:3000/api/health
```

Open Grafana at:

```text
http://<MONITORING_EC2_PUBLIC_IP>:3000
```

Sign in as `admin` using the configured Grafana password.

## Restore the Dashboard

1. Open Grafana’s dashboard import screen.
2. Upload `grafana/drive-server-monitoring.json`.
3. Select the provisioned Prometheus data source if prompted.
4. Save the dashboard as **Drive Server Monitoring**.

The dashboard contains CPU and RAM usage panels and refreshes every minute. Use a Grafana version compatible with the exported dashboard format.

## Restore Email Alerts

1. Create an Email contact point named **Aaditya**.
2. Enter your recipient address.
3. Send a test notification and confirm email delivery.
4. Save the contact point.

The exported rule references this contact point by name.

For file-based alert provisioning, copy the rule into the provisioning directory:

```bash
mkdir -p grafana/provisioning/alerting

cp grafana/alert-rules.yaml \
  grafana/provisioning/alerting/drive-alerts.yaml

sudo docker compose restart grafana
```

Use this restoration method on a fresh setup. If the rule already exists, keep managing the existing rule in the UI rather than provisioning another copy.

File-provisioned rules are managed through their YAML configuration.

### High RAM Rule

| Setting | Value |
|---|---|
| Rule | Drive Server High RAM |
| Threshold | RAM usage above 85% |
| Evaluation interval | 1 minute |
| Pending period | 5 minutes |
| Contact point | Aaditya |

The threshold belongs in **IS ABOVE**, not the query’s **Min step** field.

## Verification

In Grafana Explore, run:

```promql
up{job="drive-server"}
```

- `1`: Prometheus successfully scraped Node Exporter.
- `0`: The scrape failed.

This checks exporter connectivity, not application availability.

To test the RAM rule without stressing the server, temporarily lower its threshold below current RAM usage. Confirm the alert and email, then restore **85%** and **5 minutes**.

## Persistence and Retention

Docker named volumes preserve Grafana settings and Prometheus data across container recreation.

Prometheus is configured with 24-hour time retention and a 2 GB size retention limit.

Do not run `docker compose down -v` unless you intend to remove the monitoring data volumes.

The Git repository stores configuration and exports; it does not back up the live databases.

## Troubleshooting

```bash
sudo docker compose ps
sudo docker compose logs --tail=100 grafana
sudo docker compose logs --tail=100 prometheus
```

After editing `prometheus.yml`:

```bash
sudo docker compose exec prometheus \
  promtool check config /etc/prometheus/prometheus.yml

sudo docker compose restart prometheus
```

After changing SMTP environment settings:

```bash
sudo docker compose up -d --no-deps --force-recreate grafana
```

## Scope and Limitations

This setup provides host CPU/RAM monitoring and a high RAM email alert.

Kubernetes Pod readiness, container restarts, website availability, and application-level metrics are not yet monitored.

The project uses a single Kind node and is a learning environment, not a highly available production deployment.

## Secrets

Never commit `.env`, Google app passwords, Grafana passwords, tokens, or private keys.

Only `.env.example` with placeholder values belongs in Git.
