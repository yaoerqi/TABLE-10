# Supabase 连接步骤

## 1) 创建环境变量

在项目根目录新建 `.env.local`，内容参考 `.env.local.example`：

```env
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
```

这两个值在 Supabase 控制台 `Project Settings -> API` 可找到。

## 2) 执行数据库脚本

1. 打开 Supabase 控制台 -> SQL Editor  
2. 粘贴并执行 `supabase/schema.sql`

## 3) 创建 Storage Bucket（图片上传必须）

1. 进入 Supabase 控制台 -> Storage  
2. 新建 Bucket：`item-images`  
3. 建议设置为 **Public**（当前前端使用 `getPublicUrl`）

可选：在 SQL Editor 增加存储策略（允许登录用户上传，公开读）：

```sql
-- 允许公开读取图片
create policy "Public read item images"
on storage.objects
for select
to public
using (bucket_id = 'item-images');

-- 允许已登录用户上传自己的图片
create policy "Auth upload item images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'item-images');
```

## 4) 本地启动

```bash
npm install
npm run dev
```

访问：
- 首页：`http://localhost:3000`
- 发布页：`http://localhost:3000/publish`

## 5) 首次账号使用说明

- 在页面顶部用 `.edu` 邮箱注册/登录。
- 登录后组件会自动尝试创建 `users` 档案（`id = auth.uid()`）。
- 创建成功后即可读取和发布 `items`（受 RLS 保护）。
