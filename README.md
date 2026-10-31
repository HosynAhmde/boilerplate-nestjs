# سامانه CRM گالری نقره پاشا

مونوریپوی pnpm با دو اپ:

| مسیر       | توضیح                                                                            |
| ---------- | -------------------------------------------------------------------------------- |
| `apps/api` | بک‌اند NestJS 12 (ESM) + TypeORM 1.x + PostgreSQL 16                             |
| `apps/web` | فرانت Next.js 16 + Mantine 9 (راست‌به‌چپ) + TanStack Query + React Hook Form/Zod |

## تکنولوژی‌ها و قراردادها

- **دیتابیس:** PostgreSQL 16. نام جدول و ستون `snake_case`، کلید اصلی `BIGINT GENERATED ALWAYS AS IDENTITY`، زمان `timestamptz` (همیشه UTC). تاریخ شمسی فقط در فرانت ساخته می‌شود (`date-fns-jalali`).
- **مبلغ و وزن:** مبلغ به تومان و وزن به میلی‌گرم، هر دو `BIGINT`. چون `pg` مقدار BIGINT را به‌صورت رشته برمی‌گرداند، شناسه‌ها و مبالغ در کد و JSON رشته‌اند تا دقت از دست نرود. نمایش با `formatToman` و `formatGrams` در `apps/web/src/lib/format.ts`.
- **ORM:** TypeORM برای CRUD و مایگریشن. دفتر کل، مانده‌ها و گزارش‌ها با SQL خام پارامتری (`manager.query(sql, [params])`). اسکیما فقط با مایگریشن تغییر می‌کند (`synchronize` خاموش است).
- **تراکنش:** نوشتن‌های چندسطری با `TransactionRunner` انجام می‌شود که `app.user_id` را برای تریگر لاگ تنظیم می‌کند.
- **صف:** Redis + BullMQ (فعلاً صف پیامک).
- **فایل:** لایه `StorageDriver` با دو حالت: `local` (دیسک سرور، پیش‌فرض) و `s3` (هر سرویس سازگار با S3، مثل ابرآروان). با `STORAGE_DRIVER` انتخاب می‌شود.
- **لاگ:** pino (`nestjs-pino`)؛ هدر Authorization و کوکی‌ها حذف می‌شوند.

## شروع سریع (توسعه)

پیش‌نیاز: Node 22، pnpm 10، Docker.

```bash
make setup     # .env می‌سازد، نصب، بالا آوردن postgres و redis، مایگریشن، ساخت مدیر اولیه
make dev       # API روی :4000 و وب روی :3000
```

بعد `http://localhost:3000` را باز کنید و با شماره `SEED_ADMIN_MOBILE` وارد شوید. در حالت توسعه کد OTP در لاگ API چاپ می‌شود (`DEV OTP for ...`).

مستندات API (Swagger) در حالت توسعه: `http://localhost:4000/api/docs`

## دستورها

`make help` همه را نشان می‌دهد. مهم‌ترین‌ها:

| دستور                                      | کار                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `make check`                               | فرمت، lint، typecheck، تست و build (جایگزین CI؛ قبل از هر push اجرا شود) |
| `make check-e2e`                           | همان به‌علاوه تست e2e روی دیتابیس واقعی                                  |
| `make migrate`                             | اجرای مایگریشن‌ها                                                        |
| `make migration-generate name=AddCustomer` | ساخت مایگریشن از تغییر entityها                                          |
| `make seed`                                | ساخت نقش «مدیر سیستم» با همه دسترسی‌ها و کاربر مدیر اولیه                |

## احراز هویت و دسترسی

- ورود فقط با OTP پیامکی: `POST /api/v1/auth/otp/request` و `POST /api/v1/auth/otp/verify`. کد به‌صورت HMAC در `otp_challenge` ذخیره می‌شود، حداکثر ۵ تلاش، و پس از ۵ خطا کاربر ۱۵ دقیقه قفل می‌شود. پاسخ درخواست کد برای شماره ناشناس و شناس یکسان است.
- توکن دسترسی JWT کوتاه‌مدت (پیش‌فرض ۱۵ دقیقه) در حافظه مرورگر؛ refresh token در کوکی httpOnly و هش آن در `auth_session`. هر refresh توکن را عوض می‌کند و استفاده دوباره از توکن قدیمی همه نشست‌های کاربر را باطل می‌کند.
- همه مسیرها به‌صورت پیش‌فرض نیاز به ورود دارند؛ مسیر عمومی با `@Public()`.
- دسترسی‌ها طبق طراحی دیتابیس: ماتریس نقش × بخش (`view/create/edit/delete/approve`) و عملیات حساس.

```ts
@RequireSection('ORDERS', 'create')
@RequireSpecial('INVOICE_VOID')
```

در فرانت: `const { can, hasSpecial } = useAuth()`.

## پایگاه داده

- مایگریشن‌ها در `apps/api/src/database/migrations`. مایگریشن دوم تریگرهای پایه را می‌سازد: `forbid_mutation()` برای جدول‌های فقط‌درج، `audit_log` با پارتیشن ماهانه و تریگر عمومی `audit_row()`، و داده مرجع بخش‌ها و عملیات حساس.
- برای جدول‌های کسب‌وکار جدید، تریگر لاگ را در مایگریشن اضافه کنید:
  `CREATE TRIGGER <table>_audit AFTER INSERT OR UPDATE OR DELETE ON <table> FOR EACH ROW EXECUTE FUNCTION audit_row();`
- پارتیشن ماه بعد `audit_log` را با `SELECT ensure_audit_partition((now() + interval '1 month')::date)` بسازید (بعداً به‌صورت job زمان‌بندی‌شده اضافه می‌شود).

## استقرار روی سرور

یک سرور لینوکسی (Ubuntu 24.04، حداقل ۲ هسته و ۴ گیگ رم) با Docker:

```bash
git clone <repo> /opt/pasha-crm && cd /opt/pasha-crm
cp .env.example .env    # NODE_ENV=production، DOMAIN، رمزها و کلیدهای تصادفی را پر کنید
./scripts/deploy.sh     # بکاپ، build، مایگریشن، راه‌اندازی، بررسی سلامت
docker compose --profile tools run --rm seed   # فقط بار اول
```

- Caddy جلوی وب است و برای `DOMAIN` گواهی HTTPS رایگان می‌گیرد. Postgres و Redis فقط از خود سرور در دسترس‌اند.
- در سرورهای داخل ایران، ایمیج‌ها و رجیستری npm را در `.env` به mirror داخلی تغییر دهید (`NODE_IMAGE`، `POSTGRES_IMAGE`، `NPM_REGISTRY` و ...).
- بکاپ شبانه با cron:
  `30 2 * * * cd /opt/pasha-crm && ./scripts/backup.sh >> backups/backup.log 2>&1`
  پوشه `backups/` را به یک فضای جدا هم کپی کنید. بازیابی: `./scripts/restore.sh backups/db-....dump`

## سلامت سرویس

- `GET /api/v1/health/live`: فقط زنده بودن پروسه
- `GET /api/v1/health`: دیتابیس، Redis و فضای فایل
- `GET /healthz` (وب): زنده بودن سرور Next.js
- `make health` روی سرور: نتیجه کامل بررسی سلامت API

## مدیریت خطا

- همه خطاهای API یک شکل دارند (فیلتر سراسری `AllExceptionsFilter`):
  ```json
  {
    "statusCode": 409,
    "code": "DUPLICATE",
    "message": "این رکورد قبلاً ثبت شده است",
    "details": { "constraint": "uq_app_user_mobile" },
    "requestId": "…",
    "path": "/api/v1/…",
    "timestamp": "…"
  }
  ```
- `message` همیشه فارسی و قابل نمایش به کاربر است. جزئیات داخلی (stack، SQL) فقط در لاگ ثبت می‌شود و به کاربر نمی‌رسد.
- خطاهای PostgreSQL به خطای مناسب تبدیل می‌شوند: تکراری ← 409، وابستگی ← 409، مقدار نامعتبر ← 400، تداخل هم‌زمان (deadlock) ← 409.
- برای خطای کسب‌وکار با کد ثابت: `throw new AppException('ORDER_LOCKED', 'این سفارش قفل شده است', HttpStatus.CONFLICT)`.
- هر درخواست یک `x-request-id` دارد (از Caddy تا وب و API یکی است). همان شناسه در پاسخ خطا، هدر و لاگ هست؛ کاربر آن را به‌عنوان «کد پیگیری» می‌بیند و با آن در Grafana خطا را پیدا می‌کنید.
- در فرانت: `ApiError` شامل `status`، `code` و `requestId` است. `app/error.tsx`، `global-error.tsx` و `not-found.tsx` صفحه خطای فارسی نشان می‌دهند.

## لاگ و مانیتورینگ

همه ابزارها متن‌باز و روی همان سرور اجرا می‌شوند (بدون سرویس پولی):

| ابزار                            | کار                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| Prometheus                       | جمع‌آوری متریک‌ها و ارزیابی هشدارها (`deploy/monitoring/prometheus/alerts.yml`)             |
| Grafana                          | داشبورد «Pasha CRM — نمای کلی» (خودکار ساخته می‌شود)                                        |
| Loki + Alloy                     | جمع‌آوری لاگ همه کانتینرها، قابل جستجو در Grafana، نگهداری ۱۴ روز                           |
| Alertmanager                     | ارسال هشدار (ایمیل، تلگرام یا webhook در `deploy/monitoring/alertmanager/alertmanager.yml`) |
| node / postgres / redis exporter | متریک سرور، دیتابیس و Redis                                                                 |

```bash
# در .env: GRAFANA_ADMIN_PASSWORD=<رمز قوی>
make monitoring-up
# از کامپیوتر خودتان (همه UIها فقط روی 127.0.0.1 سرور هستند):
ssh -L 3001:127.0.0.1:3001 -L 9090:127.0.0.1:9090 -L 9093:127.0.0.1:9093 user@server
# Grafana: http://localhost:3001
```

- API در `GET /metrics` متریک Prometheus می‌دهد: زمان و تعداد درخواست‌ها به تفکیک مسیر و وضعیت، صف‌های BullMQ، حافظه و event loop. این مسیر بیرون از `/api/v1` است و از اینترنت در دسترس نیست. با `METRICS_TOKEN` می‌توانید برایش رمز هم بگذارید.
- لاگ API در production به‌صورت JSON (pino) با `level`، `requestId`، `userId` و `ip` است. لاگ کانتینرها چرخشی است (حداکثر ۵×۲۰ مگابایت) تا دیسک پر نشود.
- هشدارهای آماده: API یا دیتابیس یا Redis قطع، نرخ خطای ۵xx بالای ۵٪، کندی، شکست کارهای صف پیامک، پر شدن دیسک، مصرف بالای CPU و رم.
- مانیتورینگ روی همان سرور وقتی خود سرور خاموش شود هشدار نمی‌دهد. پیشنهاد: یک Uptime Kuma (متن‌باز) روی سرور یا سیستم دیگری که `https://<DOMAIN>/healthz` را چک کند.
- استک مانیتورینگ حدود ۷۰۰ مگابایت رم مصرف می‌کند؛ روی سرور ۴ گیگ مشکلی ندارد.
