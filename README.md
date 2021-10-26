# warden-audit

Retrieves all of the repos, permissions, and orgs a user has access to on a GHES instance by impersonating the user

```yaml
name: Audit User Access
on:
  workflow_dispatch:
    inputs:
      ghes-user:
        description: 'GitHub user handle to audit'
        required: true
jobs:
  audit:
    name: Audit User
    runs-on: ubuntu-latest
    steps:
      - name: Query User
        uses: lindluni/warden-audit@main
        with:
          url: https://<ghes_url>/api/v3
          user: ${{ github.event.inputs.ghes-user }}
          token: ${{ secrets.SITE_ADMIN_TOKEN }}
      - name: Upload artifact
        uses: actions/upload-artifact@v2
        with:
          name: audit-log
          path: audit-log.json
```
