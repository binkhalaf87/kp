# اختبارات مسابقة أفضل رسام (معزولة — لا تلمس الإنتاج)

## اختبارات API (`api.test.mjs`)
تحتاج PostgreSQL محليًا (يفضل مع TLS) ودورًا باسم `contest_app`، ثم تطبيق `contest/schema.sql`.

```bash
npm install
# مثال: قاعدة محلية على المنفذ 55432
DATABASE_URL=postgres://contest_app:x@127.0.0.1:55432/postgres \
SUPERUSER_URL=postgres://postgres@127.0.0.1:55432/postgres \
node tests/art-contest/api.test.mjs
```
⚠️ الاختبار يُفرغ جداول المسابقة (`truncate`). لا تشغله أبدًا على قاعدة الإنتاج.

## اختبارات الواجهة (`ui.test.cjs`, `admin-ui.test.cjs`)
تستخدم Playwright وChromium وواجهات API وهمية، ولا تتصل بأي خادم حقيقي.
```bash
node tests/art-contest/ui.test.cjs
node tests/art-contest/admin-ui.test.cjs
```
