# warden-audit

```yaml
name: Audit User Access
on: 
  workflow_dispatch:
    inputs:
      USER:
        description: 'GitHub user handle to audit'     
        required: true
jobs:
  audit:
    name: Audit User
    runs-on: ubuntu-latest
    steps:
      - name: Query User
        uses: lindluni/warden-audit@main
```
