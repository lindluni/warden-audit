# warden-audit

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
```
