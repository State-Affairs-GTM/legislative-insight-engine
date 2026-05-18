# Setting up live BigQuery extraction

To run `npm run extract` and pull live data from `state_affairs_prod`, you need a Google Cloud service account key with BigQuery read access. This is a one-time setup; once done you can run extraction whenever the data changes.

## Step 1 — Create the service account

1. Open [GCP IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=pendo-test-456821)

2. Confirm at the top that you're in the **`pendo-test-456821`** project (not `pendo-prod` or anything else). If you're in a different project, click the project picker in the header and switch.

3. Click **+ CREATE SERVICE ACCOUNT** at the top.

4. **Service account details**:
   - Name: `legislative-insight-engine-reader`
   - ID: auto-fills as `legislative-insight-engine-reader` — leave it
   - Description: `Read-only BQ access for the Legislative Insight Engine extraction pipeline`
   - Click **CREATE AND CONTINUE**

5. **Grant access** (this is the permissions step):
   - Click **+ ADD ANOTHER ROLE** and pick **BigQuery Data Viewer**
   - Click **+ ADD ANOTHER ROLE** again and pick **BigQuery Job User**
   - (Why both: Data Viewer lets it read tables, Job User lets it actually run queries)
   - Click **CONTINUE**

6. **Principals with access** — leave blank, click **DONE**.

## Step 2 — Generate the JSON key

1. You should now see `legislative-insight-engine-reader@pendo-test-456821.iam.gserviceaccount.com` in the service accounts list. Click it.

2. Click the **KEYS** tab at the top.

3. Click **ADD KEY → Create new key**.

4. Choose **JSON**, click **CREATE**.

5. A file downloads — something like `pendo-test-456821-abc123.json`.

## Step 3 — Place the key in the repo

```bash
cd ~/Desktop/"Legislative Insight Engine"/repo

# Move the downloaded key into the repo and rename it
mv ~/Downloads/pendo-test-456821-*.json ./gcp-key.json

# Sanity check it landed and is gitignored
ls -la gcp-key.json
cat .gitignore | grep gcp-key
# Should show: gcp-key.json
```

The `.gitignore` already lists `gcp-key.json` so it won't be committed. **Verify this** — if you accidentally commit it, GitHub will detect the secret and notify Google, and the key gets auto-revoked. Annoying but recoverable.

## Step 4 — Run the extraction

```bash
cd ~/Desktop/"Legislative Insight Engine"/repo

export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/gcp-key.json"

npm run extract
```

Expected output, roughly:

```
▶ Extracting GA — session matching "2025-2026 Regular Session"
  ✓ State GA (state_id=10), 1 session(s) matched
  ✓ src/data/states/ga/summary.json
▶ Extracting bills detail (topics, budget, consent calendar)...
  ✓ src/data/states/ga/bills_summary.json
✓ Extraction complete
```

If it succeeds, the two JSON files in `src/data/states/ga/` now contain live numbers from BigQuery. The seed values are overwritten.

## Step 5 — Commit and deploy

```bash
git add src/data/states/ga/
git commit -m "Live BigQuery extraction for GA"
git push
```

Vercel auto-deploys the new data within ~30 seconds. The live URL updates.

## Troubleshooting

### "Could not load the default credentials"
The env var didn't take. Run `echo $GOOGLE_APPLICATION_CREDENTIALS` and confirm it shows the full path to the key. If it doesn't, re-run the `export` command from Step 4.

### "Permission denied" / "403 Forbidden"
The service account doesn't have BQ access. Go back to Step 1.5 and check both roles (Data Viewer + Job User) are attached.

### "Dataset state_affairs_prod was not found"
The key might be for a different project. Open the downloaded JSON and check the `project_id` field — must be `pendo-test-456821`.

### Query timeouts or quota issues
The extraction queries each take 5-30 seconds. If something hangs >2 min, paste the output and we'll narrow it down.

### Anything else
Paste the full terminal output and I'll diagnose.

## Keeping the data fresh

To refresh data later:

```bash
cd ~/Desktop/"Legislative Insight Engine"/repo
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/gcp-key.json"
npm run extract
git add src/data/states/ga/
git commit -m "Refresh GA data $(date +%Y-%m-%d)"
git push
```

Eventually this becomes a GitHub Action that runs weekly. For now, manual.
