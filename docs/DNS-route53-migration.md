# Moving 27markets.com DNS from Namecheap to Route 53

Written 2026-10-15. Execute top to bottom; every step has a check before the
next one.

## Why

Three concrete wins, in order of how much pain they save:

1. **ACM certificates validate and renew without anyone touching DNS.** The
   Let's Encrypt certificate on `api.27markets.com` expired on 2026-10-08 and
   took every login down until it was renewed by hand on 2026-10-14 — nothing
   had been scheduled to renew it. ACM + Route 53 removes that whole class of
   outage: validation records are created automatically and renewal needs no
   human.
2. **New hostnames become scriptable.** The four split-surface hosts
   (`preview`, `portal`, `partners`, `admin`) need six validation CNAMEs plus
   four host records. By hand that is ten records typed from a console; in
   Route 53 the validation half is one `--validation-method DNS` flag and a
   click.
3. **The registration stays at Namecheap.** This changes only which servers
   answer DNS queries. Renewal, ownership and billing are untouched.

Cost: $0.50/month per hosted zone, plus per-query charges that round to nothing
at this traffic.

## Current state (captured 2026-10-15)

Nameservers: `dns1.registrar-servers.com`, `dns2.registrar-servers.com`
(Namecheap BasicDNS).

| Type | Host | Value | Breaks if wrong |
|---|---|---|---|
| A (ALIAS) | `@` | → `18.238.109.112/.51/.67` (CloudFront `djgougz4a1f0u.cloudfront.net`) | Public site |
| CNAME | `www` | `djgougz4a1f0u.cloudfront.net` | Public site |
| A | `api` | `51.20.251.133` (EC2) | **Entire app — every login** |
| MX | `@` | `mx.zoho.com` (10), `mx2.zoho.com` (20), `mx3.zoho.com` (50) | **All email** |
| TXT | `@` | `v=spf1 include:zohomail.com ~all` | Email deliverability |
| CNAME | `nsxafr456rka5xsewmoyjjxshxh5rud3._domainkey` | `nsxafr456rka5xsewmoyjjxshxh5rud3.dkim.amazonses.com` | SES DKIM |
| CNAME | `iqmknzmm4iqr55gkqjrtff7d3ubywpbl._domainkey` | `iqmknzmm4iqr55gkqjrtff7d3ubywpbl.dkim.amazonses.com` | SES DKIM |
| CNAME | `6bpshlank4w7vujuejglozktnkdzwoo3._domainkey` | `6bpshlank4w7vujuejglozktnkdzwoo3.dkim.amazonses.com` | SES DKIM |

> **This table was built by querying DNS for records we already knew about.** It
> cannot show a record nobody remembered. Step 0 exists because of that.

The three DKIM records are for SES, which is **no longer used** — production
email goes through Zoho SMTP after SES production access was denied. Migrate
them anyway: they are harmless, and deciding what to drop is a separate task
from moving hosts safely.

## Step 0 — Enumerate the real record set

Open Namecheap → Domain List → `27markets.com` → **Advanced DNS**. Screenshot
or copy out **every** row, including any not in the table above.

Do not skip this. A forgotten record — a verification TXT, a subdomain for a
tool someone trialled — disappears silently at cutover and surfaces days later
as "X stopped working" with no obvious cause.

## Step 1 — Lower TTLs and wait

In Namecheap, set every record's TTL to **300 seconds** (5 min). Leave it for at
least as long as the previous TTL (Namecheap's default is 1800s, so **wait 30
minutes**).

This is what makes rollback fast. Skip it and a mistake at Step 5 is stuck in
resolver caches for up to 30 minutes with nothing you can do.

## Step 2 — Create the hosted zone

```bash
aws route53 create-hosted-zone \
  --name 27markets.com \
  --caller-reference "migrate-$(date +%s)" \
  --query "{Zone:HostedZone.Id,NS:DelegationSet.NameServers}" --output json
```

Record the zone ID (`/hostedzone/Z...`) and the four nameservers. **Nothing is
live yet** — the zone exists but no one is asking it anything.

## Step 3 — Recreate every record

Write `/tmp/records.json` from your Step 0 list. The apex is the one that
changes shape: Namecheap's ALIAS becomes a native Route 53 **A-record alias** to
CloudFront, which is better — no hardcoded edge IPs to go stale.

`Z2FDTNDATAQYW2` below is the fixed, global CloudFront hosted-zone ID. It is the
same for every AWS account; do not substitute your own.

```json
{
  "Changes": [
    { "Action": "UPSERT", "ResourceRecordSet": {
        "Name": "27markets.com", "Type": "A",
        "AliasTarget": { "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "djgougz4a1f0u.cloudfront.net", "EvaluateTargetHealth": false } } },
    { "Action": "UPSERT", "ResourceRecordSet": {
        "Name": "www.27markets.com", "Type": "CNAME", "TTL": 300,
        "ResourceRecords": [{ "Value": "djgougz4a1f0u.cloudfront.net" }] } },
    { "Action": "UPSERT", "ResourceRecordSet": {
        "Name": "api.27markets.com", "Type": "A", "TTL": 300,
        "ResourceRecords": [{ "Value": "51.20.251.133" }] } },
    { "Action": "UPSERT", "ResourceRecordSet": {
        "Name": "27markets.com", "Type": "MX", "TTL": 300,
        "ResourceRecords": [
          { "Value": "10 mx.zoho.com" },
          { "Value": "20 mx2.zoho.com" },
          { "Value": "50 mx3.zoho.com" } ] } },
    { "Action": "UPSERT", "ResourceRecordSet": {
        "Name": "27markets.com", "Type": "TXT", "TTL": 300,
        "ResourceRecords": [{ "Value": "\"v=spf1 include:zohomail.com ~all\"" }] } },
    { "Action": "UPSERT", "ResourceRecordSet": {
        "Name": "nsxafr456rka5xsewmoyjjxshxh5rud3._domainkey.27markets.com",
        "Type": "CNAME", "TTL": 300,
        "ResourceRecords": [{ "Value": "nsxafr456rka5xsewmoyjjxshxh5rud3.dkim.amazonses.com" }] } },
    { "Action": "UPSERT", "ResourceRecordSet": {
        "Name": "iqmknzmm4iqr55gkqjrtff7d3ubywpbl._domainkey.27markets.com",
        "Type": "CNAME", "TTL": 300,
        "ResourceRecords": [{ "Value": "iqmknzmm4iqr55gkqjrtff7d3ubywpbl.dkim.amazonses.com" }] } },
    { "Action": "UPSERT", "ResourceRecordSet": {
        "Name": "6bpshlank4w7vujuejglozktnkdzwoo3._domainkey.27markets.com",
        "Type": "CNAME", "TTL": 300,
        "ResourceRecords": [{ "Value": "6bpshlank4w7vujuejglozktnkdzwoo3.dkim.amazonses.com" }] } }
  ]
}
```

Add any extra rows Step 0 turned up, then apply:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> --change-batch file:///tmp/records.json
```

## Step 4 — Verify against Route 53 BEFORE switching

This is the step that makes the migration safe. Query the new nameservers
directly, while the world is still being served by Namecheap. Use one of the
four nameservers from Step 2:

```bash
NS=ns-123.awsdns-45.com   # one of yours from Step 2

for q in "27markets.com A" "www.27markets.com CNAME" "api.27markets.com A" \
         "27markets.com MX" "27markets.com TXT"; do
  echo "--- $q"; nslookup -type=${q#* } ${q%% *} $NS
done
```

Check each answer against the table above. In particular:

- `api.27markets.com` → `51.20.251.133`
- MX → all three Zoho hosts with the right preferences
- TXT → the SPF string, intact

**If anything is wrong, fix it now.** Nothing has been cut over; there is no
outage to race.

## Step 5 — Switch the nameservers

Namecheap → Domain List → `27markets.com` → **Nameservers** → *Custom DNS*.
Replace the two `registrar-servers.com` entries with the four from Step 2. Save.

Propagation is typically 10–60 minutes; the registry TTL is outside your
control, which is why Step 1 mattered.

## Step 6 — Verify from the outside

```bash
nslookup -type=NS 27markets.com          # expect the awsdns nameservers
curl -sS -o /dev/null -w "%{http_code}\n" https://27markets.com/
curl -sS -o /dev/null -w "%{http_code}\n" https://api.27markets.com/api/health
nslookup -type=MX 27markets.com
```

Then the check no script covers: **send a real email** to an
`@27markets.com` address and confirm it arrives, and have the app send one
(a password reset) and confirm that arrives too. MX records resolving is not
the same as mail being delivered.

Leave the old records in the Namecheap panel for a week. They are inert once the
nameservers change, and they are your written record of the previous state.

## Rollback

Set the nameservers at Namecheap back to `dns1.registrar-servers.com` and
`dns2.registrar-servers.com`. The old records are still there, so service
returns as caches expire — minutes, given Step 1. No data is lost; the Route 53
zone can stay for a retry.

## Step 7 — What this unlocks

The certificate for the split hosts, which was the immediate blocker:

```bash
aws acm request-certificate --region us-east-1 \
  --domain-name 27markets.com \
  --subject-alternative-names www.27markets.com preview.27markets.com \
    portal.27markets.com partners.27markets.com admin.27markets.com \
  --validation-method DNS
```

Then, in the ACM console, **Create records in Route 53** — one button, all six
validation records written for you. Status reaches `ISSUED` in a few minutes,
and renewal from then on is automatic and unattended.

Compare with the Namecheap path: six CNAMEs copied by hand, each an opportunity
to mistype a 60-character token.

## Afterwards: retire the hand-rolled certificate

`api.27markets.com` still runs Let's Encrypt via certbot on EC2, which is what
expired. Two options, in order of preference:

1. **Put the API behind CloudFront or an ALB with an ACM certificate.** TLS
   terminates on managed infrastructure and nothing on the box needs renewing.
2. **Keep certbot but actually schedule it.** `certbot-renew.timer` does not
   exist on that host — install a cron entry (see the deployment notes). This is
   still outstanding and the current certificate expires **2027-01-12**.

Until one of those is done, the January expiry is a scheduled outage.
