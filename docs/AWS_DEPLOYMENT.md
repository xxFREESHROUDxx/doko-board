# Deploying DokoBoard on AWS

Written to explain how AWS deployment *works*, using this app as the worked
example — not to be pasted in without reading.

> **Nothing here has been run against a real account.** Console layouts and
> pricing change; verify before you commit money. Everything below assumes the
> images from [`DOCKER.md`](./DOCKER.md).

**Read this after [`DEPLOY_FREE.md`](./DEPLOY_FREE.md).** Render and Vercel are
the right answer for this app today. AWS becomes the right answer when you need
something they cannot give you: a VPC, compliance boundaries, or the rest of the
AWS estate next door.

---

## The shift in thinking

Render takes a repo and gives you a URL. AWS gives you parts, and you assemble
them. Deploying anything means answering five questions that Render answered for
you:

| Question | Render | AWS |
|---|---|---|
| Where does the image live? | built for you | **ECR** — a registry you create |
| What runs it? | free web service | **App Runner** / **ECS Fargate** / **EC2** |
| Where does traffic enter? | included | **ALB**, or built into App Runner |
| Where is the database? | Neon, separate | **RDS** in a subnet you define |
| How does it get credentials? | env vars in a dashboard | **Secrets Manager** + an **IAM role** |

The last row is the real difference. On AWS, *identity* is how things get
permission — not passwords in config. A task assumes a role; that role is
allowed to read one secret. Nothing has an API key to steal.

---

## Choosing the compute

Three realistic options for this API.

### App Runner — start here

Give it an image, get an HTTPS URL. It manages load balancing, TLS, scaling and
health checks. Closest thing on AWS to what Render does.

- **Good:** almost no infrastructure to define; scales to zero on request
- **Bad:** less control; can be pricier than Fargate at steady load
- **Roughly:** ~$5–25/mo for something this size

### ECS on Fargate — the common production answer

Containers without managing servers, but you define the networking: VPC,
subnets, security groups, an Application Load Balancer.

- **Good:** full control, standard, integrates with everything
- **Bad:** far more to set up. The **ALB alone is ~$16/mo before any traffic**
- **Roughly:** ~$25–40/mo

### Lambda — tempting, and wrong here

A NestJS app can run on Lambda behind API Gateway. For this app it is a poor
fit: cold starts on a framework that boots a DI container, plus Prisma holding
database connections that Lambda's concurrency model fights. Lambda suits
event-driven work, not a long-lived HTTP API with a relational database.

### The frontend

Do **not** put it in a container. It is static files:

**S3 + CloudFront.** S3 stores them, CloudFront serves them from edge locations
with TLS. Cents per month.

The one setting that matters — the same SPA problem as everywhere else. In
CloudFront → Error pages, add a custom error response:

| Field | Value |
|---|---|
| HTTP error code | 403 *(and again for 404)* |
| Response page path | `/index.html` |
| HTTP response code | **200** |

Without it, refreshing `/projects/<id>` returns S3's 403. S3 answers 403 rather
than 404 for a missing key when the bucket is private, which is why both are
mapped.

**AWS Amplify Hosting** does all of this for you from a Git repo, SPA rewrite
included. It is the sensible choice unless you want the pieces.

---

## A concrete path: App Runner + RDS + Amplify

The smallest thing that is genuinely production-shaped.

### 1. Push the images to ECR

```bash
aws ecr create-repository --repository-name dokoboard-api

aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin <acct>.dkr.ecr.us-east-1.amazonaws.com

# --platform matters: an image built on Apple Silicon is arm64 and will not
# start on an x86 service. It fails at runtime, not at push.
docker build --platform linux/amd64 -t dokoboard-api ./api
docker tag dokoboard-api:latest <acct>.dkr.ecr.us-east-1.amazonaws.com/dokoboard-api:latest
docker push <acct>.dkr.ecr.us-east-1.amazonaws.com/dokoboard-api:latest
```

Tag with the git SHA rather than `latest` once this is real — `latest` makes
rollbacks guesswork.

### 2. Database (RDS)

Create a **PostgreSQL** instance, `db.t4g.micro`, in your default VPC. Turn
**off** public accessibility: only the API should reach it. Give it a security
group that allows 5432 **from the API's security group**, not from an IP range.

> A security group can reference another security group. That is the idiom —
> "whatever is running the API may reach the database", regardless of address.

### 3. Store the secrets properly

```bash
aws secretsmanager create-secret --name dokoboard/database-url \
  --secret-string 'postgresql://user:pass@...rds.amazonaws.com:5432/dokoboard'

aws secretsmanager create-secret --name dokoboard/jwt-secret \
  --secret-string "$(openssl rand -hex 64)"
```

Then grant the App Runner **instance role** `secretsmanager:GetSecretValue` on
those two ARNs and nothing else. The container receives the values as
environment variables without any credential ever being written down.

This is the habit worth taking away from AWS even if you never use it: the thing
that needs a secret proves *who it is*, and is handed the secret. It does not
carry a key around.

### 4. Migrations

The awkward part. The API image deliberately has no Prisma CLI, and App Runner
runs one long-lived process — there is no "release step".

Options, best first:

1. **A one-off ECS Fargate task** using the `build` stage image, running
   `npx prisma migrate deploy`, in the same VPC. Invoked from CI before the new
   version rolls out. This is the standard answer.
2. **From CI over a bastion or VPN**, if the database is not publicly reachable.
3. **On container start**, via an entrypoint. Simple, and it breaks the moment
   you run two instances — they race. Acceptable at one instance; a trap later.

### 5. Frontend on Amplify

Connect the repo, set **monorepo root** to `web`, add `VITE_API_URL` = the App
Runner URL, deploy. Amplify handles the SPA rewrite.

Remember the build-time substitution from [`DOCKER.md`](./DOCKER.md): changing
that variable requires a **redeploy**, not a restart.

### 6. CORS, again

Set `CORS_ORIGIN` on the App Runner service to the exact Amplify origin. Same
step, same failure mode, as on Render.

---

## What it costs

Very rough, small app, us-east-1:

| Piece | ~Monthly |
|---|---|
| App Runner (1 small instance) | $5–25 |
| RDS `db.t4g.micro` | ~$15 (free tier: 12 months) |
| Amplify / S3 + CloudFront | ~$1 |
| Secrets Manager (2 secrets) | ~$0.80 |
| **Total** | **~$25–45** |

Against ~$7/mo for Render Starter + Neon. **AWS is not the cheap option** — it
is the option you choose when you need what it offers.

The 12-month free tier makes year one nearly free, which is a fine way to learn.
Set a **billing alarm** on day one; the classic AWS story is a forgotten NAT
Gateway (~$32/mo, does nothing on its own) quietly billing for months.

---

## Things that will bite you

**NAT Gateway.** Put Fargate tasks in a private subnet and they cannot reach the
internet without one, at ~$32/mo plus data. For a task that only talks to RDS,
use **VPC endpoints** instead, or a public subnet with a tight security group.

**Security groups are stateful, NACLs are not.** Allow inbound on a security
group and the reply is allowed automatically. NACLs need both directions. Nearly
every "it just hangs" is one of these.

**ALB costs money while idle.** ~$16/mo before a single request. App Runner
bundles it, which is much of why it is simpler for one service.

**Image architecture.** Building on an M-series Mac gives you arm64. Deploy that
to an x86 service and it fails at *runtime* with an exec format error. Always
`--platform linux/amd64` unless the target is Graviton.

**RDS in a public subnet with "publicly accessible" on** is the most common way
a database ends up on the internet. It should be off.

---

## Terraform, eventually

Everything above through the console is fine to learn, and a bad way to live —
you cannot review it, diff it or recreate it. Once the shape is settled, write
it as Terraform or CDK: infrastructure in the repo, changed through pull
requests, same as code.

Not worth it while you are still deciding the shape.

---

## What to actually do

For DokoBoard as it stands: **stay on Render and Vercel.** The free tier's cold
start is the only real complaint, and $7/mo fixes it.

Go to AWS when there is a reason — a VPC requirement, a compliance boundary, or
services already there. "It is more professional" is not one; a well-run Render
deployment beats a badly-run AWS one every time.

If you want to learn it anyway, do it in this order:

1. Push an image to **ECR** and run it on **App Runner**. One afternoon, and it
   teaches registries, IAM roles and health checks.
2. Add **RDS** and reach it from the service. This teaches VPCs and security
   groups, which is where most of the real difficulty lives.
3. Move to **ECS Fargate + ALB**, and you will understand why App Runner exists.

---

## Related

- [`DOCKER.md`](./DOCKER.md) — the images this assumes
- [`DEPLOY_FREE.md`](./DEPLOY_FREE.md) — what to do instead, for now
